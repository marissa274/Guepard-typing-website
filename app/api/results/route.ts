import {cookies} from 'next/headers';
import {currentUser} from '../../../src/server/auth-store';
import {listResults} from '../../../src/server/result-store';
import {resultsQuerySchema} from '../../../src/server/schemas';
export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request:Request){
 try{
  const user=await currentUser((await cookies()).get('guepard_session')?.value);
  if(!user)return Response.json({error:'Connectez-vous pour consulter votre historique.'},{status:401});
  const params=new URL(request.url).searchParams,query=resultsQuerySchema.safeParse({page:params.get('page'),pageSize:params.get('pageSize')});
  if(!query.success)return Response.json({error:'Pagination invalide.'},{status:400});
  return Response.json(await listResults(user.id,query.data.page,query.data.pageSize),{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Votre historique est temporairement indisponible.'},{status:503})}
}
