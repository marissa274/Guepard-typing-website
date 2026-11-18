import {clientError} from '../i18n/errors';
import type {Account,Credentials} from '../lib/auth-types';
import {isProfileAnimal} from '../lib/animals';
export function validateCredentials({username,password,confirmation}:Credentials,mode:string){
 const errors:Record<string,string>={};
 if(!username.trim())errors.username='required';
 else if(mode==='signup'&&username.trim().length<3)errors.username='usernameShort';
 if(!password)errors.password='required';
 else if(mode==='signup'&&password.length<8)errors.password='passwordShort';
 if(mode==='signup'&&confirmation!==password)errors.confirmation='mismatch';
 return errors;
}
async function jsonResponse(response:Response):Promise<Record<string,unknown>>{
 const value:unknown=await response.json();
 const result=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 if(!response.ok)throw new Error(clientError(typeof result.error==='string'?result.error:'La connexion a échoué.'));
 return result;
}
function account(value:unknown):Account{
 if(!value||typeof value!=='object')throw new Error('Compte indisponible.');
 const row=value as Record<string,unknown>;
 if(typeof row.id!=='string'||typeof row.username!=='string'||!isProfileAnimal(row.avatar))throw new Error('Compte indisponible.');
 return {id:row.id,username:row.username,avatar:row.avatar,...(typeof row.avatarUrl==='string'?{avatarUrl:row.avatarUrl}:{})};
}
async function request(body:Record<string,unknown>){return jsonResponse(await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)}))}
async function accountRequest(body:Record<string,unknown>){const result=await request(body);return {user:account(result.user)}}
type ProviderResult={kind:'redirect';url:string}|{kind:'provider-unavailable';provider:string};
export const authService={
 updateProfile:({username,avatar}:{username:string;avatar:string})=>accountRequest({action:'profile',username,avatar}),
 changePassword:({currentPassword,password,confirmation}:{currentPassword:string;password:string;confirmation:string})=>request({action:'password',currentPassword,password,confirmation}),
 submit:({username,password,confirmation,avatar}:Credentials,mode:string)=>accountRequest({action:mode,username,password,confirmation,avatar}),
 logout:()=>request({action:'logout'}),
 async current(){const result=await jsonResponse(await fetch('/api/auth',{credentials:'same-origin',cache:'no-store'}));return {user:result.user?account(result.user):null}},
 async provider(name:string):Promise<ProviderResult>{
  if(!['discord','github'].includes(name))throw new Error('Unsupported provider');
  const result=await jsonResponse(await fetch(`/api/auth/${name}?format=json`,{credentials:'same-origin',cache:'no-store'}));
  if(result.kind!=='redirect'||typeof result.url!=='string')throw new Error('La connexion est indisponible.');
  return {kind:'redirect',url:result.url};
 },
 async uploadPhoto(photo:File){const body=new FormData();body.set('photo',photo);const result=await jsonResponse(await fetch('/api/auth/avatar',{method:'POST',credentials:'same-origin',body}));return {user:account(result.user)}},
 async removePhoto(){const result=await jsonResponse(await fetch('/api/auth/avatar',{method:'DELETE',credentials:'same-origin'}));return {user:account(result.user)}}
};
