import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {AuthError} from './auth-error';
import {saveOAuthState,consumeOAuthState,loginWithOAuth,type OAuthProvider} from './oauth-store';

const endpoints={
 github:{authorize:'https://github.com/login/oauth/authorize',token:'https://github.com/login/oauth/access_token',profile:'https://api.github.com/user',scope:'',pkce:true},
 discord:{authorize:'https://discord.com/oauth2/authorize',token:'https://discord.com/api/oauth2/token',profile:'https://discord.com/api/v10/users/@me',scope:'identify',pkce:false},
} as const;
export function isOAuthProvider(value:string):value is OAuthProvider{return value==='github'||value==='discord'}
function configuration(value:string){
 if(!isOAuthProvider(value))throw new AuthError('Fournisseur inconnu.');
 const prefix=value.toUpperCase(),id=process.env[prefix+'_CLIENT_ID'],secret=process.env[prefix+'_CLIENT_SECRET'];
 if(!id||!secret)throw new AuthError(`La connexion avec ${value==='github'?'GitHub':'Discord'} n’est pas encore configurée.`,503);
 return {provider:value,id,secret,...endpoints[value]};
}
export function oauthPublicOrigin(requestOrigin:string){
 const configured=process.env.APP_URL||(process.env.RAILWAY_PUBLIC_DOMAIN?`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`:undefined);
 if(process.env.NODE_ENV==='production'&&!configured)throw new AuthError('Définissez APP_URL pour la connexion OAuth.',503);
 const url=new URL(configured||requestOrigin);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new AuthError('URL de connexion invalide.',503);
 if(process.env.NODE_ENV==='production'&&url.protocol!=='https:')throw new AuthError('La connexion OAuth exige HTTPS en production.',503);
 return url.origin;
}
export async function startOAuth(provider:string,requestOrigin:string){
 const config=configuration(provider),state=randomBytes(32).toString('base64url'),verifier=config.pkce?randomBytes(32).toString('base64url'):'';
 const redirectUri=oauthPublicOrigin(requestOrigin)+`/api/auth/${config.provider}/callback`,url=new URL(config.authorize);
 url.searchParams.set('client_id',config.id);url.searchParams.set('redirect_uri',redirectUri);url.searchParams.set('response_type','code');url.searchParams.set('state',state);
 if(config.scope)url.searchParams.set('scope',config.scope);
 if(config.pkce){url.searchParams.set('code_challenge_method','S256');url.searchParams.set('code_challenge',createHash('sha256').update(verifier).digest('base64url'))}
 await saveOAuthState(state,config.provider,verifier,redirectUri);
 return {url:url.toString(),state};
}
function sameState(received:string|undefined,cookie:string|undefined){
 if(!received||!cookie||received.length>128||cookie.length>128)return false;
 const expected=Buffer.from(cookie),actual=Buffer.from(received);return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
function record(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new AuthError('Réponse du fournisseur invalide.',502);return value as Record<string,unknown>}
async function providerJson(url:string,options:RequestInit){
 const response=await fetch(url,{...options,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10_000)});
 if(!response.ok)throw new AuthError('Le fournisseur ne peut pas terminer la connexion. Réessayez.',502);
 return record(await response.json());
}
export async function finishOAuth(provider:string,query:{state?:string;code?:string;error?:string},cookie:string|undefined){
 const config=configuration(provider);
 if(!sameState(query.state,cookie))throw new AuthError('La connexion est invalide ou a expiré. Réessayez.');
 const attempt=await consumeOAuthState(query.state!,config.provider);
 if(query.error||!query.code||query.code.length>2048)throw new AuthError('La connexion a été annulée ou refusée.');
 const body=new URLSearchParams({client_id:config.id,client_secret:config.secret,code:query.code,redirect_uri:attempt.redirect_uri,grant_type:'authorization_code'});
 if(config.pkce)body.set('code_verifier',attempt.verifier);
 const tokens=await providerJson(config.token,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body});
 if(typeof tokens.access_token!=='string'||!tokens.access_token||String(tokens.token_type).toLowerCase()!=='bearer')throw new AuthError('Réponse du fournisseur invalide.',502);
 const profile=await providerJson(config.profile,{headers:{Accept:'application/json',Authorization:`Bearer ${tokens.access_token}`,'User-Agent':'Guepard-Typing'}});
 const id=typeof profile.id==='string'?profile.id:typeof profile.id==='number'&&Number.isSafeInteger(profile.id)?String(profile.id):'';
 const username=config.provider==='github'?profile.login:profile.username;
 if(!/^\d{1,30}$/.test(id)||typeof username!=='string'||!username||username.length>200)throw new AuthError('Identité du fournisseur invalide.',502);
 return loginWithOAuth(config.provider,id,username);
}
