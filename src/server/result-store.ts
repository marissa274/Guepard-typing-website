import {Pool,type PoolClient} from 'pg';
import type {Room,RoomView} from '../lib/room-types';
import type {ResultPage,StoredRaceResult} from '../lib/result-types';
import {raceResults} from '../lib/race-results';

export const resultSchema=`CREATE TABLE IF NOT EXISTS guepard_results (
 id TEXT PRIMARY KEY, user_id UUID NOT NULL, room_id TEXT NOT NULL, started_at BIGINT NOT NULL,
 ended_at BIGINT NOT NULL, result JSONB NOT NULL, snapshot JSONB NOT NULL,
 UNIQUE(user_id,room_id,started_at)
); CREATE INDEX IF NOT EXISTS guepard_results_user_date ON guepard_results(user_id,ended_at DESC);`;
const runtime=globalThis as typeof globalThis & {guepardResults?:{pool:Pool;ready:Promise<unknown>}};

function database(){
 if(!process.env.DATABASE_URL)throw new Error('La base de données est indisponible.');
 if(!runtime.guepardResults){const pool=new Pool({connectionString:process.env.DATABASE_URL,max:4});runtime.guepardResults={pool,ready:pool.query(resultSchema)}}
 return runtime.guepardResults;
}

function privateSnapshot(room:Room,me:string):RoomView{
 const {invites,...rest}=room;
 return {...rest,code:'',people:room.people.map(({token,userId,input,...person})=>person),me,isHost:false,players:room.people.filter(p=>p.role==='player').length,serverNow:room.endedAt!};
}

export function collectFinishedResults(rooms:Room[]){
 return rooms.filter(room=>room.phase==='finished'&&room.startedAt&&room.endedAt).flatMap(room=>{
  const view=privateSnapshot(room,'');
  return raceResults(view).filter(row=>row.person.kind==='demo'&&room.people.find(p=>p.id===row.person.id)?.userId).map(row=>{
   const userId=room.people.find(p=>p.id===row.person.id)!.userId!;
   const result:StoredRaceResult={id:`${room.id}-${room.startedAt}-${row.person.id}`,date:room.endedAt!,roomName:room.name,speed:row.speed,accuracy:row.accuracy,rank:row.rank,won:row.rank===1&&!row.person.abandoned,abandoned:row.person.abandoned,score:row.score};
   return {userId,result,room:privateSnapshot(room,row.person.id)};
  });
 });
}

/** Called inside the same PostgreSQL transaction as the final room state. */
export async function saveFinishedResults(client:Pick<PoolClient,'query'>,rooms:Room[]){
 for(const entry of collectFinishedResults(rooms))await client.query('INSERT INTO guepard_results(id,user_id,room_id,started_at,ended_at,result,snapshot) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id,room_id,started_at) DO NOTHING',[entry.result.id,entry.userId,entry.room.id,entry.room.startedAt,entry.result.date,JSON.stringify(entry.result),JSON.stringify(entry.room)]);
}

export async function listResults(userId:string,page=1,pageSize=10):Promise<ResultPage>{
 const {pool,ready}=database();await ready;
 const [rows,aggregate,points]=await Promise.all([
  pool.query('SELECT result FROM guepard_results WHERE user_id=$1 ORDER BY ended_at DESC,id DESC LIMIT $2 OFFSET $3',[userId,pageSize,(page-1)*pageSize]),
  pool.query(`SELECT COUNT(*)::int AS races,COUNT(*) FILTER(WHERE (result->>'won')::boolean)::int AS wins,COALESCE(MAX((result->>'speed')::numeric),0) AS best_speed,COALESCE(AVG((result->>'speed')::numeric),0) AS average_speed,AVG((result->>'accuracy')::numeric) AS average_accuracy FROM guepard_results WHERE user_id=$1`,[userId]),
  pool.query("SELECT ended_at AS date,(result->>'speed')::numeric AS speed FROM (SELECT ended_at,result FROM guepard_results WHERE user_id=$1 ORDER BY ended_at DESC LIMIT 100) recent ORDER BY ended_at",[userId])
 ]);
 const summary=aggregate.rows[0];
 return {results:rows.rows.map(row=>row.result),total:Number(summary.races),page,pageSize,summary:{races:Number(summary.races),wins:Number(summary.wins),bestSpeed:Number(summary.best_speed),averageSpeed:Math.round(Number(summary.average_speed)),averageAccuracy:summary.average_accuracy===null?null:Math.round(Number(summary.average_accuracy))},progression:points.rows.map(row=>({date:Number(row.date),speed:Number(row.speed)}))};
}

export async function getResult(userId:string,id:string):Promise<RoomView|null>{
 const {pool,ready}=database();await ready;
 const result=await pool.query('SELECT snapshot FROM guepard_results WHERE user_id=$1 AND id=$2',[userId,id]);
 return result.rows[0]?.snapshot||null;
}
