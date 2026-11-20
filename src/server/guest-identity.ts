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
 if(process.env.NODE_ENV==='production')throw new Error('AUTH_SECRET est requis pour signer les sessions invitées. Générez-en un avec : openssl rand -hex 32');
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
/** an IPv6 subscriber usually owns a whole /64 and can pick any address inside it; the prefix is the client. */
function ipv6Prefix(address:string){
 let value=address;
 const tail=/(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
 if(tail){const [a,b,c,d]=tail[1].split('.').map(Number);value=value.slice(0,-tail[1].length)+((a<<8)|b).toString(16)+':'+((c<<8)|d).toString(16)}
 const [head,rest]=value.split('::'),left=head?head.split(':'):[],right=rest===undefined||rest===''?[]:rest.split(':');
 const groups=rest===undefined?left:[...left,...Array<string>(8-left.length-right.length).fill('0'),...right];
 return groups.slice(0,4).map(group=>parseInt(group,16).toString(16)).join(':')+'::/64';
}
function normalizeAddress(value:string|null|undefined){
 let address=value?.trim()||'';
 const bracketed=/^\[([^\]]+)\](?::\d+)?$/.exec(address);if(bracketed)address=bracketed[1];
 else if(/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(address))address=address.slice(0,address.lastIndexOf(':'));
 address=address.toLowerCase().replace(/%.*$/,'').replace(/^::ffff:(?=\d{1,3}(\.\d{1,3}){3}$)/,'');
 const version=isIP(address);
 return version===4?address:version===6?ipv6Prefix(address):undefined;
}
/** Explicitly declared number of appending proxies, or undefined when unset or invalid. */
function trustedHops(){
 const raw=process.env.GUEPARD_TRUST_PROXY?.trim();
 if(!raw||!/^\d+$/.test(raw))return undefined;
 const hops=Number(raw);return hops>=1&&hops<=10?hops:undefined;
}
/** Shared, conservative bucket used when no trustworthy client address exists. */
const unknownAddress='unknown';
/**
 * Client address used for SALLE-10 rate limits, invitation binding and kick bans.
 * Next.js only writes the socket address into X-Forwarded-For when the request has none (`??=`), so
 * without a proxy every entry of that header may come from the client. It is therefore trusted
 * only when GUEPARD_TRUST_PROXY declares how many proxies append to it (the entry is then counted from
 * the right), and GUEPARD_CLIENT_IP_HEADER names a header the platform always overwrites (e.g. X-Real-IP).
 * Route handlers expose no socket address, so with neither setting every request shares one conservative
 * bucket: limits are stricter, never bypassable. Production start-up warns about it (see instrumentation.ts).
 * IPv6 addresses are reduced to their /64 prefix.
 */
export function clientAddress(request?:Request){
 if(!request)return unknownAddress;
 const header=process.env.GUEPARD_CLIENT_IP_HEADER?.trim();
 if(header){const address=normalizeAddress(request.headers.get(header));if(address)return address}
 const hops=trustedHops();if(hops===undefined)return unknownAddress;
 const chain=(request.headers.get('x-forwarded-for')||'').split(',').map(entry=>entry.trim()).filter(Boolean);
 return (chain.length>=hops&&normalizeAddress(chain[chain.length-hops]))||unknownAddress;
}
/** Configuration problem that makes every client share one fingerprint in production, if any. */
export function clientAddressWarning(){
 if(process.env.NODE_ENV!=='production'||process.env.GUEPARD_CLIENT_IP_HEADER?.trim())return undefined;
 const raw=process.env.GUEPARD_TRUST_PROXY?.trim();
 if(raw&&trustedHops()!==undefined)return undefined;
 return (raw?`GUEPARD_TRUST_PROXY="${raw}" est invalide (entier de 1 à 10 attendu).`:'Aucun proxy déclaré.')
  +' X-Forwarded-For est ignoré car un client peut l’écrire : tous les visiteurs partagent une seule empreinte IP (limite de codes, invitations, expulsions).'
  +' Définissez GUEPARD_CLIENT_IP_HEADER (en-tête écrasé par la plateforme, ex. X-Real-IP sur Railway) ou GUEPARD_TRUST_PROXY=<nombre de proxys>. Voir docs/deploiement-railway.md.';
}
export function warnAboutClientAddress(){const warning=clientAddressWarning();if(warning)console.warn('[guepard] AVERTISSEMENT configuration IP client : '+warning)}
export async function requestIpHash(request?:Request){
 return createHmac('sha256',await guestSecret()).update(clientAddress(request)).digest('hex');
}
