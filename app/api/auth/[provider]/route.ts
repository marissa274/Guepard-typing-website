import {NextResponse} from 'next/server';
import {startOAuth} from '../../../../src/server/oauth-flow';
import {oauthProviderSchema,oauthStartQuerySchema} from '../../../../src/server/schemas';
import {AuthError} from '../../../../src/server/auth-error';
import {authCookieOptions,oauthCookie} from '../../../../src/server/auth-cookies';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{provider:string}>}){
 const parsed=oauthProviderSchema.safeParse((await params).provider);
 if(!parsed.success)return NextResponse.json({error:'Fournisseur inconnu.'},{status:404});
 const provider=parsed.data,url=new URL(request.url),query=oauthStartQuerySchema.safeParse({format:url.searchParams.get('format')});
 try{
  const result=await startOAuth(provider,url.origin);
  const response=query.success&&query.data.format==='json'?NextResponse.json({kind:'redirect',url:result.url}):NextResponse.redirect(result.url);
  response.cookies.set(oauthCookie(provider),result.state,{...authCookieOptions,maxAge:600});
  response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');
  return response;
 }catch(error){return NextResponse.json({error:error instanceof AuthError?error.message:'La connexion est indisponible. Réessayez.'},{status:error instanceof AuthError?error.status:503})}
}
