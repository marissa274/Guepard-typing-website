import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {Pool,type PoolClient} from 'pg';
import type {Room} from '../lib/room-types';
import {resultSchema,saveFinishedResults} from './result-store';
import {membershipSchema} from './room-schema';
import {RoomAccessError} from './room-access';
type Data=Record<string,Room>;
const runtime=globalThis as typeof globalThis & {guepardStore?:{queue:Promise<unknown>;pool?:Pool;ready?:Promise<unknown>;resultReady?:Promise<unknown>;membershipReady?:Promise<unknown>;roomLanes?:Map<string,{pending:Job[];running:boolean}>}};
const state:NonNullable<typeof runtime.guepardStore>=runtime.guepardStore??={queue:Promise.resolve()};
const retired=new WeakMap<Data,Room[]>();
/** Removes a room from the transaction while keeping its final state so finished human results are persisted in the same commit (RES-05, HIST-01). */
export function retireRoom(data:Data,room:Room){const rooms=retired.get(data)??[];rooms.push(JSON.parse(JSON.stringify(room)) as Room);retired.set(data,rooms);delete data[room.id]}
const globalLock=74120931,roomLockNamespace=74120933;
type Rows={rows:{id:string;data:Room}[]};
async function prepare(){
 state.pool??=new Pool({connectionString:process.env.DATABASE_URL});
 state.ready??=state.pool.query('CREATE TABLE IF NOT EXISTS guepard_rooms (id TEXT PRIMARY KEY, data JSONB NOT NULL)');await state.ready;
 state.resultReady??=state.pool.query(resultSchema);await state.resultReady;
 state.membershipReady??=state.pool.query(membershipSchema);await state.membershipReady;
 return state.pool;
}
type Job={fn:(data:Data)=>unknown;resolve:(value:unknown)=>void;reject:(error:unknown)=>void};
/** Applies what the jobs changed to the rows they were given (all rooms, or the single room of a room transaction), inside the open transaction. A failing job is undone on its own (the in-memory room goes back to its state before the job) and does not affect the others. */
async function run(client:PoolClient,rows:Rows,jobs:Job[]){
 const data:Data=Object.fromEntries(rows.rows.map(r=>[r.id,r.data]));const before=new Map<string,string>(rows.rows.map(r=>[r.id,JSON.stringify(r.data)]));const previousMemberships=memberships(data);
 const outcomes:{ok:boolean;value:unknown}[]=[];
 /* In a group, a later job (rematch, reset) may leave a finished race before the group is persisted: keep every finished state reached along the way so its results are still saved. */
 const finishedOnTheWay=new Map<string,Room>();
 for(const job of jobs){
  const backup=jobs.length>1?JSON.stringify(data):'',archivedCount=retired.get(data)?.length??0;
  try{outcomes.push({ok:true,value:await job.fn(data)});if(jobs.length>1)for(const room of Object.values(data))if(room.phase==='finished'&&room.startedAt)finishedOnTheWay.set(`${room.id}-${room.startedAt}`,JSON.parse(JSON.stringify(room)) as Room)}catch(e){
   outcomes.push({ok:false,value:e});
   if(jobs.length>1){for(const key of Object.keys(data))delete data[key];Object.assign(data,JSON.parse(backup) as Data);const archived=retired.get(data);if(archived)archived.length=archivedCount}
  }
 }
 /* A lone failing job leaves nothing to persist (same as a rolled back transaction); in a group the failing job was restored above. */
 if(!(jobs.length===1&&!outcomes[0].ok)){const nextMemberships=memberships(data);for(const [key,member]of previousMemberships)if(nextMemberships.get(key)?.personId!==member.personId)await client.query('DELETE FROM guepard_room_memberships WHERE identity_key=$1',[key]);const archived=retired.get(data);if(archived?.length)await saveFinishedResults(client,archived);if(finishedOnTheWay.size)await saveFinishedResults(client,[...finishedOnTheWay.values()]);for(const id of before.keys())if(!(id in data))await client.query('DELETE FROM guepard_rooms WHERE id=$1',[id]);for(const [id,room]of Object.entries(data)){const json=JSON.stringify(room);if(before.get(id)!==json){await client.query('INSERT INTO guepard_rooms(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data',[id,json]);await saveFinishedResults(client,[room])}}for(const [key,member]of nextMemberships){if(previousMemberships.get(key)?.personId===member.personId)continue;const saved=await client.query('INSERT INTO guepard_room_memberships(identity_key,room_id,person_id) VALUES($1,$2,$3) ON CONFLICT(identity_key) DO UPDATE SET person_id=EXCLUDED.person_id WHERE guepard_room_memberships.room_id=EXCLUDED.room_id AND guepard_room_memberships.person_id=EXCLUDED.person_id RETURNING room_id',[key,member.roomId,member.personId]);if(!saved.rows.length)throw new RoomAccessError('Vous êtes déjà dans un autre salon.',409,'ROOM_MEMBERSHIP_CONFLICT')}}
 return outcomes;
}
/**
 * Locking (PERF-02, PERF-03).
 * - `transaction` (all rooms): exclusive global advisory lock, reads and rewrites every room. Only for operations that really span rooms (creation, joining with the "already in another room" check, quick join, leaving the current room, guest adoption).
 * - `roomTransaction` (one room): shared global lock (so it only waits for a global operation, never for another room) then an exclusive lock on that room, and reads and writes that single row. Lock order is always global then room, and a global transaction takes no room lock, so there is no deadlock.
 * - Read-only calls (`write=false`) take no lock and open no transaction: a single SELECT is a consistent snapshot, and whatever `fn` changes in memory is discarded.
 */
async function executeJobs(jobs:Job[],write:boolean,roomId?:string):Promise<{ok:boolean;value:unknown}[]>{
 const pool=await prepare();
 const read=()=>roomId===undefined?pool.query('SELECT id,data FROM guepard_rooms'):pool.query('SELECT id,data FROM guepard_rooms WHERE id=$1',[roomId]);
 if(!write){
  const rows=await read();
  return Promise.all(jobs.map(async job=>{const data:Data=Object.fromEntries(rows.rows.map(r=>[r.id,r.data]));try{return {ok:true,value:await job.fn(data)}}catch(e){return {ok:false,value:e}}}));
 }
 const client=await pool.connect();try{await client.query('BEGIN');
  if(roomId===undefined)await client.query('SELECT pg_advisory_xact_lock($1)',[globalLock]);
  else{await client.query('SELECT pg_advisory_xact_lock_shared($1)',[globalLock]);await client.query('SELECT pg_advisory_xact_lock($1,hashtext($2))',[roomLockNamespace,roomId])}
  const outcomes=await run(client,await (roomId===undefined?client.query('SELECT id,data FROM guepard_rooms'):client.query('SELECT id,data FROM guepard_rooms WHERE id=$1',[roomId])),jobs);await client.query('COMMIT');return outcomes}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
async function executeFile<T>(fn:(data:Data)=>T|Promise<T>,write:boolean):Promise<T>{
 const dir=process.env.GUEPARD_DATA_DIR||join(process.cwd(),'.data');let data:Data={};try{data=JSON.parse(await readFile(join(dir,'rooms.json'),'utf8'))}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}const result=await fn(data);if(write){memberships(data);await mkdir(dir,{recursive:true});await writeFile(join(dir,'rooms.tmp'),JSON.stringify(data),{mode:0o600});await rename(join(dir,'rooms.tmp'),join(dir,'rooms.json'))}return result;
}
async function single<T>(fn:(data:Data)=>T|Promise<T>,write:boolean,roomId?:string):Promise<T>{
 const [outcome]=await executeJobs([{fn,resolve:()=>{},reject:()=>{}}],write,roomId);
 if(!outcome.ok)throw outcome.value;return outcome.value as T;
}
/** Multi-room transaction: serialised in the process and by the global advisory lock. */
export async function transaction<T>(fn:(data:Data)=>T|Promise<T>,write=true):Promise<T>{
 if(!process.env.DATABASE_URL)return queued(()=>executeFile(fn,write));
 if(!write)return single(fn,false);
 return queued(()=>single(fn,true));
}
function queued<T>(task:()=>Promise<T>):Promise<T>{const result=state.queue.then(task,task);state.queue=result.catch(()=>{});return result}
/**
 * Single-room transaction: `fn` only sees (and may only change) the room `id`. Without a database it falls back to the global file queue.
 * Writes to the same room that arrive while a transaction is running are grouped into the next one (one read, one write, one commit for the whole group): rewriting a large room row is the cost that bounds a busy race, and a group pays it once. Each call still gets its own result or its own error; a call that fails is undone without affecting the others, and if the group cannot be committed its calls are replayed one by one.
 */
export async function roomTransaction<T>(id:string,fn:(data:Data)=>T|Promise<T>,write=true):Promise<T>{
 if(!process.env.DATABASE_URL)return transaction(fn,write);
 if(!write)return single(fn,false,id);
 return new Promise<T>((resolve,reject)=>{
  const lane=roomLanes.get(id)??{pending:[],running:false};roomLanes.set(id,lane);
  lane.pending.push({fn,resolve:resolve as (value:unknown)=>void,reject});
  if(!lane.running){lane.running=true;void drain(id,lane)}
 });
}
async function drain(id:string,lane:Lane){
 try{
  while(lane.pending.length){
   const jobs=lane.pending.splice(0);
   try{const outcomes=await executeJobs(jobs,true,id);jobs.forEach((job,i)=>outcomes[i].ok?job.resolve(outcomes[i].value):job.reject(outcomes[i].value))}
   catch(error){
    if(jobs.length===1){jobs[0].reject(error);continue}
    for(const job of jobs){try{const [outcome]=await executeJobs([job],true,id);if(outcome.ok)job.resolve(outcome.value);else job.reject(outcome.value)}catch(e){job.reject(e)}}
   }
  }
 }finally{lane.running=false;if(!lane.pending.length)roomLanes.delete(id)}
}
type Lane={pending:Job[];running:boolean};
const roomLanes=(state.roomLanes??=new Map<string,Lane>());
export function memberships(data:Data){
 const members=new Map<string,{roomId:string;personId:string}>();
 for(const room of Object.values(data))for(const person of room.people){
  if(person.kind==='bot'||!person.token||!person.identityKey)continue;
  if(members.has(person.identityKey))throw new RoomAccessError('Une identité ne peut être présente que dans un seul salon.',409,'ROOM_MEMBERSHIP_CONFLICT',members.get(person.identityKey)!.roomId);
  members.set(person.identityKey,{roomId:room.id,personId:person.id});
 }
 return members;
}
