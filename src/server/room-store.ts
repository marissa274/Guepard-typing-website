import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {Pool} from 'pg';
import type {Room} from '../lib/room-types';
type Data=Record<string,Room>;
const runtime=globalThis as typeof globalThis & {guepardStore?:{queue:Promise<unknown>;pool?:Pool;ready?:Promise<unknown>}};
const state=runtime.guepardStore??={queue:Promise.resolve()};
export async function transaction<T>(fn:(data:Data)=>T,write=true):Promise<T>{
 const execute=async()=>{
  if(process.env.DATABASE_URL){
   state.pool??=new Pool({connectionString:process.env.DATABASE_URL});
   state.ready??=state.pool.query('CREATE TABLE IF NOT EXISTS guepard_rooms (id TEXT PRIMARY KEY, data JSONB NOT NULL)');await state.ready;
   const client=await state.pool.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(74120931)');const rows=await client.query('SELECT id,data FROM guepard_rooms');const data:Data=Object.fromEntries(rows.rows.map(r=>[r.id,r.data]));const before=new Map<string,string>(rows.rows.map(r=>[r.id,JSON.stringify(r.data)]));const result=fn(data);if(write){for(const id of before.keys())if(!(id in data))await client.query('DELETE FROM guepard_rooms WHERE id=$1',[id]);for(const [id,room]of Object.entries(data)){const json=JSON.stringify(room);if(before.get(id)!==json)await client.query('INSERT INTO guepard_rooms(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data',[id,json])}}await client.query('COMMIT');return result}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }
  const dir=process.env.GUEPARD_DATA_DIR||join(process.cwd(),'.data');let data:Data={};try{data=JSON.parse(await readFile(join(dir,'rooms.json'),'utf8'))}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}const result=fn(data);if(write){await mkdir(dir,{recursive:true});await writeFile(join(dir,'rooms.tmp'),JSON.stringify(data),{mode:0o600});await rename(join(dir,'rooms.tmp'),join(dir,'rooms.json'))}return result;
 };
 const result=state.queue.then(execute,execute);state.queue=result.catch(()=>{});return result;
}
