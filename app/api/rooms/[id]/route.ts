import {get,mutate} from '../../../../src/server/room-service';
import {body,bearer,failure,input} from '../../../../src/server/http';
import {roomIdentity} from '../../../../src/server/room-identity';
import {roomActionSchema,roomIdSchema} from '../../../../src/server/schemas';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(r:Request,c:Context){try{const id=input(roomIdSchema,(await c.params).id);return Response.json({room:await get(id,bearer(r))},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
export async function POST(r:Request,c:Context){
 try{
  const id=input(roomIdSchema,(await c.params).id),action=await body(r,roomActionSchema);
  return Response.json(await mutate(id,bearer(r),action.action==='join'?await roomIdentity(action,r):action));
 }catch(e){return failure(e)}
}
