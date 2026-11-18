import {randomBytes,scrypt as scryptCallback} from 'node:crypto';
import {promisify} from 'node:util';
import pg from 'pg';
import {initialCorpus} from '../src/data/corpus.ts';
import {defaultSettings,type RoomView} from '../src/lib/room-types.ts';
import type {StoredRaceResult} from '../src/lib/result-types.ts';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL est requis.');
const demoPassword=process.env.GUEPARD_DEMO_PASSWORD||(process.env.NODE_ENV==='production'?'':'GuepardDemo2026!');
if(demoPassword.length<8||demoPassword.length>128)throw new Error('Définissez GUEPARD_DEMO_PASSWORD (8 à 128 caractères) pour créer le compte de démonstration en production.');
const client=new pg.Client({connectionString:process.env.DATABASE_URL}),scrypt=promisify(scryptCallback);
const userId='11111111-1111-4111-8111-111111111111';
await client.connect();
try{
 await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(74120933)');
 const salt=randomBytes(16).toString('hex'),hash=await scrypt(demoPassword,salt,64) as Buffer;
 await client.query('INSERT INTO guepard_users(id,username,username_key,password_hash,avatar) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING',[userId,'GuepardDemo','gueparddemo',`scrypt$${salt}$${hash.toString('hex')}`,'cheetah']);
 for(const item of initialCorpus)await client.query('INSERT INTO guepard_corpus(id,language,complexity,kind,content,source) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',[item.id,item.language,item.complexity,item.kind,item.content,item.source]);
 const text=initialCorpus.find(item=>item.language==='FR'&&item.kind==='story'&&item.complexity==='medium')!.content.split(' ').slice(0,20).join(' ');
 for(let i=0;i<3;i++){
  const roomId=`seed-demo-race-${i+1}`,startedAt=Date.UTC(2026,9,1+i,12),duration=60_000-i*5000,endedAt=startedAt+duration;
  const speed=Math.round(text.length*12/(duration/1000)),typed=text.length+5-i;
  const telemetry=Array.from({length:Math.floor(duration/5000)+1},(_,index)=>{const elapsed=Math.min(duration,index*5000),progress=Math.floor(text.length*elapsed/duration);return {at:startedAt+elapsed,wpm:elapsed?Math.round(progress*12/(elapsed/1000)):0,grossWpm:elapsed?Math.round(typed*elapsed/duration*12/(elapsed/1000)):0,progress:progress/Math.max(1,text.length)}});
  const snapshot:RoomView={id:roomId,name:'Démonstration — course '+(i+1),animal:'cheetah',code:'',hostId:'seed-player',settings:{...defaultSettings,visibility:'public',bonuses:false},phase:'finished',createdAt:startedAt-60_000,revision:1,startedAt,endedAt,text,people:[{id:'seed-player',name:'GuepardDemo',animal:'cheetah',kind:'demo',role:'player',late:false,seen:endedAt,progress:text.length,typed,errors:typed-text.length,finishedAt:endedAt,abandoned:false,telemetry,heatmap:{e:{hits:12,errors:2}}},{id:'seed-bot',name:'Bot de démonstration',animal:'toucan',kind:'bot',role:'player',late:false,difficulty:'beginner',seen:endedAt,progress:Math.floor(text.length*.8),typed:Math.floor(text.length*.85),errors:Math.floor(text.length*.05),abandoned:false,telemetry:telemetry.map(point=>({...point,wpm:Math.floor(point.wpm*.8),grossWpm:Math.floor(point.grossWpm*.85),progress:point.progress*.8}))}],me:'seed-player',isHost:false,players:2,serverNow:endedAt};
  const result:StoredRaceResult={id:`${roomId}-${startedAt}-seed-player`,date:endedAt,roomName:snapshot.name,speed,accuracy:Math.round(text.length/typed*100),rank:1,won:true,abandoned:false,score:null};
  await client.query('INSERT INTO guepard_results(id,user_id,room_id,started_at,ended_at,result,snapshot) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id,room_id,started_at) DO NOTHING',[result.id,userId,roomId,startedAt,endedAt,JSON.stringify(result),JSON.stringify(snapshot)]);
 }
 await client.query('COMMIT');
 console.log(`Corpus (${initialCorpus.length} entrées), compte et 3 courses de démonstration présents. Les données déjà existantes ont été conservées.`);
}catch(error){await client.query('ROLLBACK');throw error}finally{await client.end()}
