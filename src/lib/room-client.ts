import {clientError} from '../i18n/errors';
import type {RoomView} from './room-types';
import type {RoomReply} from './room-api-types';
export class RoomRequestError extends Error {constructor(message:string,public status:number,public code?:string,public roomId?:string,public canCreate?:boolean){super(message)}}
export function tokenFor(id:string){return sessionStorage.getItem('guepard-room-'+id)||''}
export async function roomRequest(id:string|null,body?:unknown,signal?:AbortSignal):Promise<RoomReply>{const response=await fetch('/api/rooms'+(id?'/'+encodeURIComponent(id):''),{method:body?'POST':'GET',cache:'no-store',signal,headers:{'Content-Type':'application/json',...(id?{Authorization:'Bearer '+tokenFor(id)}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json() as RoomReply;if(!response.ok)throw new RoomRequestError(clientError(data.error||'Le serveur ne peut pas répondre.'),response.status,data.code,data.roomId,data.canCreate);if(data.token&&data.room)sessionStorage.setItem('guepard-room-'+data.room.id,data.token);return data}
/**
 * The open stream is the presence signal: the server refreshes `seen` while it is connected.
 * No leave is sent on pagehide/beforeunload on purpose: browsers cannot tell a reload from a tab
 * closing, and a reload must keep the seat (COURSE-08). A closed tab is detected server-side after
 * the 30 s grace period, which then transfers the host role or closes the room (SALLE-08).
 */
export async function subscribeRoom(id:string,signal:AbortSignal,onRoom:(r:RoomView)=>void,onClosed:()=>void){const response=await fetch(`/api/rooms/${encodeURIComponent(id)}/events`,{signal,headers:{Authorization:'Bearer '+tokenFor(id)}});if(response.status===403||response.status===404){onClosed();return}if(!response.ok)throw new Error('La connexion au salon a été interrompue.');const reader=response.body!.getReader(),decoder=new TextDecoder();let buffer='';try{while(!signal.aborted){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let boundary;while((boundary=buffer.indexOf('\n\n'))>=0){const message=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);if(message.startsWith('data: ')){const data=JSON.parse(message.slice(6));if(data.closed){onClosed();return}if(data.room)onRoom(data.room)}}}}finally{reader.releaseLock()}}
