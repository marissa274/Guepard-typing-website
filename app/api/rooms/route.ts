import {create,listRooms,resolveCode} from '../../../src/server/room-service';
import {body,failure} from '../../../src/server/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json({rooms:await listRooms()},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
export async function POST(request:Request){try{const input=await body(request);return Response.json(input.action==='resolve'?await resolveCode(String(input.code||'')):await create(input))}catch(e){return failure(e)}}
