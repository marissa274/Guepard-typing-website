import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {adoptCurrentGuest} from '../../../../../src/server/guest-account-transition';
import {finishOAuth,isOAuthProvider,oauthPublicOrigin} from '../../../../../src/server/oauth-flow';
import {sessionMaxAge} from '../../../../../src/server/auth-store';
import {sessionCookie,authCookieOptions,oauthCookie} from '../../../../../src/server/auth-cookies';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{provider:string}>}){
 const {provider}=await params;
 if(!isOAuthProvider(provider))return NextResponse.json({error:'Fournisseur inconnu.'},{status:404});
 const url=new URL(request.url),store=await cookies();
 let origin:string;
 try{origin=oauthPublicOrigin(url.origin)}catch{return NextResponse.json({error:'La connexion est indisponible. Définissez APP_URL.'},{status:503})}
 try{
  const result=await finishOAuth(provider,{state:url.searchParams.get('state')||undefined,code:url.searchParams.get('code')||undefined,error:url.searchParams.get('error')||undefined},store.get(oauthCookie(provider))?.value);
  await adoptCurrentGuest(result.user);
  const response=NextResponse.redirect(new URL('/races',origin));
  response.cookies.set(sessionCookie,result.token,{...authCookieOptions,maxAge:sessionMaxAge});response.cookies.delete(oauthCookie(provider));response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
 }catch{
  const response=NextResponse.redirect(new URL(`/login?oauth=error&provider=${provider}`,origin));response.cookies.delete(oauthCookie(provider));response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
 }
}
