import {create,listRooms,resolveCode,quickJoin,leaveCurrent} from '../../../src/server/room-service';
import {body,failure} from '../../../src/server/http';
import {roomIdentity} from '../../../src/server/room-identity';
import {requestIpHash} from '../../../src/server/guest-identity';
import {RoomError} from '../../../src/server/room-engine';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const filters=new URL(request.url).searchParams,language=filters.get('language')||undefined,complexity=filters.get('complexity')||undefined;if(language&&!['FR','EN'].includes(language)||complexity&&!['easy','medium','hard'].includes(complexity))throw new RoomError('Filtres invalides.');return Response.json({rooms:await listRooms({language,complexity})},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
export async function POST(request:Request){try{const input=await body(request);if(input.action!==undefined&&(typeof input.action!=='string'||!['resolve','quick','create','leave-current'].includes(input.action)))throw new RoomError('Action inconnue.');if(input.action==='resolve'){if(typeof input.code!=='string')throw new RoomError('Code invalide.');return Response.json(await resolveCode(input.code,await requestIpHash(request)))}const verified=await roomIdentity(input,request);return Response.json(input.action==='leave-current'?await leaveCurrent(verified):input.action==='quick'?await quickJoin(verified):await create(verified))}catch(e){return failure(e)}}
