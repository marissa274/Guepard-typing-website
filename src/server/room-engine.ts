import {randomUUID,randomInt} from 'node:crypto';
import {isAnimal,isProfileAnimal} from '../lib/animals';
import {botState,botProfiles} from './bot-engine';
import {typingEdit} from '../lib/typing-edits';
import {generateConfiguredText,TextGenerationError} from './text-generator';
import {applyBonuses} from './race-bonuses';
import {insertedErrors,keyboardAggregate,recordKeyboard,recordTelemetry,typingAllowance} from './race-telemetry';
import {defaultSettings, type Room,type Person,type RoomView,type Settings,type Difficulty,type Visibility,type Invitation,type Heatmap} from '../lib/room-types';
type EngineBody=Record<string,unknown>;
export interface ActionResult {invitation?:Invitation}
export class RoomError extends Error{constructor(message:string,public status=400){super(message)}}
function requireValue(condition:unknown,message:string,status=400):asserts condition{if(!condition)throw new RoomError(message,status)}
export function name(value:unknown){requireValue(typeof value==='string'&&value.trim().length>0&&value.trim().length<=40,'Le pseudo doit contenir de 1 à 40 caractères.');return value.trim()}
function person(body:EngineBody):Person{return {id:randomUUID(),token:randomUUID(),userId:body.kind==='demo'&&typeof body.userId==='string'?body.userId:undefined,identityKey:typeof body.identityKey==='string'?body.identityKey:undefined,ipHash:typeof body.ipHash==='string'?body.ipHash:undefined,joinedAt:Date.now(),name:name(body.nickname),avatarUrl:body.kind==='demo'&&typeof body.avatarUrl==='string'?body.avatarUrl:undefined,animal:body.kind==='demo'&&isProfileAnimal(body.avatar)?body.avatar:'cheetah',kind:body.kind==='demo'?'demo':'guest',role:body.role==='spectator'?'spectator':'player',late:false,seen:Date.now(),progress:0,errors:0,typed:0,abandoned:false}}
export function createRoom(body:EngineBody):{room:Room;person:Person}{requireValue(isAnimal(body.animal),'Choisissez un animal pour la course.');requireValue(typeof body.name==='string'&&body.name.trim().length>0&&body.name.length<=80,'Donnez un nom au salon (80 caractères maximum).');const host=person(body),alphabet='ABCDEFGHJKMNPQRSTUVWXYZ23456789';const room:Room={id:randomUUID(),name:body.name.trim(),animal:body.animal,code:Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join(''),hostId:host.id,people:[host],settings:validateSettings({...defaultSettings,visibility:(body.visibility||'semi') as Visibility,language:(body.language||'FR') as 'FR'|'EN'}),phase:'waiting',createdAt:Date.now(),revision:1,invites:[]};return {room,person:host}}
export function authenticate(room:Room,token:string){const p=room.people.find(p=>p.token===token&&p.kind!=='bot');requireValue(p,'Vous ne faites plus partie de ce salon.',403);return p}
export function validateSettings(s:Settings):Settings{requireValue(['public','semi','private'].includes(s.visibility)&&['FR','EN'].includes(s.language)&&['story','words','custom'].includes(s.textType)&&['jungle','adventure','science'].includes(s.bank)&&['easy','medium','hard'].includes(s.complexity),'Paramètres invalides.');for(const [k,min,max]of [['length',20,1000],['capacity',2,30],['targetWpm',0,400],['inactiveAfter',15,600]] as const)requireValue(Number.isInteger(s[k])&&s[k]>=min&&s[k]<=max,'Valeur de paramètre hors limites.');requireValue(Number.isInteger(s.timeLimit)&&(s.timeLimit===0||s.timeLimit>=30&&s.timeLimit<=600),'Valeur de paramètre hors limites.');for(const k of ['blockErrors','punctuation','accents','numbers','specials','uppercase','bonuses'] as const)requireValue(typeof s[k]==='boolean','Option invalide.');requireValue(typeof s.blacklist==='string'&&s.blacklist.length<=100&&typeof s.whitelist==='string'&&s.whitelist.length<=100&&typeof s.customText==='string'&&s.customText.length<=15000,'Texte trop long.');return Object.fromEntries(Object.keys(defaultSettings).map(k=>[k,s[k as keyof Settings]])) as unknown as Settings}
export function generateText(s:Settings):string{
 try{return generateConfiguredText(s)}catch(error){if(error instanceof TextGenerationError)throw new RoomError(error.message);throw error}
}
function pauseDuration(person:Person,at:number){return (person.pauses||[]).reduce((sum,pause)=>sum+Math.max(0,Math.min(at,pause.end)-pause.start),0)}
function botArrival(person:Person,start:number,elapsed:number){let at=start+elapsed;for(const pause of person.pauses||[])if(at>pause.start)at+=pause.end-pause.start;return at}
function advance(room:Room,at:number){
 for(const p of room.people){
  if(p.role!=='player'||p.abandoned||p.finishedAt)continue;
  if(p.kind==='bot'){
   const next=botState({seed:room.id+':'+p.id+':'+room.startedAt,level:p.difficulty||'medium',text:p.targetText??room.text??'',blockErrors:room.settings.blockErrors,elapsedMs:at-room.startedAt!-pauseDuration(p,at)});
   p.progress=next.progress;p.typed=next.typed;p.errors=next.errors;
   if(next.finishedAfterMs!==undefined)p.finishedAt=botArrival(p,room.startedAt!,next.finishedAfterMs);
   continue;
  }
  const disconnectedAt=Math.max(p.seen,room.startedAt!)+30_000;
  if(at>disconnectedAt){p.abandoned=true;p.abandonedAt=disconnectedAt}
 }
 applyBonuses(room,at);recordTelemetry(room,at);
}
export function tick(room:Room,force=false){
 const now=Date.now();
 if(!['countdown','running'].includes(room.phase)||!room.startedAt||now<room.startedAt)return;
 if(room.phase==='countdown'){room.phase='running';room.revision++}
 const deadline=room.settings.timeLimit>0?room.startedAt+room.settings.timeLimit*1000:Infinity;
 const disconnects=room.people.some(p=>p.kind!=='bot'&&p.role==='player'&&!p.finishedAt&&!p.abandoned&&Math.min(now,deadline)>Math.max(p.seen,room.startedAt!)+30_000);
 if(!force&&!disconnects&&now<deadline&&now-(room.lastTick||0)<250)return;
 const effectiveNow=Math.min(now,deadline);
 const gridEnd=room.startedAt+Math.floor((effectiveNow-room.startedAt)/250)*250;
 let at=Math.max(room.startedAt,room.lastTick??room.startedAt);
 if(room.lastTick===undefined)advance(room,room.startedAt);
 while(at<gridEnd){at+=250;advance(room,at);if(room.people.filter(p=>p.role==='player').every(p=>p.finishedAt||p.abandoned))break}
 room.lastTick=at;
 for(const person of room.people){const expires=Math.max(person.seen,room.startedAt)+30_000;if(person.kind!=='bot'&&person.role==='player'&&!person.finishedAt&&!person.abandoned&&effectiveNow>expires){person.abandoned=true;person.abandonedAt=expires}}
 const players=room.people.filter(p=>p.role==='player');
 if(players.every(p=>p.finishedAt||p.abandoned)){room.phase='finished';room.endedAt=Math.max(room.startedAt,...players.map(p=>p.finishedAt||p.abandonedAt||effectiveNow))}
 else if(now>=deadline){room.phase='finished';room.endedAt=deadline}
 if(room.phase==='finished')recordTelemetry(room,room.endedAt!,true);
 room.revision++;
}
/** COURSE-03: a custom text stays with the host until the countdown reveals it to everyone. */
function visibleSettings(room:Room,p:Person):Settings{return room.phase==='waiting'&&p.id!==room.hostId?{...room.settings,customText:''}:room.settings}
const heatErrors=(heat:Heatmap)=>Object.values(heat).reduce((sum,entry)=>sum+entry.errors,0);
export function snapshot(room:Room,p:Person):RoomView{const {invites,bannedIdentities,bannedIpHashes,...safe}=room;return {...safe,settings:visibleSettings(room,p),people:room.people.map(({token,input,userId,identityKey,ipHash,heatmap,lastProgressAt,typingBudget,...other})=>({...other,...(other.id===p.id?{input,heatmap}:{} )})),me:p.id,isHost:p.id===room.hostId,players:room.people.filter(p=>p.role==='player'&&!p.abandoned).length,serverNow:Date.now(),...(p.id===room.hostId?{invitations:invites.map(({token,expires,used,usedName,revoked})=>({token,expires,used,usedName,revoked}))}:{})}}
export function joinRoom(room:Room,body:EngineBody,options:{accessVerified?:boolean}={}):Person{requireValue(room.phase==='waiting'||room.phase==='finished','Une course est déjà en cours. Attendez les résultats.',409);const p=person(body);if(p.role==='player')requireValue(room.people.filter(x=>x.role==='player'||x.late).length<room.settings.capacity,'Le salon est complet.',409);if(!options.accessVerified){if(room.settings.visibility==='semi')requireValue(body.code===room.code,'Le code du salon est incorrect.',403);if(room.settings.visibility==='private'){const invite=room.invites.find(i=>i.token===body.invite&&!i.used&&!i.revoked&&i.expires>Date.now());requireValue(invite,'Invitation expirée ou déjà utilisée.',403);invite.used=true;invite.usedBy=p.id;invite.usedName=p.name}}if(room.phase==='finished'&&p.role==='player'){p.role='spectator';p.late=true}room.people.push(p);room.revision++;return p}
export function act(room:Room,p:Person,body:EngineBody,generatedText?:string):ActionResult{
 tick(room,true);p.seen=Date.now();if(body.action==='heartbeat'){room.revision++;return {}}
 if(body.action==='progress'){
  tick(room,true);
  requireValue(room.phase==='running'&&room.startedAt&&Date.now()>=room.startedAt&&p.role==='player'&&!p.abandoned&&!p.finishedAt,'Vous ne pouvez pas taper maintenant.');
  requireValue(typeof body.value==='string','Saisie invalide.');
  const reportedTyped=body.typed;
  requireValue(reportedTyped===undefined||typeof reportedTyped==='number'&&Number.isSafeInteger(reportedTyped)&&reportedTyped>=0,'Le nombre de frappes est invalide.');
  // Leader pause bonus: a batch already in flight is ignored (not rejected), the client sends it again once the pause ends.
  if(p.pausedUntil&&Date.now()<p.pausedUntil)return {};
  const target=p.targetText??room.text!,input=body.value.slice(0,target.length),added=typingEdit(p.input||'',input).inserted.length;
  if(room.settings.blockErrors)requireValue(target.startsWith(input),'Corrigez les erreurs avant de continuer.');
  const typed=Math.max(p.typed+added,reportedTyped??0);
  requireValue(Number.isSafeInteger(typed),'Le nombre de frappes est invalide.');
  const allowance=typingAllowance(p,room.startedAt!,Date.now()),cost=typed-p.typed;
  requireValue(cost<=allowance,'Cette progression est trop rapide. Réessayez après avoir ralenti.');
  const progress=input.split('').filter((c,i)=>c===target[i]).length;
  // Errors are counted by the server from the characters it validates (COURSE-06, annex A accuracy).
  // Keypresses reported but never seen (typed then erased inside one batch) may only add errors, up to their number.
  let errors=p.errors+insertedErrors(p.input||'',input,target);
  if(body.heatmap!==undefined){
   const claimed=keyboardAggregate(body.heatmap,{},typed);
   requireValue(claimed,'Les statistiques du clavier sont invalides.');
   errors+=Math.max(0,Math.min(heatErrors(claimed)-errors,cost-added));
  }
  // The client heatmap only distributes those errors per key; otherwise the server-observed distribution is kept.
  const heatmap=(body.heatmap===undefined?null:keyboardAggregate(body.heatmap,p.heatmap||{},typed,errors))??recordKeyboard(p.heatmap||{},p.input||'',input,target);
  p.typingBudget=allowance-cost;p.lastProgressAt=Date.now();p.lastInput=Date.now();p.input=input;p.progress=progress;p.typed=typed;p.errors=errors;p.heatmap=heatmap;
  applyBonuses(room,Date.now());
  // Free mode: reaching the end of the text finishes the race, remaining errors stay counted (CONF-08).
  const end=p.targetText??room.text!;
  if(room.settings.blockErrors?input===end:input.length>=end.length)p.finishedAt=Date.now();
  recordTelemetry(room,Date.now());room.revision++;tick(room,true);return {};
 }
 if(body.action==='abandon'){requireValue(room.phase==='running'&&p.role==='player'&&!p.abandoned&&!p.finishedAt,'Vous ne pouvez pas abandonner maintenant.');p.abandoned=true;p.abandonedAt=Date.now();recordTelemetry(room,Date.now());room.revision++;tick(room,true);return {}}
 requireValue(p.id===room.hostId,'Seul l’hôte peut effectuer cette action.',403);
 if(body.action==='rematch'){requireValue(room.phase==='finished','La course doit être terminée.');const players=room.people.filter(x=>(x.role==='player'||x.late)&&(x.kind==='bot'||x.token));requireValue(players.length>=2,'Il faut au moins deux joueurs pour démarrer.');requireValue(players.some(x=>x.kind!=='bot'),'Il faut au moins un joueur humain pour démarrer.');const text=generatedText??generateText(room.settings);act(room,p,{action:'reset'});return act(room,p,{action:'start'},text)}
 if(body.action==='reset'){requireValue(room.phase==='finished','La course doit être terminée.');room.phase='waiting';delete room.startedAt;delete room.endedAt;delete room.lastTick;delete room.text;delete room.bonusEvents;delete room.bonusCheckpoints;room.people=room.people.filter(x=>x.kind==='bot'||x.token);room.people.forEach(x=>{if(x.late){x.role='player';x.late=false}delete x.input;delete x.lastInput;delete x.abandonedAt;delete x.targetText;delete x.telemetry;delete x.heatmap;delete x.bonusReceived;delete x.pauses;delete x.pausedUntil;delete x.lastProgressAt;delete x.typingBudget;x.progress=0;x.errors=0;x.typed=0;x.abandoned=false;delete x.finishedAt});room.revision++;return {}}
 requireValue(room.phase==='waiting','Les réglages sont verrouillés pendant la course.');
 if(body.action==='settings'){requireValue(body.settings&&typeof body.settings==='object'&&!Array.isArray(body.settings),'Paramètres invalides.');const settings=body.settings as EngineBody;room.settings=validateSettings({...defaultSettings,...room.settings,...settings});if(settings.visibility)room.invites=[]}
 else if(body.action==='role'){requireValue(body.role==='player'||body.role==='spectator','Rôle invalide.');const target=room.people.find(x=>x.id===body.personId);requireValue(target,'Participant introuvable.');target.role=body.role;target.late=false}
 else if(body.action==='bot'){const candidate=body.difficulty??'medium';requireValue(typeof candidate==='string'&&Object.hasOwn(botProfiles,candidate),'Niveau invalide.');const level=candidate as Difficulty;requireValue(room.people.filter(x=>x.role==='player').length<room.settings.capacity,'Le salon est complet.',409);const count=room.people.filter(x=>x.kind==='bot').length;room.people.push({...person({nickname:'Bot '+(count+1)}),token:undefined,animal:(['toucan','monkey','parrot','elephant'] as const)[count%4],kind:'bot',difficulty:level})}
 else if(body.action==='difficulty'){const target=room.people.find(x=>x.id===body.personId&&x.kind==='bot');requireValue(target&&typeof body.difficulty==='string'&&Object.hasOwn(botProfiles,body.difficulty),'Bot ou niveau invalide.');target.difficulty=body.difficulty as Difficulty}
 else if(body.action==='start'){const players=room.people.filter(x=>x.role==='player');requireValue(players.length>=2,'Il faut au moins deux joueurs pour démarrer.');requireValue(players.some(x=>x.kind!=='bot'),'Il faut au moins un joueur humain pour démarrer.');room.text=generatedText??generateText(room.settings);room.startedAt=Date.now()+3000;room.phase='countdown';room.bonusEvents=[];room.bonusCheckpoints=[];room.people.forEach(x=>{x.seen=Date.now();x.lastInput=room.startedAt;x.targetText=room.text;x.telemetry=[];x.heatmap={};x.bonusReceived=0;x.pauses=[]})}
 else throw new RoomError('Action inconnue.');room.revision++;return {};
}
