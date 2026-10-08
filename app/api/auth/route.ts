import {isAllowedOrigin} from '../../../src/server/request-origin';
import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {currentUser,login,logout,signup,AuthError,sessionMaxAge} from '../../../src/server/auth-store';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const cookieName='guepard_session';
const cookieOptions={httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production',path:'/'};

export async function GET(request:Request){
 try{const token=(await cookies()).get(cookieName)?.value;
  const user=await currentUser(token);return NextResponse.json({user:user||null},{headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({user:null,error:'La base de données est indisponible.'},{status:503})}
}
export async function POST(request:Request){
 if(!isAllowedOrigin(request))return NextResponse.json({error:'Origine non autorisée.'},{status:403});
 try{
  const body=await request.json();
  if(body?.action==='logout'){
   const token=(await cookies()).get(cookieName)?.value;
   await logout(token);const response=NextResponse.json({user:null});response.cookies.delete(cookieName);return response;
  }
  const result=body?.action==='signup'?await signup(body):body?.action==='login'?await login(body):null;
  if(!result)throw new AuthError('Action inconnue.');
  const response=NextResponse.json({user:result.user});
  response.cookies.set(cookieName,result.token,{...cookieOptions,maxAge:sessionMaxAge});
  return response;
 }catch(error){const known=error instanceof AuthError;return NextResponse.json({error:known?error.message:'Le serveur ne peut pas répondre. Réessayez.'},{status:known?error.status:503})}
}
