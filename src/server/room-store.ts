import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {Pool,type PoolClient} from 'pg';
import type {Room} from '../lib/room-types';
import {resultSchema,saveFinishedResults} from './result-store';
import {membershipSchema} from './room-schema';
import {RoomAccessError} from './room-access';
type Data=Record<string,Room>;
const runtime=globalThis as typeof globalThis & {guepardStore?:{queue:Promise<unknown>;pool?:Pool;ready?:Promise<unknown>;resultReady?:Promise<unknown>;membershipReady?:Promise<unknown>;roomQueues?:Map<string,Promise<unknown>>}};
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
/** Applies what `fn` changed to the rows it was given (all rooms, or the single room of a room transaction), inside the open transaction. */
async function run<T>(client:PoolClient,rows:Rows,fn:(data:Data)=>T|Promise<T>,write:boolean){
 const data:Data=Object.fromEntries(rows.rows.map(r=>[r.id,r.data]));const before=new Map<string,string>(rows.rows.map(r=>[r.id,JSON.stringify(r.data)]));const previousMemberships=memberships(data);const result=await fn(data);
 if(write){const nextMemberships=memberships(data);for(const [key,member]of previousMemberships)if(nextMemberships.get(key)?.personId!==member.personId)await client.query('DELETE FROM guepard_room_memberships WHERE identity_key=$1',[key]);const archived=retired.get(data);if(archived?.length)await saveFinishedResults(client,archived);for(const id of before.keys())if(!(id in data))await client.query('DELETE FROM guepard_rooms WHERE id=$1',[id]);for(const [id,room]of Object.entries(data)){const json=JSON.stringify(room);if(before.get(id)!==json){await client.query('INSERT INTO guepard_rooms(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data',[id,json]);await saveFinishedResults(client,[room])}}for(const [key,member]of nextMemberships){if(previousMemberships.get(key)?.personId===member.personId)continue;const saved=await client.query('INSERT INTO guepard_room_memberships(identity_key,room_id,person_id) VALUES($1,$2,$3) ON CONFLICT(identity_key) DO UPDATE SET person_id=EXCLUDED.person_id WHERE guepard_room_memberships.room_id=EXCLUDED.room_id AND guepard_room_memberships.person_id=EXCLUDED.person_id RETURNING room_id',[key,member.roomId,member.personId]);if(!saved.rows.length)throw new RoomAccessError('Vous êtes déjà dans un autre salon.',409,'ROOM_MEMBERSHIP_CONFLICT')}}
 return result;
}
/**
 * Locking (PERF-02, PERF-03).
 * - `transaction` (all rooms): exclusive global advisory lock, reads and rewrites every room. Only for operations that really span rooms (creation, joining with the "already in another room" check, quick join, leaving the current room, guest adoption).
 * - `roomTransaction` (one room): shared global lock (so it only waits for a global operation, never for another room) then an exclusive lock on that room, and reads and writes that single row. Lock order is always global then room, and a global transaction takes no room lock, so there is no deadlock.
 * - Read-only calls (`write=false`) take no lock and open no transaction: a single SELECT is a consistent snapshot, and whatever `fn` changes in memory is discarded.
 */
async function execute<T>(fn:(data:Data)=>T|Promise<T>,write:boolean,roomId?:string):Promise<T>{
 if(process.env.DATABASE_URL){
  const pool=await prepare();
  if(!write)return fn(Object.fromEntries((roomId===undefined?await pool.query('SELECT id,data FROM guepard_rooms'):await pool.query('SELECT id,data FROM guepard_rooms WHERE id=$1',[roomId])).rows.map(r=>[r.id,r.data])));
  const client=await pool.connect();try{await client.query('BEGIN');
   if(roomId===undefined)await client.query('SELECT pg_advisory_xact_lock($1)',[globalLock]);
   else{await client.query('SELECT pg_advisory_xact_lock_shared($1)',[globalLock]);await client.query('SELECT pg_advisory_xact_lock($1,hashtext($2))',[roomLockNamespace,roomId])}
   const rows=roomId===undefined?await client.query('SELECT id,data FROM guepard_rooms'):await client.query('SELECT id,data FROM guepard_rooms WHERE id=$1',[roomId]);
   const result=await run(client,rows,fn,write);await client.query('COMMIT');return result}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }
 const dir=process.env.GUEPARD_DATA_DIR||join(process.cwd(),'.data');let data:Data={};try{data=JSON.parse(await readFile(join(dir,'rooms.json'),'utf8'))}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}const result=await fn(data);if(write){memberships(data);await mkdir(dir,{recursive:true});await writeFile(join(dir,'rooms.tmp'),JSON.stringify(data),{mode:0o600});await rename(join(dir,'rooms.tmp'),join(dir,'rooms.json'))}return result;
}
/** Multi-room transaction: serialised in the process and by the global advisory lock. */
export async function transaction<T>(fn:(data:Data)=>T|Promise<T>,write=true):Promise<T>{
 if(process.env.DATABASE_URL&&!write)return execute(fn,false);
 const run=()=>execute(fn,write);
 const result=state.queue.then(run,run);state.queue=result.catch(()=>{});return result;
}
/** Single-room transaction: `fn` only sees (and may only change) the room `id`. Rooms are serialised per room in the process; without a database it falls back to the global file queue. */
export async function roomTransaction<T>(id:string,fn:(data:Data)=>T|Promise<T>,write=true):Promise<T>{
 if(!process.env.DATABASE_URL)return transaction(fn,write);
 if(!write)return execute(fn,false,id);
 const run=()=>execute(fn,true,id),queue=roomQueues.get(id)??Promise.resolve();
 const result=queue.then(run,run),tail=result.catch(()=>{});roomQueues.set(id,tail);void tail.then(()=>{if(roomQueues.get(id)===tail)roomQueues.delete(id)});return result;
}
const roomQueues=(state.roomQueues??=new Map<string,Promise<unknown>>());
export function memberships(data:Data){
 const members=new Map<string,{roomId:string;personId:string}>();
 for(const room of Object.values(data))for(const person of room.people){
  if(person.kind==='bot'||!person.token||!person.identityKey)continue;
  if(members.has(person.identityKey))throw new RoomAccessError('Une identité ne peut être présente que dans un seul salon.',409,'ROOM_MEMBERSHIP_CONFLICT',members.get(person.identityKey)!.roomId);
  members.set(person.identityKey,{roomId:room.id,personId:person.id});
 }
 return members;
}
