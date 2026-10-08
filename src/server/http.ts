import {isAllowedOrigin} from './request-origin';
import {RoomError} from './room-engine';
export function bearer(r:Request){return r.headers.get('authorization')?.replace(/^Bearer /,'')||''}
export function failure(e:unknown){return Response.json({error:e instanceof RoomError?e.message:'Le serveur ne peut pas répondre. Réessayez.'},{status:e instanceof RoomError?e.status:500})}
export async function body(r:Request){if(!isAllowedOrigin(r))throw new RoomError('Origine non autorisée.',403);const raw=await r.text();if(raw.length>24000)throw new RoomError('Requête trop volumineuse.',413);try{const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data}catch{throw new RoomError('Requête invalide.')}}
