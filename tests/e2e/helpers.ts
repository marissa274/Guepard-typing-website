import {expect,type APIRequestContext,type Page,type PlaywrightWorkerArgs} from '@playwright/test';
import type {RoomView} from '../../src/lib/room-types';
let sequence=0;
export async function ensureAccount(request:APIRequestContext){
 const current=await request.get('/api/auth');const account=await current.json();
 if(account.user)return account.user as {id:string;username:string};
 const username='E2E'+Date.now().toString(36)+(sequence++),password='GuepardE2E42!';
 const result=await request.post('/api/auth',{data:{action:'signup',username,password,confirmation:password,avatar:'cheetah'}});expect(result.ok()).toBeTruthy();return (await result.json()).user as {id:string;username:string};
}
export async function createTestRoom(request:APIRequestContext,patch:Record<string,unknown>={}){
 await ensureAccount(request);
 const response=await request.post('/api/rooms',{data:{name:'Course test '+Date.now(),animal:'cheetah',visibility:'public',...patch}});expect(response.ok()).toBeTruthy();
 return await response.json() as {room:RoomView;token:string};
}
export const memberHeaders=(token:string)=>({Authorization:'Bearer '+token});
export async function configureShortRace(request:APIRequestContext,id:string,token:string,text='La jungle est calme.'){
 const response=await request.post('/api/rooms/'+id,{headers:memberHeaders(token),data:{action:'settings',settings:{textType:'custom',customText:text,timeLimit:30,bonuses:false}}});expect(response.ok()).toBeTruthy();
}
export async function waitForRace(request:APIRequestContext,id:string,token:string){
 await expect.poll(async()=>{const result=await request.get('/api/rooms/'+id,{headers:memberHeaders(token)});return (await result.json()).room.phase},{timeout:6000}).toBe('running');
 return (await (await request.get('/api/rooms/'+id,{headers:memberHeaders(token)})).json()).room as RoomView;
}
export async function sendProgress(request:APIRequestContext,id:string,token:string,value:string,previous=''){
 for(let length=previous.length+4;length<value.length+4;length+=4){const prefix=value.slice(0,Math.min(length,value.length));const response=await request.post('/api/rooms/'+id,{headers:memberHeaders(token),data:{action:'progress',value:prefix,typed:prefix.length}});expect(response.ok(),await response.text()).toBeTruthy();if(prefix.length<value.length)await new Promise(resolve=>setTimeout(resolve,180))}
}
export async function guestContext(playwright:PlaywrightWorkerArgs['playwright'],baseURL:string|undefined,id:string,nickname='Invité',access:Record<string,unknown>={}){
 const request=await playwright.request.newContext({baseURL});const result=await request.post('/api/rooms/'+id,{data:{action:'join',nickname,...access}});expect(result.ok(),await result.text()).toBeTruthy();return {request,...await result.json() as {room:RoomView;token:string}};
}

export async function roomCommand(request:APIRequestContext,id:string,token:string,body:Record<string,unknown>){
 const response=await request.post('/api/rooms/'+id,{headers:memberHeaders(token),data:body});
 expect(response.ok(),await response.text()).toBeTruthy();
 return await response.json() as {room:RoomView;left?:boolean};
}
export async function readRoom(request:APIRequestContext,id:string,token:string){
 const response=await request.get('/api/rooms/'+id,{headers:memberHeaders(token)});
 expect(response.ok(),await response.text()).toBeTruthy();
 return (await response.json()).room as RoomView;
}
export async function openLobby(page:Page,id:string,token:string){
 await page.goto('/');
 await page.evaluate(({id,token})=>sessionStorage.setItem('guepard-room-'+id,token),{id,token});
 await page.goto('/lobby/'+id);
}
export async function closeRoom(request:APIRequestContext,id:string,token:string){
 await request.post('/api/rooms/'+id,{headers:memberHeaders(token),data:{action:'close'}});
}
/** Waits until React has hydrated the page (a pre-hydration fill would be wiped by the controlled input). */
export async function waitForHydration(page:Page,selector='#auth-username'){
 await page.waitForFunction(query=>{const element=document.querySelector(query);return Boolean(element)&&Object.keys(element!).some(key=>key.startsWith('__reactProps$'))},selector);
}
