import {createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {isIP} from 'node:net';
import {RoomAccessError} from './room-access';
export interface GuestIdentity {id:string;name:string;expires:number}
export const guestCookieName='guepard_guest';
export const guestLifetime=30*24*60*60;
let developmentSecret:Promise<string>|undefined;
export function guestSecret():Promise<string>{
 if(process.env.AUTH_SECRET)return Promise.resolve(process.env.AUTH_SECRET);
 if(process.env.NODE_ENV==='production')throw new Error('AUTH_SECRET est requis pour signer les sessions invitées.');
 return developmentSecret??=loadDevelopmentSecret();
}
async function loadDevelopmentSecret(){
 const dir=process.env.GUEPARD_DATA_DIR||join(process.cwd(),'.data'),path=join(dir,'guest-secret');
 try{return await readFile(path,'utf8')}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
 await mkdir(dir,{recursive:true});
 try{await writeFile(path,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600})}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error}
 return readFile(path,'utf8');
}
export function signGuestIdentity(guest:GuestIdentity,secret:string){const encoded=Buffer.from(JSON.stringify(guest)).toString('base64url');return encoded+'.'+createHmac('sha256',secret).update(encoded).digest('base64url')}
export function verifyGuestIdentity(value:string|undefined,secret:string):GuestIdentity|null{
 if(!value||value.length>1024)return null;
 const [encoded,signature,...extra]=value.split('.');if(!encoded||!signature||extra.length)return null;
 const expected=createHmac('sha256',secret).update(encoded).digest(),actual=Buffer.from(signature,'base64url');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
 try{const parsed:unknown=JSON.parse(Buffer.from(encoded,'base64url').toString());if(!parsed||typeof parsed!=='object')return null;const guest=parsed as GuestIdentity;return typeof guest.id==='string'&&/^[a-f0-9-]{36}$/i.test(guest.id)&&typeof guest.name==='string'&&guest.name.trim().length>=3&&guest.name.length<=20&&Number.isSafeInteger(guest.expires)&&guest.expires>Date.now()?guest:null}catch{return null}
}
export function guestNickname(value:unknown){if(typeof value!=='string'||value.trim().length<3||value.trim().length>20||[...value].some(character=>character.charCodeAt(0)<32||character.charCodeAt(0)===127))throw new RoomAccessError('Le pseudo invité doit contenir de 3 à 20 caractères.',400);return value.trim()}
export function newGuest(name:string):GuestIdentity{return {id:randomUUID(),name,expires:Date.now()+guestLifetime*1000}}
function normalizeAddress(value:string|null|undefined){
 let address=value?.trim()||'';
 const bracketed=/^\[([^\]]+)\](?::\d+)?$/.exec(address);if(bracketed)address=bracketed[1];
 else if(/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(address))address=address.slice(0,address.lastIndexOf(':'));
 address=address.toLowerCase().replace(/^::ffff:(?=\d{1,3}(\.\d{1,3}){3}$)/,'');
 return isIP(address)?address:undefined;
}
/**
 * Client address used for SALLE-10 rate limits, invitation binding and kick bans.
 * Next.js fills X-Forwarded-For from the socket only when no proxy sent one, and a proxy appends
 * the address it actually saw: the trusted entry is therefore counted from the right, never the
 * client-controlled left. GUEPARD_TRUST_PROXY = number of appending proxies (default 1, Railway's edge).
 * GUEPARD_CLIENT_IP_HEADER optionally names a header that the platform overwrites (e.g. X-Real-IP).
 */
export function clientAddress(request?:Request){
 if(!request)return 'unknown';
 const header=process.env.GUEPARD_CLIENT_IP_HEADER?.trim();
 if(header){const address=normalizeAddress(request.headers.get(header));if(address)return address}
 const hops=Number(process.env.GUEPARD_TRUST_PROXY||1),trusted=Number.isInteger(hops)&&hops>=1&&hops<=10?hops:1;
 const chain=(request.headers.get('x-forwarded-for')||'').split(',').map(entry=>entry.trim()).filter(Boolean);
 return normalizeAddress(chain[Math.max(0,chain.length-trusted)])||'unknown';
}
export async function requestIpHash(request?:Request){
 return createHmac('sha256',await guestSecret()).update(clientAddress(request)).digest('hex');
}
