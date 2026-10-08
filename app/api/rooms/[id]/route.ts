import {get,mutate} from '../../../../src/server/room-service';
import {body,bearer,failure} from '../../../../src/server/http';
import {roomIdentity} from '../../../../src/server/room-identity';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(r:Request,c:Context){try{return Response.json({room:await get((await c.params).id,bearer(r))},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
export async function POST(r:Request,c:Context){try{const input=await body(r);return Response.json(await mutate((await c.params).id,bearer(r),input.action==='join'?await roomIdentity(input):input))}catch(e){return failure(e)}}
