import {test,expect,type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import {compareRacers} from '../../src/lib/race-ranking';
import type {RoomView} from '../../src/lib/room-types';

/**
 * Test de charge : une vraie course à 30 joueurs simultanés (COURSE-05, PERF-02, PERF-03).
 * Lancement : `npm run test:load` contre un build de production (voir docs/perf/course-30-joueurs.md).
 *
 * Choix : 29 joueurs pilotés par HTTP (fetch Node) et SSE, plus 1 vrai Chromium qui est à la fois le
 * 30e joueur (il tape dans le champ de saisie réel) et l'observateur dont on mesure la fluidité.
 * Trente navigateurs mesureraient surtout la machine de test ; ici le serveur reçoit exactement les
 * mêmes requêtes (lot de progression toutes les 180 ms, flux SSE par joueur) et le rendu réel
 * de la piste est mesuré sur un navigateur.
 */
const players=Number(process.env.LOAD_PLAYERS||30);
const msPerChar=Number(process.env.LOAD_MS_PER_CHAR||110);
const batchMs=180;
const sentence='la jungle offre un chemin calme et lumineux aux amis qui traversent la riviere en courant vers le grand arbre ';
const text=sentence.repeat(3).trim();
const password='GuepardLoad42!';
const runId=Date.now().toString(36).slice(-5);

interface Sent {at:number;ms:number;status:number;error?:string}
interface Client {index:number;name:string;personId:string;token:string;cookie:string;sent:Sent[];firstSent:Map<number,number>;seen:Map<string,Map<number,number>>;sseOpen:boolean;sseDrops:number;sseMessages:number}

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
function percentile(values:number[],p:number){if(!values.length)return NaN;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.ceil(p/100*sorted.length)-1)]}
const stats=(values:number[])=>({count:values.length,p50:round(percentile(values,50)),p95:round(percentile(values,95)),p99:round(percentile(values,99)),max:round(values.length?Math.max(...values):NaN),mean:round(values.length?values.reduce((a,b)=>a+b,0)/values.length:NaN)});
const round=(value:number)=>Math.round(value*10)/10;
async function inBatches<T>(items:T[],size:number,job:(item:T)=>Promise<void>){for(let i=0;i<items.length;i+=size)await Promise.all(items.slice(i,i+size).map(job))}

async function api(base:string,client:{cookie:string;token?:string},path:string,body?:unknown){
 const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:client.cookie,...(client.token?{Authorization:'Bearer '+client.token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json().catch(()=>({})) as Record<string,any>; // eslint-disable-line @typescript-eslint/no-explicit-any
 return {response,data};
}
async function signup(base:string,name:string){
 const response=await fetch(base+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'signup',username:name,password,confirmation:password,avatar:'cheetah'})});
 if(!response.ok)throw new Error('Inscription refusée '+response.status+' '+await response.text());
 const cookie=response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
 return {cookie,body:await response.json() as {user:{id:string}}};
}

/** Instrumentation navigateur : images par seconde de la piste (rAF) et longues tâches. */
const probe=()=>{
 const w=window as unknown as {__perf:{frames:number[];longTasks:{start:number;duration:number}[];mutations:number;on:boolean}};
 w.__perf={frames:[],longTasks:[],mutations:0,on:false};
 const tick=(t:number)=>{if(w.__perf.on)w.__perf.frames.push(t);requestAnimationFrame(tick)};requestAnimationFrame(tick);
 try{new PerformanceObserver(list=>{if(w.__perf.on)for(const e of list.getEntries())w.__perf.longTasks.push({start:e.startTime,duration:e.duration})}).observe({type:'longtask',buffered:false})}catch{/* longtask indisponible */}
 const watch=()=>{const lanes=document.querySelector('.race-lanes');if(!lanes){setTimeout(watch,200);return}new MutationObserver(()=>{if(w.__perf.on)w.__perf.mutations++}).observe(lanes,{subtree:true,attributes:true,childList:true})};watch();
};

function serverProcess(port:string){
 try{return Number(execFileSync('lsof',['-ti','tcp:'+port,'-sTCP:LISTEN'],{encoding:'utf8'}).split('\n')[0])}catch{return 0}
}

test('course réelle à 30 joueurs simultanés',async({browser,baseURL})=>{
 const base=baseURL!.replace(/\/$/,'');
 const port=new URL(base).port,pid=Number(process.env.LOAD_SERVER_PID)||serverProcess(port);
 const abort=new AbortController();
 const clients:Client[]=[];
 const created:{host?:Client}={};
 const cpu:{cpu:number;rss:number}[]=[];
 let sampler:ReturnType<typeof setInterval>|undefined;
 const context=await browser.newContext({baseURL:base});
 const page:Page=await context.newPage();
 await page.addInitScript(probe);
 try{
  // 1. Comptes (30 inscriptions : le résultat de chacun est persisté par le serveur).
  const accounts:{name:string;cookie:string}[]=[];
  await inBatches(Array.from({length:players},(_,i)=>i),6,async i=>{const name=`L${runId}${i}`;const {cookie}=await signup(base,name);accounts[i]={name,cookie}});
  const browserIndex=players-1;

  // 2. Salon de 30 : l'hôte (joueur 0) crée, règle, tous rejoignent.
  const host={cookie:accounts[0].cookie,token:undefined as string|undefined};
  const make=await api(base,host,'/api/rooms',{name:'Charge '+runId,animal:'cheetah',visibility:'public'});
  expect(make.response.status,JSON.stringify(make.data)).toBe(200);
  const roomId=make.data.room.id as string;
  const settings=await api(base,{cookie:host.cookie,token:make.data.token},'/api/rooms/'+roomId,{action:'settings',settings:{capacity:players,textType:'custom',customText:text,timeLimit:120,bonuses:false}});
  expect(settings.response.status,JSON.stringify(settings.data)).toBe(200);
  const makeClient=(index:number,personId:string,token:string):Client=>({index,name:accounts[index].name,personId,token,cookie:accounts[index].cookie,sent:[],firstSent:new Map(),seen:new Map(),sseOpen:false,sseDrops:0,sseMessages:0});
  clients[0]=makeClient(0,make.data.room.me,make.data.token);created.host=clients[0];
  const joinErrors:string[]=[];
  await inBatches(Array.from({length:players-1},(_,i)=>i+1).filter(i=>i!==browserIndex),8,async i=>{
   const joined=await api(base,{cookie:accounts[i].cookie},'/api/rooms/'+roomId,{action:'join'});
   if(joined.response.status!==200){joinErrors.push(i+':'+joined.response.status+' '+JSON.stringify(joined.data));return}
   clients[i]=makeClient(i,joined.data.room.me,joined.data.token);
  });
  // Le 30e joueur est un vrai navigateur : il rejoint via la session du contexte.
  const [cookieName,...cookieValue]=accounts[browserIndex].cookie.split('=');
  await context.addCookies([{name:cookieName,value:cookieValue.join('='),url:base}]);
  const joinedBrowser=await context.request.post('/api/rooms/'+roomId,{data:{action:'join'}});
  expect(joinedBrowser.status(),await joinedBrowser.text()).toBe(200);
  const browserJoin=await joinedBrowser.json() as {room:RoomView;token:string};
  expect(joinErrors).toEqual([]);
  await page.goto('/');
  await page.evaluate(({id,token})=>sessionStorage.setItem('guepard-room-'+id,token),{id:roomId,token:browserJoin.token});
  await page.goto('/lobby/'+roomId);
  await expect(page.getByRole('button',{name:'Lancer la course'})).toHaveCount(0);
  expect(browserJoin.room.people.length).toBe(players);
  const browserPerson=browserJoin.room.me;

  // Compteurs de requêtes du navigateur (ses propres lots de progression).
  const browserProgress:Sent[]=[];
  const pending=new Map<unknown,number>();
  page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/rooms/'+roomId))pending.set(request,performance.now())});
  page.on('response',response=>{const request=response.request(),begin=pending.get(request);if(begin===undefined)return;pending.delete(request);browserProgress.push({at:Date.now(),ms:performance.now()-begin,status:response.status()})});

  // 3. Flux SSE de chaque joueur HTTP + échantillonnage CPU/mémoire du serveur.
  const everyone=clients.filter(Boolean);
  expect(everyone.length).toBe(players-1);
  const lastProgress=new Map<string,number>();
  const learn=(client:Client,room:RoomView,now:number)=>{
   for(const person of room.people){
    const key=`${client.index}:${person.id}`;if((lastProgress.get(key)??0)===person.progress)continue;lastProgress.set(key,person.progress);
    const map=client.seen.get(person.id)??new Map<number,number>();if(!map.has(person.progress))map.set(person.progress,now);client.seen.set(person.id,map);
   }
  };
  async function stream(client:Client){
   try{
    const response=await fetch(`${base}/api/rooms/${roomId}/events`,{signal:abort.signal,headers:{Authorization:'Bearer '+client.token,Cookie:client.cookie}});
    if(!response.ok||!response.body)throw new Error('SSE '+response.status);
    client.sseOpen=true;const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
    for(;;){
     const {done,value}=await reader.read();if(done)break;
     buffer+=decoder.decode(value,{stream:true});let boundary;
     while((boundary=buffer.indexOf('\n\n'))>=0){
      const message=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);
      if(message.startsWith('data: ')){const data=JSON.parse(message.slice(6));if(data.room){client.sseMessages++;learn(client,data.room as RoomView,Date.now())}}
     }
    }
    if(!abort.signal.aborted)client.sseDrops++;
   }catch{if(!abort.signal.aborted)client.sseDrops++}
   client.sseOpen=false;
  }
  everyone.forEach(client=>{void stream(client)});
  await expect.poll(()=>everyone.filter(client=>client.sseOpen).length,{timeout:15000}).toBe(everyone.length);
  if(pid)sampler=setInterval(()=>{try{const [c,r]=execFileSync('ps',['-o','%cpu=,rss=','-p',String(pid)],{encoding:'utf8'}).trim().split(/\s+/).map(Number);cpu.push({cpu:c,rss:r/1024})}catch{/* processus terminé */}},1000);

  // 4. Départ (compte à rebours serveur de 3 s), puis frappe simultanée.
  const start=await api(base,{cookie:host.cookie,token:make.data.token},'/api/rooms/'+roomId,{action:'start'});
  expect(start.response.status,JSON.stringify(start.data)).toBe(200);
  const startedAt=start.data.room.startedAt as number,clockOffset=start.data.room.serverNow-Date.now();
  const raceStart=startedAt-clockOffset;
  await sleep(Math.max(0,raceStart-Date.now())+150);
  await page.evaluate(()=>{(window as unknown as {__perf:{on:boolean}}).__perf.on=true});
  const measuredFrom=Date.now();
  let lanes=0;
  const laneProbe=sleep(6000).then(async()=>{lanes=await page.locator('.race-lane').count()});

  async function play(client:Client){
   // Vitesse propre au joueur (≈ 100 à 135 ms par caractère) et gigue de ±20 % par frappe.
   const factor=msPerChar/110*(0.9+0.35*Math.random());
   const schedule:number[]=[];let at=0;
   for(let i=0;i<text.length;i++){at+=msPerChar*factor*(0.8+0.4*Math.random());schedule.push(at)}
   const begin=Date.now();let sentCount=0;
   while(sentCount<text.length){
    const elapsed=Date.now()-begin,count=schedule.filter(t=>t<=elapsed).length;
    if(count>sentCount){
     const sentAt=Date.now(),begin2=performance.now();
     try{
      const {response,data}=await api(base,client,'/api/rooms/'+roomId,{action:'progress',value:text.slice(0,count),typed:count});
      client.sent.push({at:sentAt,ms:performance.now()-begin2,status:response.status,error:response.ok?undefined:String(data.error)});
      if(response.ok){for(let n=sentCount+1;n<=count;n++)client.firstSent.set(n,sentAt);sentCount=count}
     }catch(error){client.sent.push({at:sentAt,ms:performance.now()-begin2,status:0,error:String(error)})}
    }
    await sleep(batchMs-((Date.now()-begin)%batchMs));
   }
  }
  async function playBrowser(){
   const field=page.getByLabel('Texte de la course');
   await expect(field).toBeEnabled({timeout:10000});await field.focus();
   const factor=msPerChar/110*(0.9+0.35*Math.random()),begin=Date.now();let at=0;
   for(const character of text){
    at+=msPerChar*factor*(0.8+0.4*Math.random());
    await sleep(Math.max(0,begin+at-Date.now()));
    await field.pressSequentially(character);
   }
  }
  await Promise.all([...everyone.map(play),playBrowser()]);

  // 5. Fin de course côté serveur.
  const watcher=everyone[0];
  let finalRoom!:RoomView;
  await expect.poll(async()=>{const {data}=await api(base,watcher,'/api/rooms/'+roomId);finalRoom=data.room as RoomView;return finalRoom.phase},{timeout:60000,intervals:[500]}).toBe('finished');
  const raceEnd=Date.now();
  await page.evaluate(()=>{(window as unknown as {__perf:{on:boolean}}).__perf.on=false});
  const perf=await page.evaluate(()=>(window as unknown as {__perf:{frames:number[];longTasks:{start:number;duration:number}[];mutations:number;on:boolean}}).__perf);
  await laneProbe;
  if(sampler)clearInterval(sampler);
  abort.abort();

  // 6. Mesures.
  const progressSent=everyone.flatMap(client=>client.sent);
  const ok=progressSent.filter(item=>item.status===200).map(item=>item.ms);
  const statusCounts:Record<string,number>={};
  for(const item of [...progressSent,...browserProgress])statusCounts[String(item.status)]=(statusCounts[String(item.status)]||0)+1;
  const rejections=[...progressSent,...browserProgress].filter(item=>item.status>=400||item.status===0);
  // Délai frappe -> réception : l'envoi du joueur i est observé par le flux SSE du joueur i+1.
  const sse:number[]=[];
  for(const client of everyone){
   const receiver=everyone[(everyone.indexOf(client)+1)%everyone.length];
   const seen=receiver.seen.get(client.personId);if(!seen)continue;
   for(const [progress,sentAt] of client.firstSent){const arrived=seen.get(progress);
    // Une valeur absorbée par une autre ne compte pas : on prend la première valeur >= progress vue.
    const at=arrived??[...seen.entries()].filter(([value])=>value>progress).sort((a,b)=>a[0]-b[0])[0]?.[1];
    if(at!==undefined)sse.push(Math.max(0,at-sentAt));}
  }
  const frames=perf.frames,deltas=frames.slice(1).map((time,i)=>time-frames[i]);
  const seconds=frames.length>1?(frames[frames.length-1]-frames[0])/1000:0;
  const long=perf.longTasks;
  const sampleCpu=cpu.map(item=>item.cpu),sampleRss=cpu.map(item=>item.rss);

  // 7. Cohérence finale.
  const racers=finalRoom.people.filter(person=>person.role==='player');
  const expected=[...racers].sort(compareRacers);
  const finishedTimes=racers.filter(person=>person.finishedAt).map(person=>person.finishedAt!);
  const persisted:{name:string;total:number;rank?:unknown}[]=[];
  await inBatches([...everyone.map(client=>({name:client.name,cookie:client.cookie})),{name:accounts[browserIndex].name,cookie:accounts[browserIndex].cookie}],6,async account=>{
   const {response,data}=await api(base,account,'/api/results?pageSize=5');
   persisted.push({name:account.name,total:response.ok?Number(data.total):-1});
  });
  const consistency={
   racers:racers.length,finished:racers.filter(person=>person.finishedAt&&!person.abandoned).length,abandoned:racers.filter(person=>person.abandoned).length,
   fullProgress:racers.filter(person=>person.progress===text.length).length,
   distinctFinishTimes:new Set(finishedTimes).size,
   rankingSortedByFinish:expected.every((person,i)=>i===0||expected[i-1].finishedAt!<=person.finishedAt!),
   resultsPersisted:persisted.filter(item=>item.total===1).length,
   lanesInBrowser:lanes,
   browserPlayerFinished:!!racers.find(person=>person.id===browserPerson)?.finishedAt,
  };
  const summary={
   when:new Date().toISOString(),players,textLength:text.length,msPerChar,batchMs,
   machine:{cpu:os.cpus()[0].model,cores:os.cpus().length,memoryGb:Math.round(os.totalmem()/2**30),platform:`${os.platform()} ${os.release()}`,node:process.version,serverPid:pid||null},
   durationSeconds:round((raceEnd-measuredFrom)/1000),
   progressRequests:{total:progressSent.length+browserProgress.length,fromHttpClients:progressSent.length,fromBrowser:browserProgress.length,statusCounts,latencyMsHttp200:stats(ok),latencyMsBrowser:stats(browserProgress.filter(item=>item.status===200).map(item=>item.ms)),rejections:rejections.slice(0,10)},
   sseDelayMs:stats(sse),
   sse:{streams:everyone.length,drops:everyone.reduce((sum,client)=>sum+client.sseDrops,0),messagesPerStream:round(everyone.reduce((sum,client)=>sum+client.sseMessages,0)/everyone.length)},
   browser:{frames:frames.length,fps:round(seconds?frames.length/seconds:0),frameMs:{p50:round(percentile(deltas,50)),p95:round(percentile(deltas,95)),max:round(Math.max(0,...deltas))},framesOver50ms:deltas.filter(d=>d>50).length,longTasks:long.length,longTaskTotalMs:round(long.reduce((sum,task)=>sum+task.duration,0)),longTaskMaxMs:round(Math.max(0,...long.map(task=>task.duration))),laneMutations:perf.mutations},
   server:{cpuPercent:stats(sampleCpu),rssMb:stats(sampleRss)},
   consistency,
  };
  mkdirSync('test-results/load',{recursive:true});
  writeFileSync('test-results/load/race-30.json',JSON.stringify(summary,null,1));
  console.log(JSON.stringify(summary,null,1));

  expect(statusCounts['500']||0,'aucune erreur 5xx').toBe(0);
  expect(Object.keys(statusCounts).filter(code=>Number(code)>=500||code==='0'),'aucune erreur 5xx/réseau').toEqual([]);
  expect(rejections.filter(item=>item.status!==200),'aucun refus 4xx').toEqual([]);
  expect(summary.sse.drops,'aucune déconnexion SSE').toBe(0);
  expect(consistency.racers).toBe(players);
  expect(consistency.finished,'les 30 joueurs ont un résultat').toBe(players);
  expect(consistency.abandoned).toBe(0);
  expect(consistency.fullProgress).toBe(players);
  expect(consistency.rankingSortedByFinish,'classement cohérent avec les temps d’arrivée').toBe(true);
  expect(consistency.resultsPersisted,'30 résultats persistés').toBe(players);
  expect(lanes,'30 couloirs affichés').toBe(players);
 }finally{
  if(sampler)clearInterval(sampler);
  abort.abort();
  if(created.host){await fetch(base+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json',Cookie:created.host.cookie},body:JSON.stringify({action:'leave-current'})}).catch(()=>undefined)}
  await context.close();
 }
});
