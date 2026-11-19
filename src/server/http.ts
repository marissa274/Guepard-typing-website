import type {z} from 'zod';
import {isAllowedOrigin} from './request-origin';
import {RoomError} from './room-engine';
import {RoomAccessError} from './room-access';
import {readLimitedBody} from './request-body';
import {bearerSchema,parseInput} from './schemas';
/** Jeton de salon lu dans `Authorization: Bearer …` ; un en-tête malformé équivaut à l'absence de jeton. */
export function bearer(r:Request){const parsed=bearerSchema.safeParse(r.headers.get('authorization'));return parsed.success?parsed.data:''}
export function failure(e:unknown){return Response.json({error:e instanceof RoomError?e.message:'Le serveur ne peut pas répondre. Réessayez.',...(e instanceof RoomAccessError?{code:e.code,roomId:e.roomId,canCreate:e.canCreate}:{})},{status:e instanceof RoomError?e.status:500})}
/** Validate any non-body input (route params, query strings) and report it as a room error. */
export function input<S extends z.ZodType>(schema:S,value:unknown):z.output<S>{return parseInput(schema,value,issue=>new RoomError(issue.message,issue.status))}
/** Read a same-origin JSON body (64 Kio maximum) and validate it against `schema`. */
export async function body<S extends z.ZodType>(r:Request,schema:S):Promise<z.output<S>>{
 if(!isAllowedOrigin(r))throw new RoomError('Origine non autorisée.',403);
 let raw:Buffer;
 try{raw=await readLimitedBody(r.body,64*1024)}catch(error){if(error instanceof Error&&'status'in error&&error.status===413)throw new RoomError(error.message,413);throw error}
 let data:unknown;
 try{data=JSON.parse(raw.toString('utf8'))}catch{throw new RoomError('Requête invalide.')}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new RoomError('Requête invalide.');
 return input(schema,data);
}
