import {create,mutate,quickJoin,resolveCode,listRooms,leaveCurrent,adoptGuestMembership} from '../src/server/room-service';
import type {Room,RoomView} from '../src/lib/room-types';
type Data=Record<string,Room>;
let mockData:Data={};
jest.mock('../src/server/room-store',()=>({transaction:jest.fn(async<T,>(fn:(data:Data)=>T|Promise<T>)=>{const copy=JSON.parse(JSON.stringify(mockData)) as Data;const result=await fn(copy);mockData=copy;return result})}));
/** Stored room (server side), failing loudly when the test expects it to exist. */
function stored(id:string):Room{const room=mockData[id];if(!room)throw new Error('room missing');return room}
/** Narrow a create/join reply to an admission carrying a member token. */
async function admitted(pending:ReturnType<typeof mutate>|ReturnType<typeof create>):Promise<{room:RoomView;token:string}>{
 const result=await pending;
 if(!('token' in result)||typeof result.token!=='string'||!('room' in result)||!result.room)throw new Error('admission expected');
 return {room:result.room,token:result.token};
}
async function invitationOf(pending:ReturnType<typeof mutate>){const result=await pending;if(!('invitation' in result)||!result.invitation)throw new Error('invitation expected');return result.invitation}
async function roomOf(pending:ReturnType<typeof mutate>|ReturnType<typeof quickJoin>):Promise<RoomView>{const result=await pending;if(!('room' in result)||!result.room)throw new Error('room expected');return result.room}
jest.mock('../src/server/code-rate-limit',()=>({consumeCodeAttempt:jest.fn().mockResolvedValue(undefined)}),{virtual:true});
jest.mock('../src/server/text-corpus',()=>({prepareConfiguredText:jest.fn().mockResolvedValue('La jungle ouvre ses longues pistes aux animaux curieux.')}),{virtual:true});
const account=(id='host')=>({nickname:id,kind:'demo',userId:id,identityKey:'user:'+id,ipHash:'ip-'+id,avatar:'cheetah',name:'Ma course',animal:'cheetah',visibility:'public'});
const guest=(id='guest',ip='ip-guest')=>({nickname:id,kind:'guest',identityKey:'guest:'+id,ipHash:ip,avatar:'cheetah'});
beforeEach(()=>{mockData={}});

test('signing in adopts the existing guest membership instead of allowing a second lobby',async()=>{
 const created=await admitted(create(account()));
 const joined=await admitted(mutate(created.room.id,'',{...guest(),action:'join'}));
 await adoptGuestMembership({id:'signed-in',username:'SignedIn',avatar:'cheetah'},'guest');
 const member=stored(created.room.id).people.find(person=>person.id===joined.room.me);
 expect(member).toMatchObject({identityKey:'user:signed-in',userId:'signed-in',kind:'demo',name:'SignedIn'});
 await expect(create(account('signed-in'))).rejects.toMatchObject({status:409,roomId:created.room.id});
 const again=await admitted(mutate(created.room.id,'',{...account('signed-in'),action:'join'}));
 expect(again.token).toBe(joined.token);expect(again.room.people).toHaveLength(2);
});

test('only accounts can create and all new room codes contain six unambiguous characters',async()=>{
 await expect(create({...guest(),name:'Interdit',animal:'cheetah'})).rejects.toMatchObject({status:403});
 const created=await admitted(create({...account(),capacity:2}));
 expect(created.room.code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
 expect(created.room.settings.capacity).toBe(2);
});
test('a stable identity rejoins without duplication and cannot join another room',async()=>{
 const first=await admitted(create(account())),second=await admitted(create(account('other')));
 const joined=await admitted(mutate(first.room.id,'',{...guest(),action:'join'}));
 const again=await admitted(mutate(first.room.id,'',{...guest(),action:'join'}));
 expect(again.token).toBe(joined.token);expect(again.room.people).toHaveLength(2);
 await expect(mutate(second.room.id,'',{...guest(),action:'join'})).rejects.toMatchObject({status:409,code:'ROOM_MEMBERSHIP_CONFLICT',roomId:first.room.id});
});
test('capacity includes bots and excludes spectators, and may not be lowered below occupancy',async()=>{
 const created=await admitted(create(account()));
 await mutate(created.room.id,created.token,{action:'settings',settings:{capacity:2}});
 await mutate(created.room.id,created.token,{action:'bot'});
 await expect(mutate(created.room.id,'',{...guest(),action:'join'})).rejects.toMatchObject({status:409});
 const bot=stored(created.room.id).people.find(p=>p.kind==='bot');if(!bot)throw new Error('bot expected');
 await mutate(created.room.id,created.token,{action:'role',personId:bot.id,role:'spectator'});
 await mutate(created.room.id,'',{...guest(),action:'join'});
 await expect(mutate(created.room.id,created.token,{action:'role',personId:bot.id,role:'player'})).rejects.toMatchObject({status:409});
});
test('host departure transfers to the oldest active human and explicit close remains host-only',async()=>{
 const created=await admitted(create(account()));
 const joined=await admitted(mutate(created.room.id,'',{...account('next'),action:'join'}));
 await expect(mutate(created.room.id,joined.token,{action:'close'})).rejects.toMatchObject({status:403});
 await mutate(created.room.id,created.token,{action:'leave'});
 expect(stored(created.room.id).hostId).toBe(joined.room.me);
 await mutate(created.room.id,joined.token,{action:'close'});
 expect(mockData[created.room.id]).toBeUndefined();
});
test('kicked identities cannot return and private invitations bind to their first identity and IP',async()=>{
 const created=await admitted(create({...account(),visibility:'private'}));
 const invitation=await invitationOf(mutate(created.room.id,created.token,{action:'invite'}));
 const joined=await admitted(mutate(created.room.id,'',{...guest(),action:'join',invite:invitation.token}));
 await expect(mutate(created.room.id,'',{...guest('intruder'),action:'join',invite:invitation.token})).rejects.toMatchObject({status:403});
 await mutate(created.room.id,joined.token,{action:'leave'});
 const rejoined=await admitted(mutate(created.room.id,'',{...guest(),action:'join',invite:invitation.token}));
 await mutate(created.room.id,created.token,{action:'kick',personId:rejoined.room.me});
 await expect(mutate(created.room.id,'',{...guest(),action:'join',invite:invitation.token})).rejects.toMatchObject({status:403});
});

test('a reused invitation cannot recover an existing member from another IP',async()=>{
 const created=await admitted(create({...account(),visibility:'private'}));
 const invitation=await invitationOf(mutate(created.room.id,created.token,{action:'invite'}));
 await mutate(created.room.id,'',{...guest(),action:'join',invite:invitation.token});
 await expect(mutate(created.room.id,'',{...guest('guest','other-ip'),action:'join',invite:invitation.token})).rejects.toMatchObject({status:403});
});

test('joining with an unrecognized role is rejected instead of silently becoming a player',async()=>{
 const created=await admitted(create(account()));
 await expect(mutate(created.room.id,'',{...guest(),action:'join',role:'administrator'})).rejects.toMatchObject({status:400});
});
test('new members are refused during countdown/running, while completed races can be joined',async()=>{
 const created=await admitted(create(account()));
 for(const phase of ['countdown','running'] as const){stored(created.room.id).phase=phase;await expect(mutate(created.room.id,'',{...guest(),action:'join'})).rejects.toMatchObject({status:409})}
 stored(created.room.id).phase='finished';
 expect((await roomOf(mutate(created.room.id,'',{...guest(),action:'join'}))).phase).toBe('finished');
});
test('quick join chooses the closest capacity then oldest room, and never creates rooms automatically',async()=>{
 await expect(quickJoin(guest())).rejects.toMatchObject({status:404,code:'QUICK_JOIN_EMPTY',canCreate:false});
 await expect(quickJoin(account())).rejects.toMatchObject({status:404,canCreate:true});
 const older=await admitted(create(account('older')));await create(account('newer'));
 stored(older.room.id).createdAt=Date.now()-5000;
 expect((await quickJoin(guest())).room.id).toBe(older.room.id);
 expect((await resolveCode(older.room.code,'ip')).id).toBe(older.room.id);
 expect((await listRooms()).find(r=>r.id===older.room.id)).toMatchObject({capacity:8,host:'older',complexity:'medium'});
});
test('a signed identity can leave its current room from another tab without a member bearer',async()=>{
 const first=await admitted(create(account())),other=await admitted(create(account('other')));
 await mutate(first.room.id,'',{...guest(),action:'join'});
 expect(await leaveCurrent(guest())).toEqual({left:true});
 expect((await roomOf(mutate(other.room.id,'',{...guest(),action:'join'}))).id).toBe(other.room.id);
});
