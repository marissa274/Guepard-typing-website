import {Pool} from 'pg';
import {RoomAccessError} from './room-access';
const runtime=globalThis as typeof globalThis & {guepardCodeLimit?:{pool?:Pool;ready?:Promise<unknown>;local:Map<string,{start:number;attempts:number}>}};
const state:NonNullable<typeof runtime.guepardCodeLimit>=runtime.guepardCodeLimit??={local:new Map()};
export async function consumeCodeAttempt(ipHash:string){
 const now=Date.now();let attempts:number;
 if(process.env.DATABASE_URL){
  state.pool??=new Pool({connectionString:process.env.DATABASE_URL,max:2});
  state.ready??=state.pool.query('CREATE TABLE IF NOT EXISTS guepard_code_attempts(ip_hash TEXT PRIMARY KEY,window_started BIGINT NOT NULL,attempts INTEGER NOT NULL CHECK(attempts>=0))');await state.ready;
  const result=await state.pool.query(`INSERT INTO guepard_code_attempts(ip_hash,window_started,attempts) VALUES($1,$2,1)
   ON CONFLICT(ip_hash) DO UPDATE SET window_started=CASE WHEN guepard_code_attempts.window_started <= $2-60000 THEN $2 ELSE guepard_code_attempts.window_started END,
   attempts=CASE WHEN guepard_code_attempts.window_started <= $2-60000 THEN 1 ELSE guepard_code_attempts.attempts+1 END RETURNING attempts`,[ipHash,now]);
  attempts=Number(result.rows[0].attempts);
 }else{
  for(const [key,value]of state.local)if(now-value.start>=60000)state.local.delete(key);
  const bucket=state.local.get(ipHash)||{start:now,attempts:0};bucket.attempts++;state.local.set(ipHash,bucket);attempts=bucket.attempts;
 }
 if(attempts>10)throw new RoomAccessError('Trop de tentatives. Réessayez dans une minute.',429,'CODE_RATE_LIMITED');
}
