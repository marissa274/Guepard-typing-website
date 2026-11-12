import {cookies} from 'next/headers';
import {currentUser} from '../../../../src/server/auth-store';
import {getResult} from '../../../../src/server/result-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
 try{
  const user=await currentUser((await cookies()).get('guepard_session')?.value);
  if(!user)return Response.json({error:'Connectez-vous pour consulter vos résultats.'},{status:401});
  const {id}=await context.params;
  if(id.length>200)return Response.json({error:'Résultat introuvable.'},{status:404});
  const room=await getResult(user.id,id);
  if(!room)return Response.json({error:'Résultat introuvable.'},{status:404});
  return Response.json({room},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Ce résultat est temporairement indisponible.'},{status:503})}
}
