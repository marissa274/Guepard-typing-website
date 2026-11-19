/** @jest-environment node */
import {beforeEach,expect,jest,test} from '@jest/globals';
import * as roomService from '../src/server/room-service';
import * as authStore from '../src/server/auth-store';
import * as roomIdentity from '../src/server/room-identity';
import * as resultStore from '../src/server/result-store';
import {POST as roomsPost,GET as roomsGet} from '../app/api/rooms/route';
import {POST as roomPost,GET as roomGet} from '../app/api/rooms/[id]/route';
import {POST as authPost} from '../app/api/auth/route';
import {POST as avatarPost} from '../app/api/auth/avatar/route';
import {GET as resultsGet} from '../app/api/results/route';
import {GET as resultGet} from '../app/api/results/[id]/route';
import {GET as avatarGet} from '../app/api/avatars/[id]/route';
import {GET as providerGet} from '../app/api/auth/[provider]/route';

jest.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:'session-token'}),set:()=>undefined})}));
jest.mock('../src/server/room-service',()=>({create:jest.fn(),listRooms:jest.fn(async()=>[]),resolveCode:jest.fn(),quickJoin:jest.fn(),leaveCurrent:jest.fn(),get:jest.fn(),mutate:jest.fn(async()=>({ok:true}))}));
jest.mock('../src/server/room-identity',()=>({roomIdentity:jest.fn(async(input:Record<string,unknown>)=>({...input,identityKey:'guest:g'}))}));
jest.mock('../src/server/guest-identity',()=>({requestIpHash:async()=>'ip'}));
jest.mock('../src/server/guest-account-transition',()=>({adoptCurrentGuest:async()=>undefined}));
jest.mock('../src/server/result-store',()=>({listResults:jest.fn(),getResult:jest.fn()}));
jest.mock('../src/server/auth-store',()=>({...jest.requireActual<typeof import('../src/server/auth-error')>('../src/server/auth-error'),
 currentUser:jest.fn(async()=>({id:'u1',username:'Jungle',avatar:'cheetah'})),requireAccount:jest.fn(async()=>({id:'u1',username:'Jungle',avatar:'cheetah'})),
 signup:jest.fn(),login:jest.fn(),logout:jest.fn(),updateProfile:jest.fn(),changePassword:jest.fn(),putAvatar:jest.fn(),removeAvatar:jest.fn(),readAvatar:jest.fn(async()=>null),sessionMaxAge:60}));

const service=jest.mocked(roomService),auth=jest.mocked(authStore),identity=jest.mocked(roomIdentity),results=jest.mocked(resultStore);
const json=(url:string,payload:unknown,headers:Record<string,string>={})=>new Request('http://localhost:5173'+url,{method:'POST',body:JSON.stringify(payload),headers:{'Content-Type':'application/json',...headers}});
const params=<T,>(value:T)=>({params:Promise.resolve(value)});
async function error(response:Response){return {status:response.status,body:await response.json() as {error?:string}}}
beforeEach(()=>{jest.clearAllMocks()});

test('room actions are validated before reaching the room service',async()=>{
 expect(await error(await roomPost(json('/api/rooms/r',{action:'progress',value:5}),params({id:'r'})))).toEqual({status:400,body:{error:'Saisie invalide.'}});
 expect(await error(await roomPost(json('/api/rooms/r',{action:'teleport'}),params({id:'r'})))).toEqual({status:400,body:{error:'Action inconnue.'}});
 expect(await error(await roomPost(json('/api/rooms/r',{action:'settings',settings:{capacity:'8'}}),params({id:'r'})))).toEqual({status:400,body:{error:'La capacité doit être comprise entre 2 et 30.'}});
 expect(service.mutate).not.toHaveBeenCalled();
 expect((await roomPost(json('/api/rooms/'+'x'.repeat(300),{action:'leave'}),params({id:'x'.repeat(300)}))).status).toBe(404);
 expect(service.mutate).not.toHaveBeenCalled();
});
test('a valid room action reaches the service stripped of forged identity fields',async()=>{
 const response=await roomPost(json('/api/rooms/r',{action:'kick',personId:'p',identityKey:'user:admin',ipHash:'forged'},{Authorization:'Bearer member-token'}),params({id:'r'}));
 expect(response.status).toBe(200);
 expect(service.mutate).toHaveBeenCalledWith('r','member-token',{action:'kick',personId:'p'});
 await roomPost(json('/api/rooms/r',{action:'join',nickname:'Sam',code:null,kind:'demo'}),params({id:'r'}));
 expect(identity.roomIdentity).toHaveBeenCalledWith({action:'join',nickname:'Sam',code:undefined,invite:undefined},expect.any(Request));
});
test('room GET validates the path id and ignores malformed bearer headers',async()=>{
 await roomGet(new Request('http://localhost:5173/api/rooms/r',{headers:{Authorization:'Basic abc'}}),params({id:'r'}));
 expect(service.get).toHaveBeenCalledWith('r','');
});
test('room creation, resolution and filters are validated',async()=>{
 expect(await error(await roomsPost(json('/api/rooms',{name:'Salon',animal:'dragon'})))).toEqual({status:400,body:{error:'Choisissez un animal pour la course.'}});
 expect(await error(await roomsPost(json('/api/rooms',{action:'resolve',code:12})))).toEqual({status:400,body:{error:'Code invalide.'}});
 expect(service.create).not.toHaveBeenCalled();expect(service.resolveCode).not.toHaveBeenCalled();
 expect(await error(await roomsGet(new Request('http://localhost:5173/api/rooms?language=DE')))).toEqual({status:400,body:{error:'Filtres invalides.'}});
 expect(service.listRooms).not.toHaveBeenCalled();
});
test('account commands are validated with their historical messages and statuses',async()=>{
 expect(await error(await authPost(json('/api/auth',{action:'signup',username:'Jungle',password:'demo-secret',confirmation:'other',avatar:'cheetah'})))).toEqual({status:400,body:{error:'Les mots de passe ne correspondent pas.'}});
 expect(await error(await authPost(json('/api/auth',{action:'login',username:'Jungle',password:12345678})))).toEqual({status:401,body:{error:'Nom d’utilisateur ou mot de passe incorrect.'}});
 expect(await error(await authPost(json('/api/auth',{action:'grant-admin'})))).toEqual({status:400,body:{error:'Action inconnue.'}});
 expect(auth.signup).not.toHaveBeenCalled();expect(auth.login).not.toHaveBeenCalled();
});
test('upload fields and Content-Length are validated',async()=>{
 const form=new FormData();form.set('photo','not a file');
 expect(await error(await avatarPost(new Request('http://localhost:5173/api/auth/avatar',{method:'POST',body:form})))).toEqual({status:400,body:{error:'Choisissez une photo.'}});
 expect(auth.putAvatar).not.toHaveBeenCalled();
});
test('history pagination, result ids, avatar ids and providers are validated',async()=>{
 expect(await error(await resultsGet(new Request('http://localhost:5173/api/results?page=abc')))).toEqual({status:400,body:{error:'Pagination invalide.'}});
 expect(results.listResults).not.toHaveBeenCalled();
 expect((await resultGet(new Request('http://localhost:5173/api/results/x'),params({id:'x'.repeat(201)}))).status).toBe(404);
 expect(results.getResult).not.toHaveBeenCalled();
 expect((await avatarGet(new Request('http://localhost:5173/api/avatars/x'),params({id:'../../etc'}))).status).toBe(404);
 expect(auth.readAvatar).not.toHaveBeenCalled();
 expect((await providerGet(new Request('http://localhost:5173/api/auth/gitlab'),params({provider:'gitlab'}))).status).toBe(404);
});
