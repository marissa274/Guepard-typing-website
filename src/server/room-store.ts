import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {Pool} from 'pg';
import type {Room} from '../lib/room-types';
import {resultSchema,saveFinishedResults} from './result-store';
import {membershipSchema} from './room-schema';
import {RoomAccessError} from './room-access';
type Data=Record<string,Room>;
const runtime=globalThis as typeof globalThis & {guepardStore?:{queue:Promise<unknown>;pool?:Pool;ready?:Promise<unknown>;resultReady?:Promise<unknown>;membershipReady?:Promise<unknown>}};
const state:NonNullable<typeof runtime.guepardStore>=runtime.guepardStore??={queue:Promise.resolve()};
export async function transaction<T>(fn:(data:Data)=>T|Promise<T>,write=true):Promise<T>{
 const execute=async()=>{
  if(process.env.DATABASE_URL){
   state.pool??=new Pool({connectionString:process.env.DATABASE_URL});
   state.ready??=state.pool.query('CREATE TABLE IF NOT EXISTS guepard_rooms (id TEXT PRIMARY KEY, data JSONB NOT NULL)');await state.ready;
   state.resultReady??=state.pool.query(resultSchema);await state.resultReady;
   state.membershipReady??=state.pool.query(membershipSchema);await state.membershipReady;
   const client=await state.pool.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(74120931)');const rows=await client.query('SELECT id,data FROM guepard_rooms');const data:Data=Object.fromEntries(rows.rows.map(r=>[r.id,r.data]));const before=new Map<string,string>(rows.rows.map(r=>[r.id,JSON.stringify(r.data)]));const previousMemberships=memberships(data);const result=await fn(data);if(write){const nextMemberships=memberships(data);for(const [key,member]of previousMemberships)if(nextMemberships.get(key)?.personId!==member.personId)await client.query('DELETE FROM guepard_room_memberships WHERE identity_key=$1',[key]);for(const id of before.keys())if(!(id in data))await client.query('DELETE FROM guepard_rooms WHERE id=$1',[id]);for(const [id,room]of Object.entries(data)){const json=JSON.stringify(room);if(before.get(id)!==json){await client.query('INSERT INTO guepard_rooms(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data',[id,json]);await saveFinishedResults(client,[room])}}for(const [key,member]of nextMemberships){if(previousMemberships.get(key)?.personId===member.personId)continue;const saved=await client.query('INSERT INTO guepard_room_memberships(identity_key,room_id,person_id) VALUES($1,$2,$3) ON CONFLICT(identity_key) DO UPDATE SET person_id=EXCLUDED.person_id WHERE guepard_room_memberships.room_id=EXCLUDED.room_id AND guepard_room_memberships.person_id=EXCLUDED.person_id RETURNING room_id',[key,member.roomId,member.personId]);if(!saved.rows.length)throw new RoomAccessError('Vous êtes déjà dans un autre salon.',409,'ROOM_MEMBERSHIP_CONFLICT')}}await client.query('COMMIT');return result}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }
  const dir=process.env.GUEPARD_DATA_DIR||join(process.cwd(),'.data');let data:Data={};try{data=JSON.parse(await readFile(join(dir,'rooms.json'),'utf8'))}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}const result=await fn(data);if(write){memberships(data);await mkdir(dir,{recursive:true});await writeFile(join(dir,'rooms.tmp'),JSON.stringify(data),{mode:0o600});await rename(join(dir,'rooms.tmp'),join(dir,'rooms.json'))}return result;
 };
 const result=state.queue.then(execute,execute);state.queue=result.catch(()=>{});return result;
}
export function memberships(data:Data){
 const members=new Map<string,{roomId:string;personId:string}>();
 for(const room of Object.values(data))for(const person of room.people){
  if(person.kind==='bot'||!person.token||!person.identityKey)continue;
  if(members.has(person.identityKey))throw new RoomAccessError('Une identité ne peut être présente que dans un seul salon.',409,'ROOM_MEMBERSHIP_CONFLICT',members.get(person.identityKey)!.roomId);
  members.set(person.identityKey,{roomId:room.id,personId:person.id});
 }
 return members;
}
