import {isAllowedOrigin} from './request-origin';
import {RoomError} from './room-engine';
import {RoomAccessError} from './room-access';
import {readLimitedBody} from './request-body';
export function bearer(r:Request){return r.headers.get('authorization')?.replace(/^Bearer /,'')||''}
export function failure(e:unknown){return Response.json({error:e instanceof RoomError?e.message:'Le serveur ne peut pas répondre. Réessayez.',...(e instanceof RoomAccessError?{code:e.code,roomId:e.roomId,canCreate:e.canCreate}:{})},{status:e instanceof RoomError?e.status:500})}
export async function body(r:Request):Promise<Record<string,unknown>>{
 if(!isAllowedOrigin(r))throw new RoomError('Origine non autorisée.',403);
 let raw:Buffer;
 try{raw=await readLimitedBody(r.body,64*1024)}catch(error){if(error instanceof Error&&'status'in error&&error.status===413)throw new RoomError(error.message,413);throw error}
 try{const data:unknown=JSON.parse(raw.toString('utf8'));if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data as Record<string,unknown>}catch{throw new RoomError('Requête invalide.')}
}
