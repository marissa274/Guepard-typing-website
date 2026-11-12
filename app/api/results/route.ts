import {cookies} from 'next/headers';
import {currentUser} from '../../../src/server/auth-store';
import {listResults} from '../../../src/server/result-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request:Request){
 try{
  const user=await currentUser((await cookies()).get('guepard_session')?.value);
  if(!user)return Response.json({error:'Connectez-vous pour consulter votre historique.'},{status:401});
  const params=new URL(request.url).searchParams;
  const page=Number(params.get('page')||1),pageSize=Number(params.get('pageSize')||10);
  if(!Number.isSafeInteger(page)||page<1||page>100000||!Number.isInteger(pageSize)||pageSize<1||pageSize>50)return Response.json({error:'Pagination invalide.'},{status:400});
  return Response.json(await listResults(user.id,page,pageSize),{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Votre historique est temporairement indisponible.'},{status:503})}
}
