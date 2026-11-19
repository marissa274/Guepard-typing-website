import {create,listRooms,resolveCode,quickJoin,leaveCurrent} from '../../../src/server/room-service';
import {body,failure,input} from '../../../src/server/http';
import {roomIdentity} from '../../../src/server/room-identity';
import {requestIpHash} from '../../../src/server/guest-identity';
import {roomFiltersSchema,roomsCommandSchema} from '../../../src/server/schemas';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const params=new URL(request.url).searchParams,filters=input(roomFiltersSchema,{language:params.get('language'),complexity:params.get('complexity')});
  return Response.json({rooms:await listRooms(filters)},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e)}
}
export async function POST(request:Request){
 try{
  const command=await body(request,roomsCommandSchema);
  if(command.action==='resolve')return Response.json(await resolveCode(command.code,await requestIpHash(request)));
  const verified=await roomIdentity(command,request);
  return Response.json(command.action==='leave-current'?await leaveCurrent(verified):command.action==='quick'?await quickJoin(verified):await create(verified));
 }catch(e){return failure(e)}
}
