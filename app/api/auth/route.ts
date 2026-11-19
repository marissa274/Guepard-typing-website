import {isAllowedOrigin} from '../../../src/server/request-origin';
import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {currentUser,login,logout,signup,updateProfile,changePassword,AuthError,sessionMaxAge} from '../../../src/server/auth-store';
import {adoptCurrentGuest} from '../../../src/server/guest-account-transition';
import {leaveCurrent} from '../../../src/server/room-service';
import {readLimitedBody} from '../../../src/server/request-body';
import {authCommandSchema,parseInput,type AuthCommand} from '../../../src/server/schemas';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const cookieName='guepard_session';
const cookieOptions={httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production',path:'/'};
async function command(request:Request):Promise<AuthCommand>{
 const bytes=await readLimitedBody(request.body,16*1024);
 let parsed:unknown;
 try{parsed=JSON.parse(bytes.toString('utf8'))}catch{throw new AuthError('Requête invalide.')}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new AuthError('Requête invalide.');
 return parseInput(authCommandSchema,parsed,issue=>new AuthError(issue.message,issue.status));
}

export async function GET(_request:Request){
 try{const token=(await cookies()).get(cookieName)?.value;
  const user=await currentUser(token);return NextResponse.json({user:user||null},{headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({user:null,error:'La base de données est indisponible.'},{status:503})}
}
export async function POST(request:Request){
 if(!isAllowedOrigin(request))return NextResponse.json({error:'Origine non autorisée.'},{status:403});
 try{
  const body=await command(request);
  if(body.action==='profile'){
   const token=(await cookies()).get(cookieName)?.value;
   return NextResponse.json({user:await updateProfile(token,body)});
  }
  if(body.action==='password'){
   const token=(await cookies()).get(cookieName)?.value;
   await changePassword(token,body);return NextResponse.json({ok:true});
  }
  if(body.action==='logout'){
   const token=(await cookies()).get(cookieName)?.value;
   const user=await currentUser(token);if(user)await leaveCurrent({identityKey:'user:'+user.id});await logout(token);const response=NextResponse.json({user:null});response.cookies.delete(cookieName);return response;
  }
  const result=body.action==='signup'?await signup(body):await login(body);
  await adoptCurrentGuest(result.user);
  const response=NextResponse.json({user:result.user});
  response.cookies.set(cookieName,result.token,{...cookieOptions,maxAge:sessionMaxAge});
  return response;
 }catch(error){const known=error instanceof AuthError;return NextResponse.json({error:known?error.message:'Le serveur ne peut pas répondre. Réessayez.'},{status:known?error.status:503})}
}
