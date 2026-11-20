/**
 * @jest-environment node
 */
import {Pool} from 'pg';
import type {Room} from '../src/lib/room-types';
import {createRoom} from '../src/server/room-engine';

/**
 * PERF-02, PERF-03: locking of the PostgreSQL store, checked against a real database.
 * Set GUEPARD_TEST_DATABASE_URL (a dedicated test database); without it these tests are skipped.
 * Two copies of the store module stand for two server processes, so the advisory locks (not the in-process queues) are what is tested.
 */
type Store=typeof import('../src/server/room-store');
const url=process.env.GUEPARD_TEST_DATABASE_URL;
const suite=url?describe:describe.skip;
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const gate=()=>{let open=()=>{};const promise=new Promise<void>(resolve=>{open=resolve});return {promise,open}};
const ids:string[]=[],states:{pool?:Pool}[]=[];
let pool:Pool,a:Store,b:Store;
async function load():Promise<Store>{
 let store!:Store;
 delete (globalThis as {guepardStore?:unknown}).guepardStore;
 await jest.isolateModulesAsync(async()=>{store=await import('../src/server/room-store')});
 states.push((globalThis as unknown as {guepardStore:{pool?:Pool}}).guepardStore);return store;
}
function make(identityKey:string,name='Salle'){
 const {room}=createRoom({name,nickname:identityKey,animal:'cheetah',identityKey});
 ids.push(room.id);return room;
}
async function seed(store:Store,...rooms:Room[]){await store.transaction(data=>{for(const room of rooms)data[room.id]=room})}
const revisionOf=async(id:string)=>Number((await pool.query('SELECT data->>\'revision\' AS revision FROM guepard_rooms WHERE id=$1',[id])).rows[0].revision);

suite('PostgreSQL room store locking',()=>{
 beforeAll(async()=>{process.env.DATABASE_URL=url;pool=new Pool({connectionString:url});a=await load();b=await load()});
 afterAll(async()=>{if(ids.length)await pool.query('DELETE FROM guepard_rooms WHERE id=ANY($1)',[ids]);await pool.end();for(const state of states)await state.pool?.end();});

 test('two rooms updated in parallel do not block each other',async()=>{
  const first=make('user:par-a'),second=make('user:par-b');await seed(a,first,second);
  const held=gate(),entered=gate();
  const slow=a.roomTransaction(first.id,async data=>{entered.open();await held.promise;data[first.id].revision++});
  await entered.promise;
  const started=Date.now();
  await b.roomTransaction(second.id,data=>{data[second.id].revision++});
  expect(Date.now()-started).toBeLessThan(1000);
  held.open();await slow;
  expect(await revisionOf(first.id)).toBe(first.revision+1);expect(await revisionOf(second.id)).toBe(second.revision+1);
 });

 test('concurrent updates of the same room, even from two processes, lose no write',async()=>{
  const room=make('user:same');await seed(a,room);
  const bump=(store:Store)=>store.roomTransaction(room.id,async data=>{const current=data[room.id].revision;await sleep(2);data[room.id].revision=current+1});
  await Promise.all(Array.from({length:20},(_,i)=>bump(i%2?a:b)));
  expect(await revisionOf(room.id)).toBe(room.revision+20);
 });

 test('a global transaction and room transactions exclude each other without deadlock',async()=>{
  const rooms=[make('user:mix-1'),make('user:mix-2'),make('user:mix-3')];await seed(a,...rooms);
  const held=gate(),entered=gate();
  const global=a.transaction(async()=>{entered.open();await held.promise});
  await entered.promise;
  let done=false;const waiting=b.roomTransaction(rooms[0].id,data=>{data[rooms[0].id].revision++}).then(()=>{done=true});
  await sleep(200);expect(done).toBe(false);
  held.open();await global;await waiting;expect(done).toBe(true);
  const jobs:Promise<unknown>[]=[];
  for(let i=0;i<30;i++){const room=rooms[i%3],store=i%2?a:b;jobs.push(i%5===0?store.transaction(data=>{data[room.id].revision++}):store.roomTransaction(room.id,data=>{data[room.id].revision++}))}
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([Promise.all(jobs),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('deadlock suspected')),10_000)})])}finally{clearTimeout(timer)}
  expect(await revisionOf(rooms[0].id)+await revisionOf(rooms[1].id)+await revisionOf(rooms[2].id)).toBe(rooms.reduce((sum,room)=>sum+room.revision,0)+31);
 });

 test('the "already in another room" conflict still holds when two rooms are created concurrently',async()=>{
  const key='user:conflict-'+Date.now();
  const first=make(key,'Un'),second=make(key,'Deux');
  const results=await Promise.allSettled([a.transaction(data=>{data[first.id]=first}),b.transaction(data=>{data[second.id]=second})]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  const failure=results.find(r=>r.status==='rejected');
  expect(failure&&(failure as PromiseRejectedResult).reason).toMatchObject({status:409});
  const stored=await pool.query('SELECT room_id FROM guepard_room_memberships WHERE identity_key=$1',[key]);
  expect(stored.rows).toHaveLength(1);
 });

 test('a room transaction cannot take an identity that another room already holds',async()=>{
  const key='user:held-'+Date.now();
  const first=make(key,'Un'),other=make('user:other-'+Date.now(),'Deux');await seed(a,first,other);
  await expect(b.roomTransaction(other.id,data=>{data[other.id].people[0].identityKey=key})).rejects.toMatchObject({status:409});
 });

 test('writes to one room that arrive together are grouped into few commits, each keeps its own result, and a failing one does not affect the others',async()=>{
  const room=make('user:group');await seed(a,room);
  const before=Number((await pool.query('SELECT xmin::text::bigint AS x FROM guepard_rooms WHERE id=$1',[room.id])).rows[0].x);
  const jobs=Array.from({length:30},(_,i)=>a.roomTransaction(room.id,data=>{if(i===7){data[room.id].revision+=1000;throw new Error('refus '+i)}data[room.id].revision++;return i}).then(value=>({value}),error=>({error:(error as Error).message})));
  const outcomes=await Promise.all(jobs);
  expect(outcomes.filter(o=>'error' in o)).toEqual([{error:'refus 7'}]);
  expect(outcomes.filter(o=>'value' in o).map(o=>(o as {value:number}).value)).toEqual(Array.from({length:30},(_,i)=>i).filter(i=>i!==7));
  expect(await revisionOf(room.id)).toBe(room.revision+29);
  const writes=await pool.query('SELECT xmin::text::bigint AS x FROM guepard_rooms WHERE id=$1',[room.id]);
  expect(before).toBeGreaterThan(0);expect(Number(writes.rows[0].x)-before).toBeLessThan(10);
 });

 test('a race finished then reset inside one group of writes still has its results saved',async()=>{
  const room=make('user:finish-reset');await seed(a,room);
  const userId='00000000-0000-4000-8000-0000000000f1',startedAt=Date.now()-60_000;
  await pool.query('DELETE FROM guepard_results WHERE user_id=$1',[userId]);
  const held=gate(),entered=gate();
  const blocker=a.roomTransaction(room.id,async()=>{entered.open();await held.promise});
  await entered.promise;
  const finish=a.roomTransaction(room.id,data=>{const r=data[room.id];Object.assign(r.people[0],{kind:'demo',userId,progress:r.people[0].progress,finishedAt:startedAt+30_000,typed:40});Object.assign(r,{phase:'finished',startedAt,endedAt:startedAt+30_000,text:'abc'})});
  const reset=a.roomTransaction(room.id,data=>{Object.assign(data[room.id],{phase:'waiting',startedAt:undefined,endedAt:undefined})});
  held.open();await Promise.all([blocker,finish,reset]);
  expect((await pool.query('SELECT 1 FROM guepard_results WHERE user_id=$1 AND room_id=$2',[userId,room.id])).rowCount).toBe(1);
  await pool.query('DELETE FROM guepard_results WHERE user_id=$1',[userId]);
 });

 test('a lone failing room transaction leaves the room untouched',async()=>{
  const room=make('user:lone');await seed(a,room);
  await expect(a.roomTransaction(room.id,data=>{data[room.id].revision+=5;throw new Error('non')})).rejects.toThrow('non');
  expect(await revisionOf(room.id)).toBe(room.revision);
 });

 test('read-only calls take no lock and see only the requested room',async()=>{
  const first=make('user:ro-a'),second=make('user:ro-b');await seed(a,first,second);
  const held=gate(),entered=gate();
  const writer=a.roomTransaction(first.id,async()=>{entered.open();await held.promise});
  await entered.promise;
  expect(await b.roomTransaction(first.id,data=>Object.keys(data),false)).toEqual([first.id]);
  expect(await b.transaction(data=>Object.keys(data).includes(second.id),false)).toBe(true);
  held.open();await writer;
 });
});
