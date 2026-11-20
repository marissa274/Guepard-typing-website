import {afterEach,beforeEach,expect,jest,test} from '@jest/globals';
import {create,get,listRooms,mutate,quickJoin} from '../src/server/room-service';
import {collectFinishedResults} from '../src/server/result-store';
import type {Room,RoomView} from '../src/lib/room-types';

type Data=Record<string,Room>;
interface Store {data:Data;writes:number;retired:Room[]}
const mockStore:Store={data:{},writes:0,retired:[]};
jest.mock('../src/server/room-store',()=>({
 transaction:async<T,>(fn:(data:Record<string,Room>)=>T|Promise<T>,write=true):Promise<T>=>{
  const copy=JSON.parse(JSON.stringify(mockStore.data)) as Record<string,Room>;
  const result=await fn(copy);
  if(write){mockStore.data=copy;mockStore.writes++}
  return result;
 },
 roomTransaction:async<T,>(id:string,fn:(data:Record<string,Room>)=>T|Promise<T>,write=true):Promise<T>=>{
  const copy=JSON.parse(JSON.stringify(id in mockStore.data?{[id]:mockStore.data[id]}:{})) as Record<string,Room>;
  const result=await fn(copy);
  if(write){const next={...mockStore.data};delete next[id];mockStore.data={...next,...copy};mockStore.writes++}
  return result;
 },
 retireRoom:(data:Record<string,Room>,room:Room)=>{mockStore.retired.push(JSON.parse(JSON.stringify(room)) as Room);delete data[room.id]}
}));
jest.mock('pg',()=>({Pool:class {}}));
jest.mock('../src/server/code-rate-limit',()=>({consumeCodeAttempt:async()=>undefined}));
jest.mock('../src/server/text-corpus',()=>({prepareConfiguredText:async()=>'La jungle ouvre ses pistes.'}));

const account=(id:string)=>({nickname:id,kind:'demo',userId:id,identityKey:'user:'+id,ipHash:'ip-'+id,avatar:'cheetah',name:'Ma course',animal:'cheetah',visibility:'public'});
const guest=(id:string,ip='ip-'+id)=>({nickname:id,kind:'guest',identityKey:'guest:'+id,ipHash:ip,avatar:'cheetah'});
function room(id:string){const value=mockStore.data[id];if(!value)throw new Error('room missing');return value}
function member(id:string,personId:string){const value=room(id).people.find(person=>person.id===personId);if(!value)throw new Error('person missing');return value}

interface Reply {room:RoomView;token:string;invitation?:{token:string}}
/** The service returns a union per action; these tests only use replies carrying a room. */
async function call(id:string,token:string,body:Record<string,unknown>):Promise<Reply>{return await mutate(id,token,body) as unknown as Reply}
async function open(body:Record<string,unknown>):Promise<Reply>{const reply=await create(body);if(!reply.token)throw new Error('no token');return {room:reply.room,token:reply.token}}

let now=10_000_000;
let clock:{mockRestore:()=>void};
beforeEach(()=>{mockStore.data={};mockStore.writes=0;mockStore.retired=[];now=10_000_000;clock=jest.spyOn(Date,'now').mockImplementation(()=>now)});
afterEach(()=>clock.mockRestore());

test('C1-B1: a present member reconnects with an expired or deleted invitation',async()=>{
 const created=await open({...account('host'),visibility:'private'});
 const invite=await call(created.room.id,created.token,{action:'invite'});
 const token=invite.invitation?.token;if(!token)throw new Error('no invitation');
 const joined=await call(created.room.id,'',{...guest('ami'),action:'join',invite:token});
 now+=31*60*1000;
 for(const person of room(created.room.id).people)person.seen=now;
 const again=await call(created.room.id,'',{...guest('ami'),action:'join',invite:token});
 expect(again.token).toBe(joined.token);
 room(created.room.id).invites=[];
 const third=await call(created.room.id,'',{...guest('ami'),action:'join',invite:token});
 expect(third.token).toBe(joined.token);
});

test('C1-B1: the bound recipient may reuse an old used link to come back, a stranger may not',async()=>{
 const created=await open({...account('host'),visibility:'private'});
 const token=(await call(created.room.id,created.token,{action:'invite'})).invitation?.token;if(!token)throw new Error('no invitation');
 const joined=await call(created.room.id,'',{...guest('ami'),action:'join',invite:token});
 await call(created.room.id,joined.token,{action:'leave'});
 now+=31*60*1000;member(created.room.id,created.room.me).seen=now;
 await expect(call(created.room.id,'',{...guest('ami'),action:'join',invite:token})).resolves.toMatchObject({room:{id:created.room.id}});
 await expect(call(created.room.id,'',{...guest('autre'),action:'join',invite:token})).rejects.toMatchObject({status:403});
});

test('C1-B2: a kicked guest cannot return with a fresh guest identity from the same IP',async()=>{
 const created=await open(account('host'));
 const joined=await call(created.room.id,'',{...guest('intrus','ip-shared'),action:'join'});
 expect(joined.room.id).toBe(created.room.id);
 await call(created.room.id,created.token,{action:'kick',personId:joined.room.me});
 expect(room(created.room.id).bannedIpHashes).toEqual([{hash:'ip-shared',until:now+10*60*1000}]);
 await expect(call(created.room.id,'',{...guest('nouveau-cookie','ip-shared'),action:'join'})).rejects.toMatchObject({status:403});
 await expect(call(created.room.id,'',{...account('voisin'),ipHash:'ip-shared',action:'join'})).resolves.toMatchObject({room:{id:created.room.id}});
 await expect(call(created.room.id,'',{...guest('ailleurs','ip-other'),action:'join'})).resolves.toMatchObject({room:{id:created.room.id}});
});

test('C2-B1: kicking a guest never refuses the other guests already present behind the same IP',async()=>{
 const created=await open(account('host'));
 const classmate=await call(created.room.id,'',{...guest('camarade','ip-shared'),action:'join'});
 const intruder=await call(created.room.id,'',{...guest('intrus','ip-shared'),action:'join'});
 await call(created.room.id,created.token,{action:'kick',personId:intruder.room.me});
 const again=await call(created.room.id,'',{...guest('camarade','ip-shared'),action:'join'});
 expect(again.token).toBe(classmate.token);
 await expect(quickJoin(guest('camarade','ip-shared'))).resolves.toMatchObject({room:{id:created.room.id},token:classmate.token});
 await expect(call(created.room.id,'',{...guest('intrus','ip-shared'),action:'join'})).rejects.toMatchObject({status:403});
});

test('C2-B1: the IP ban only holds new guest identities for ten minutes; the kicked identity stays banned',async()=>{
 const created=await open(account('host'));
 const intruder=await call(created.room.id,'',{...guest('intrus','ip-shared'),action:'join'});
 await call(created.room.id,created.token,{action:'kick',personId:intruder.room.me});
 await expect(call(created.room.id,'',{...guest('nouveau','ip-shared'),action:'join'})).rejects.toMatchObject({status:403});
 await expect(quickJoin(guest('nouveau','ip-shared'))).rejects.toMatchObject({status:404});
 now+=10*60*1000+1;member(created.room.id,created.room.me).seen=now;
 await expect(quickJoin(guest('nouveau','ip-shared'))).resolves.toMatchObject({room:{id:created.room.id}});
 await expect(call(created.room.id,'',{...guest('intrus','ip-shared'),action:'join'})).rejects.toMatchObject({status:403});
});

test('C1-B3: a host unseen for more than 30 seconds hands over to the oldest connected human',async()=>{
 const created=await open(account('host'));
 const first=await call(created.room.id,'',{...guest('premier'),action:'join'});
 now+=1000;
 const second=await call(created.room.id,'',{...account('second'),action:'join'});
 now+=20_000;
 await get(created.room.id,second.token);
 expect(room(created.room.id).hostId).toBe(created.room.me);
 now+=4000;await get(created.room.id,first.token);
 now+=12_000;
 const view=await get(created.room.id,second.token);
 expect(view.hostId).toBe(first.room.me);
 expect(room(created.room.id).hostId).toBe(first.room.me);
});

test('C1-B3: a host reloading within the grace period keeps the role',async()=>{
 const created=await open(account('host'));
 const joined=await call(created.room.id,'',{...guest('ami'),action:'join'});
 now+=25_000;
 await get(created.room.id,joined.token);
 expect(room(created.room.id).hostId).toBe(created.room.me);
});

test('C1-B3: the room closes when the absent host leaves nobody connected',async()=>{
 const created=await open(account('host'));
 now+=36_000;
 expect((await listRooms()).map(entry=>entry.id)).not.toContain(created.room.id);
 await open(account('autre'));
 expect(mockStore.data[created.room.id]).toBeUndefined();
});

test('C1-B14: polling an unchanged room neither writes nor bumps the revision',async()=>{
 const created=await open(account('host'));
 const joined=await call(created.room.id,'',{...guest('ami'),action:'join'});
 const writes=mockStore.writes,revision=room(created.room.id).revision;
 for(let n=0;n<5;n++){now+=600;await get(created.room.id,joined.token)}
 expect(mockStore.writes).toBe(writes);
 expect(room(created.room.id).revision).toBe(revision);
 await call(created.room.id,created.token,{action:'start'});
 now=room(created.room.id).startedAt!+100;
 await get(created.room.id,joined.token);
 const running=room(created.room.id).revision,runningWrites=mockStore.writes;
 const view=await get(created.room.id,joined.token);
 expect(view.revision).toBe(running);
 expect(room(created.room.id).revision).toBe(running);
 expect(mockStore.writes).toBe(runningWrites);
});

test('C1-B14: presence is still persisted every few seconds without a new revision',async()=>{
 const created=await open(account('host'));
 const joined=await call(created.room.id,'',{...guest('ami'),action:'join'});
 const revision=room(created.room.id).revision;
 now+=6000;await get(created.room.id,joined.token);
 expect(member(created.room.id,joined.room.me).seen).toBe(now);
 expect(room(created.room.id).revision).toBe(revision);
});

test('C1-B17: closing a running room keeps the result of a human who already finished',async()=>{
 const created=await open(account('host'));
 const joined=await call(created.room.id,'',{...account('rapide'),action:'join'});
 await call(created.room.id,'',{...guest('lent'),action:'join'});
 await call(created.room.id,created.token,{action:'start'});
 const started=room(created.room.id).startedAt!;
 now=started+20_000;
 await call(created.room.id,joined.token,{action:'progress',value:'La jungle ouvre ses pistes.',typed:27});
 expect(member(created.room.id,joined.room.me).finishedAt).toBe(now);
 now+=1000;
 await call(created.room.id,created.token,{action:'close'});
 expect(mockStore.data[created.room.id]).toBeUndefined();
 expect(mockStore.retired).toHaveLength(1);
 const saved=collectFinishedResults(mockStore.retired);
 expect(saved.map(entry=>entry.userId)).toEqual(['rapide']);
 expect(saved[0].result).toMatchObject({rank:1,abandoned:false});
});

test('C1-B17: a host leaving a running room alone still persists finished humans',async()=>{
 const created=await open(account('host'));
 const joined=await call(created.room.id,'',{...account('rapide'),action:'join'});
 await call(created.room.id,created.token,{action:'start'});
 now=room(created.room.id).startedAt!+20_000;
 await call(created.room.id,joined.token,{action:'progress',value:'La jungle ouvre ses pistes.',typed:27});
 await call(created.room.id,joined.token,{action:'leave'});
 await call(created.room.id,created.token,{action:'leave'});
 expect(mockStore.data[created.room.id]).toBeUndefined();
 expect(collectFinishedResults(mockStore.retired).map(entry=>entry.userId)).toContain('rapide');
});
