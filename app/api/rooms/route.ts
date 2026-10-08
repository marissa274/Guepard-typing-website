import {create,listRooms,resolveCode,quickJoin} from '../../../src/server/room-service';
import {body,failure} from '../../../src/server/http';
import {roomIdentity} from '../../../src/server/room-identity';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json({rooms:await listRooms()},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
export async function POST(request:Request){try{const input=await body(request);return Response.json(input.action==='resolve'?await resolveCode(String(input.code||'')):input.action==='quick'?await quickJoin(await roomIdentity(input)):await create(await roomIdentity(input)))}catch(e){return failure(e)}}
