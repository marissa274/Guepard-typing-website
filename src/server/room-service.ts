import {randomBytes} from 'node:crypto';
import {transaction} from './room-store';
import {createRoom,authenticate,joinRoom,act,snapshot,tick,RoomError} from './room-engine';
import {RoomAccessError,requireRoomAccess} from './room-access';
import {consumeCodeAttempt} from './code-rate-limit';
import {prepareConfiguredText} from './text-corpus';
import type {Room,Person} from '../lib/room-types';
import type {Account} from '../lib/auth-types';

type Command=Record<string,unknown>;
type Data=Record<string,Room>;
const ageLimit=86400000;
function available(room:Room){return Date.now()-room.createdAt<ageLimit}
function find(data:Data,id:string){const room=data[id];if(!room||!available(room))throw new RoomError('Ce salon est fermé ou introuvable.',404);return room}
function occupancy(room:Room){return room.people.filter(p=>p.role==='player'||p.late).length}
function isPresent(person:Person){return person.kind!=='bot'&&!!person.token}
function prune(data:Data){for(const [id,room]of Object.entries(data))if(!available(room))delete data[id]}
function identity(body:Command){requireRoomAccess(typeof body.identityKey==='string'&&body.identityKey.length>0,'Identité de session manquante.',401);return body.identityKey}
function membership(data:Data,key:string){for(const room of Object.values(data)){if(!available(room))continue;const person=room.people.find(p=>p.identityKey===key&&isPresent(p));if(person)return {room,person}}}
function requireSingleRoom(data:Data,key:string,id?:string){const active=membership(data,key);if(active&&active.room.id!==id)throw new RoomAccessError('Vous êtes déjà dans un autre salon. Quittez-le avant de continuer.',409,'ROOM_MEMBERSHIP_CONFLICT',active.room.id);return active?.person}
function account(body:Command){requireRoomAccess(body.kind==='demo'&&typeof body.userId==='string'&&body.identityKey==='user:'+body.userId,'Connectez-vous pour créer un salon.',403)}
function requireHost(room:Room,person:Person){requireRoomAccess(room.hostId===person.id,'Seul l’hôte peut effectuer cette action.')}
function checkBan(room:Room,body:Command){requireRoomAccess(!room.bannedIdentities?.includes(String(body.identityKey))&&!room.bannedIpHashes?.includes(String(body.ipHash)),'Votre accès à ce salon a été révoqué.')}
function validateInvitation(room:Room,body:Command){
 const invitation=room.invites.find(i=>i.token===body.invite&&!i.revoked&&i.expires>Date.now());
 requireRoomAccess(invitation,'Invitation expirée, révoquée ou introuvable.');
 if(invitation.used)requireRoomAccess(invitation.identityKey===body.identityKey&&invitation.ipHash===body.ipHash,'Cette invitation est réservée à son destinataire.');
 return invitation;
}
function admit(data:Data,room:Room,body:Command){
 const key=identity(body);checkBan(room,body);
 requireRoomAccess(body.role===undefined||body.role==='player'||body.role==='spectator','Rôle invalide.',400);
 const invitation=typeof body.invite==='string'&&body.invite?validateInvitation(room,body):undefined;
 const existing=requireSingleRoom(data,key,room.id);
 if(existing){existing.seen=Date.now();room.revision++;return {room:snapshot(room,existing),token:existing.token}}
 requireRoomAccess(room.phase==='waiting'||room.phase==='finished','Cette course a déjà commencé. Attendez les résultats.',409);
 if(body.role!=='spectator')requireRoomAccess(occupancy(room)<room.settings.capacity,'Le salon est complet.',409);
 if(room.settings.visibility==='private')requireRoomAccess(invitation,'Une invitation est nécessaire pour ce salon privé.');
 if(room.settings.visibility==='semi'&&!invitation)requireRoomAccess(typeof body.code==='string'&&body.code.toUpperCase()===room.code,'Le code du salon est incorrect.');
 const person=joinRoom(room,body,{accessVerified:true});
 if(invitation){invitation.used=true;invitation.identityKey=key;invitation.ipHash=String(body.ipHash);invitation.usedBy=person.id;invitation.usedName=person.name}
 return {room:snapshot(room,person),token:person.token};
}

export async function listRooms(filters:{language?:string;complexity?:string}={}){return transaction(data=>Object.values(data).filter(room=>room.settings.visibility==='public'&&available(room)&&(!filters.language||room.settings.language===filters.language)&&(!filters.complexity||room.settings.complexity===filters.complexity)).map(room=>({id:room.id,name:{fr:room.name,en:room.name},animal:room.animal,language:room.settings.language,complexity:room.settings.complexity,capacity:room.settings.capacity,host:room.people.find(p=>p.id===room.hostId)?.name||'',players:occupancy(room),state:room.phase,joinable:(room.phase==='waiting'||room.phase==='finished')&&occupancy(room)<room.settings.capacity,live:true})),false)}
export async function create(body:Command){
 account(body);const key=identity(body);
 requireRoomAccess(body.role===undefined||body.role==='player'||body.role==='spectator','Rôle invalide.',400);
 requireRoomAccess(body.capacity===undefined||Number.isInteger(body.capacity)&&Number(body.capacity)>=2&&Number(body.capacity)<=30,'La capacité doit être comprise entre 2 et 30.',400);
 return transaction(data=>{
  prune(data);requireSingleRoom(data,key);
  let result=createRoom(body),tries=0;
  while(Object.values(data).some(room=>room.code===result.room.code)){requireRoomAccess(tries++<20,'Impossible de générer un code unique. Réessayez.',503);result=createRoom(body)}
  if(typeof body.capacity==='number')result.room.settings.capacity=body.capacity;
  if(body.role==='spectator')result.person.role='spectator';
  data[result.room.id]=result.room;return {room:snapshot(result.room,result.person),token:result.person.token};
 });
}
export async function quickJoin(body:Command){
 const key=identity(body);
 return transaction(data=>{
  prune(data);
  const current=membership(data,key);if(current)return {room:snapshot(current.room,current.person),token:current.person.token};
  const rooms=Object.values(data).filter(room=>room.settings.visibility==='public'&&(room.phase==='waiting'||room.phase==='finished')&&occupancy(room)<room.settings.capacity&&!room.bannedIdentities?.includes(key)&&!room.bannedIpHashes?.includes(String(body.ipHash))).sort((a,b)=>(a.settings.capacity-occupancy(a))-(b.settings.capacity-occupancy(b))||a.createdAt-b.createdAt);
  if(!rooms.length)throw new RoomAccessError('Aucun salon public disponible pour le moment.',404,'QUICK_JOIN_EMPTY',undefined,body.kind==='demo');
  return admit(data,rooms[0],body);
 });
}
export async function resolveCode(code:string,ipHash='local'){
 await consumeCodeAttempt(ipHash);
 requireRoomAccess(/^[A-HJKMNP-Z2-9]{6}$/i.test(code),'Code introuvable.',404);
 return transaction(data=>{const room=Object.values(data).find(room=>room.code===code.toUpperCase()&&room.settings.visibility!=='private'&&available(room));if(!room)throw new RoomError('Code introuvable.',404);return {id:room.id}},false);
}
export async function get(id:string,token:string){return transaction(data=>{const room=find(data,id),person=authenticate(room,token);tick(room,true);if(Date.now()-person.seen>5000){person.seen=Date.now();room.revision++}return snapshot(room,person)})}
function leave(data:Data,room:Room,person:Person){
 if(room.phase==='waiting')room.people=room.people.filter(p=>p.id!==person.id);
 else{person.token=undefined;if((room.phase==='running'||room.phase==='countdown')&&!person.finishedAt){person.abandoned=true;person.abandonedAt=Date.now()}}
 if(person.id===room.hostId){const next=room.people.filter(p=>p.kind==='demo'&&isPresent(p)&&Date.now()-p.seen<35000).sort((a,b)=>(a.joinedAt||a.seen)-(b.joinedAt||b.seen))[0];if(next)room.hostId=next.id;else delete data[room.id]}
 room.revision++;tick(room,true);return {left:true};
}
export async function leaveCurrent(body:Command){const key=identity(body);return transaction(data=>{prune(data);const current=membership(data,key);return current?leave(data,current.room,current.person):{left:true}})}
/** A verified guest cookie may become a signed-in identity, never a second presence. */
export async function adoptGuestMembership(user:Account,guestId:string){
 return transaction(data=>{
  prune(data);
  const guest=membership(data,'guest:'+guestId),account=membership(data,'user:'+user.id);
  if(!guest)return;
  if(account&&account.person.id!==guest.person.id){leave(data,guest.room,guest.person);return}
  Object.assign(guest.person,{identityKey:'user:'+user.id,userId:user.id,kind:'demo',name:user.username,animal:user.avatar,avatarUrl:user.avatarUrl});
  for(const invitation of guest.room.invites)if(invitation.usedBy===guest.person.id){invitation.identityKey='user:'+user.id;invitation.usedName=user.username}
  guest.room.revision++;
 });
}
export async function mutate(id:string,token:string,body:Command){
 if(body.action==='join'&&typeof body.code==='string'&&body.code)await consumeCodeAttempt(String(body.ipHash||'local'));
 return transaction(async data=>{
  prune(data);const room=find(data,id);tick(room,true);
  if(body.action==='join')return admit(data,room,body);
  const person=authenticate(room,token);person.seen=Date.now();
  if(body.action==='leave')return leave(data,room,person);
  if(body.action==='close'){requireHost(room,person);delete data[id];return {left:true,closed:true}}
  if(body.action==='invite'){
   requireHost(room,person);requireRoomAccess(room.settings.visibility!=='public','Les salons publics ne nécessitent pas d’invitation.',400);
   const count=body.count===undefined?1:body.count;requireRoomAccess(Number.isInteger(count)&&Number(count)>=1&&Number(count)<=30,'Nombre d’invitations invalide.',400);
   const invitations=Array.from({length:Number(count)},()=>({token:randomBytes(32).toString('base64url'),expires:Date.now()+30*60*1000,used:false}));room.invites.push(...invitations);room.revision++;
   return {invitation:invitations[0],invitations,room:snapshot(room,person)};
  }
  if(body.action==='revokeInvite'){
   requireHost(room,person);const invitation=room.invites.find(i=>i.token===body.invite);requireRoomAccess(invitation,'Invitation introuvable.',404);invitation.revoked=true;room.revision++;return {room:snapshot(room,person)};
  }
  if(body.action==='kick'){
   requireHost(room,person);requireRoomAccess(body.personId!==person.id,'Vous ne pouvez pas retirer l’hôte.',400);
   const target=room.people.find(p=>p.id===body.personId);requireRoomAccess(target,'Participant introuvable.',404);
   if(target.identityKey){room.bannedIdentities??=[];if(!room.bannedIdentities.includes(target.identityKey))room.bannedIdentities.push(target.identityKey)}
   for(const invitation of room.invites)if(invitation.usedBy===target.id||invitation.identityKey===target.identityKey&&!!target.identityKey)invitation.revoked=true;
   if(room.phase==='waiting')room.people=room.people.filter(p=>p.id!==target.id);else{target.token=undefined;if((room.phase==='running'||room.phase==='countdown')&&!target.finishedAt){target.abandoned=true;target.abandonedAt=Date.now()}}
   room.revision++;tick(room,true);return {room:snapshot(room,person)};
  }
  if(body.action==='bot'||body.action==='role'&&body.role==='player')requireRoomAccess(occupancy(room)<room.settings.capacity||room.people.some(p=>p.id===body.personId&&(p.role==='player'||p.late)),'Le salon est complet.',409);
  if(body.action==='settings'&&body.settings&&typeof body.settings==='object'&&'capacity'in body.settings){const capacity=body.settings.capacity;requireRoomAccess(Number.isInteger(capacity)&&Number(capacity)>=2&&Number(capacity)<=30,'La capacité doit être comprise entre 2 et 30.',400);requireRoomAccess(Number(capacity)>=occupancy(room),'La capacité ne peut pas être inférieure au nombre de participants.',409)}
  let generatedText:string|undefined;
  if(body.action==='start'||body.action==='rematch'){requireHost(room,person);try{generatedText=await prepareConfiguredText(room.settings)}catch(error){if(error instanceof Error&&'status'in error&&error.status===400)throw new RoomError(error.message,400);throw error}}
  const result=act(room,person,body,generatedText);return {...result,room:snapshot(room,person)};
 });
}
