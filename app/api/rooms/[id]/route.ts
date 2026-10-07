import {get,mutate} from '../../../../src/server/room-service';
import {body,bearer,failure} from '../../../../src/server/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(r:Request,c:Context){try{return Response.json({room:await get((await c.params).id,bearer(r))},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
export async function POST(r:Request,c:Context){try{return Response.json(await mutate((await c.params).id,bearer(r),await body(r)))}catch(e){return failure(e)}}
