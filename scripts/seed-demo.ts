import type {CorpusPassage} from '../src/data/corpus.ts';
import {defaultSettings,type Person,type RoomView,type TelemetryPoint} from '../src/lib/room-types.ts';
import type {StoredRaceResult} from '../src/lib/result-types.ts';
import type {ProfileAnimalId} from '../src/lib/animals.ts';

/** Minimal client surface used by the seed (satisfied by pg.Client and by test doubles). */
export interface SeedClient {query(sql:string,params?:unknown[]):Promise<{rows:unknown[]}>}
export interface DemoUser {id:string;username:string;animal:ProfileAnimalId;wpm:number}
export type DemoUserStatus='created'|'existing'|'skipped';
export interface SeedSummary {corpus:number;users:{username:string;status:DemoUserStatus}[];races:number}

/** Stable identifiers: rerunning the seed always targets the same rows. */
export const demoUsers:readonly DemoUser[]=[
 {id:'11111111-1111-4111-8111-111111111111',username:'GuepardDemo',animal:'cheetah',wpm:62},
 {id:'22222222-2222-4222-8222-222222222222',username:'PerroquetDemo',animal:'parrot',wpm:48},
 {id:'33333333-3333-4333-8333-333333333333',username:'CrocodileDemo',animal:'crocodile',wpm:35},
];

function telemetry(startedAt:number,duration:number,length:number,typed:number,ratio=1):TelemetryPoint[]{
 return Array.from({length:Math.floor(duration/5000)+1},(_,index)=>{
  const elapsed=Math.min(duration,index*5000),progress=Math.floor(length*ratio*elapsed/duration);
  return {at:startedAt+elapsed,wpm:elapsed?Math.round(progress*12/(elapsed/1000)):0,grossWpm:elapsed?Math.round(typed*ratio*elapsed/duration*12/(elapsed/1000)):0,progress:progress/Math.max(1,length)};
 });
}
interface Racer {id:string;name:string;animal:ProfileAnimalId;kind:Person['kind'];wpm:number;userId?:string}
interface DemoRace {roomId:string;name:string;startedAt:number;racers:Racer[]}

/** Each user races alone against a bot twice, then all demo users share one race. */
export function demoRaces(users:readonly DemoUser[]):DemoRace[]{
 const bot:Racer={id:'seed-bot',name:'Bot de démonstration',animal:'toucan',kind:'bot',wpm:30};
 const human=(user:DemoUser,bonus=0):Racer=>({id:'seed-'+user.username.toLowerCase(),name:user.username,animal:user.animal,kind:'demo',wpm:user.wpm+bonus,userId:user.id});
 const races:DemoRace[]=[];
 users.forEach((user,u)=>{for(let i=0;i<2;i++)races.push({roomId:`seed-${user.username.toLowerCase()}-${i+1}`,name:`Démonstration — ${user.username} ${i+1}`,startedAt:Date.UTC(2026,9,1+u*3+i,12),racers:[human(user,i*4),bot]})});
 races.push({roomId:'seed-demo-shared',name:'Démonstration — course partagée',startedAt:Date.UTC(2026,9,20,18),racers:[...users.map(user=>human(user)),bot]});
 return races;
}

function raceRecords(race:DemoRace,text:string){
 const finish=(racer:Racer)=>Math.round(text.length*12/racer.wpm*1000);
 const sorted=[...race.racers].sort((a,b)=>finish(a)-finish(b));
 const endedAt=race.startedAt+Math.max(...race.racers.map(finish));
 const people:Person[]=race.racers.map(racer=>{
  const duration=finish(racer),typed=text.length+Math.round(60/racer.wpm*3);
  return {id:racer.id,name:racer.name,animal:racer.animal,kind:racer.kind,role:'player',late:false,seen:endedAt,progress:text.length,typed,errors:typed-text.length,finishedAt:race.startedAt+duration,abandoned:false,telemetry:telemetry(race.startedAt,duration,text.length,typed),...(racer.kind==='bot'?{difficulty:'beginner' as const}:{heatmap:{e:{hits:12,errors:Math.max(0,typed-text.length-1)}}})};
 });
 return race.racers.filter(racer=>racer.userId).map(racer=>{
  const person=people.find(p=>p.id===racer.id)!,rank=sorted.indexOf(racer)+1,seconds=finish(racer)/1000;
  const snapshot:RoomView={id:race.roomId,name:race.name,animal:'cheetah',code:'',hostId:people[0]!.id,settings:{...defaultSettings,visibility:'public',bonuses:false},phase:'finished',createdAt:race.startedAt-60_000,revision:1,startedAt:race.startedAt,endedAt,text,people:people.map(p=>p.id===racer.id?p:{...p,heatmap:undefined}),me:racer.id,isHost:false,players:people.length,serverNow:endedAt};
  const result:StoredRaceResult={id:`${race.roomId}-${race.startedAt}-${racer.id}`,date:person.finishedAt!,roomName:race.name,speed:Math.round(text.length*12/seconds),accuracy:Math.round(text.length/person.typed*100),rank,won:rank===1,abandoned:false,score:null};
  return {userId:racer.userId!,result,snapshot,endedAt};
 });
}

/**
 * Idempotent demo data. A username already owned by another account (username_key conflict)
 * is reported as `skipped`: that account is never modified and receives no demo history.
 */
export async function seedDemo(client:SeedClient,options:{corpus:readonly CorpusPassage[];passwordHash:()=>Promise<string>}):Promise<SeedSummary>{
 for(const item of options.corpus)await client.query('INSERT INTO guepard_corpus(id,language,complexity,kind,content,source) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',[item.id,item.language,item.complexity,item.kind,item.content,item.source]);
 const users:SeedSummary['users']=[],seeded:DemoUser[]=[];
 for(const user of demoUsers){
  // No conflict target: covers both the primary key and the unique username_key.
  const inserted=await client.query('INSERT INTO guepard_users(id,username,username_key,password_hash,avatar) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id',[user.id,user.username,user.username.toLocaleLowerCase('fr'),await options.passwordHash(),user.animal]);
  const status:DemoUserStatus=inserted.rows.length?'created':(await client.query('SELECT id FROM guepard_users WHERE id=$1',[user.id])).rows.length?'existing':'skipped';
  users.push({username:user.username,status});if(status!=='skipped')seeded.push(user);
 }
 const story=options.corpus.find(item=>item.language==='FR'&&item.kind==='story'&&item.complexity==='medium');
 if(!story)throw new Error('Le corpus doit contenir un récit FR de complexité moyenne.');
 const text=story.content.split(' ').slice(0,20).join(' ');
 let races=0;
 for(const race of demoRaces(seeded))for(const record of raceRecords(race,text)){
  await client.query('INSERT INTO guepard_results(id,user_id,room_id,started_at,ended_at,result,snapshot) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',[record.result.id,record.userId,race.roomId,race.startedAt,record.endedAt,JSON.stringify(record.result),JSON.stringify(record.snapshot)]);
  races++;
 }
 return {corpus:options.corpus.length,users,races};
}
