import {afterEach,beforeEach,test,expect,jest} from '@jest/globals';
import {createRoom,joinRoom,act,authenticate,snapshot,generateText,validateSettings,tick} from '../src/server/room-engine';
import {defaultSettings,type Room,type Person} from '../src/lib/room-types';
const input={name:'La jungle',nickname:'Hôte',animal:'parrot',visibility:'semi',kind:'guest'};
let now=1_000_000,clock:ReturnType<typeof jest.spyOn>;
beforeEach(()=>{now=1_000_000;clock=jest.spyOn(Date,'now').mockImplementation(()=>now)});
afterEach(()=>clock.mockRestore());
function room(){return createRoom(input)}
function begin(r:Room,h:Person,text?:string){act(r,h,{action:'start'},text);now+=3000;tick(r)}

test('animal is required, guests have a default avatar, six-character codes avoid ambiguity and tokens stay private',()=>{
 expect(()=>createRoom({...input,animal:'unknown'})).toThrow('animal');const {room:r,person:p}=room();expect(r.animal).toBe('parrot');expect(p.animal).toBe('cheetah');expect(r.code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);expect(JSON.stringify(snapshot(r,p))).not.toContain(p.token);expect(JSON.stringify(snapshot(r,p))).not.toContain('invites');
});
test('capacity permits thirty participants and extra spectators, with host-only settings and roles',()=>{
 const {room:r,person:h}=room();act(r,h,{action:'settings',settings:{capacity:30}});let guest:Person=h;
 for(let i=0;i<29;i++)guest=joinRoom(r,{code:r.code,nickname:'Élève '+i});expect(()=>joinRoom(r,{code:r.code,nickname:'En trop'})).toThrow('complet');
 for(let i=0;i<5;i++)joinRoom(r,{code:r.code,nickname:'Observateur '+i,role:'spectator'});expect(r.people.length).toBe(35);
 for(const action of [{action:'start'},{action:'settings',settings:{length:200}},{action:'role',personId:h.id,role:'spectator'},{action:'kick',personId:h.id},{action:'bot'}])expect(()=>act(r,guest,action)).toThrow('Seul l’hôte');
 act(r,h,{action:'settings',settings:{length:200}});expect(snapshot(r,guest).settings.length).toBe(200);act(r,h,{action:'role',personId:guest.id,role:'spectator'});expect(guest.role).toBe('spectator');
});
test('private invitation is host-only, expiring and single use, and failed admission does not consume it',()=>{
 const {room:r}=createRoom({...input,visibility:'private'});expect(()=>joinRoom(r,{nickname:'Sam',code:r.code})).toThrow('Invitation');
 const invite=()=>{const invitation={token:'invite-'+r.invites.length,expires:Date.now()+30*60*1000,used:false};r.invites.push(invitation);return invitation};
 const invitation=invite();expect(()=>joinRoom(r,{nickname:'',invite:invitation.token})).toThrow('pseudo');expect(invitation.used).toBe(false);
 joinRoom(r,{nickname:'Sam',invite:invitation.token});expect(()=>joinRoom(r,{nickname:'Replay',invite:invitation.token})).toThrow('utilisée');
 const second=invite();second.expires=Date.now()-1;expect(()=>joinRoom(r,{nickname:'Late',invite:second.token})).toThrow('expirée');
});
test('minimum includes a human; arrivals wait for results and become players in the next round',()=>{
 const {room:r,person:h}=room();expect(()=>act(r,h,{action:'start'})).toThrow('deux joueurs');act(r,h,{action:'bot',difficulty:'impossible'});expect(r.people[1].difficulty).toBe('impossible');
 begin(r,h);expect(()=>joinRoom(r,{nickname:'Retardataire',code:r.code})).toThrow('cours');expect(()=>act(r,h,{action:'settings',settings:{length:25}})).toThrow('verrouillés');
 r.phase='finished';r.endedAt=now;const late=joinRoom(r,{nickname:'Retardataire',code:r.code});expect(late.role).toBe('spectator');act(r,h,{action:'reset'});expect(late.role).toBe('player');expect(r.phase).toBe('waiting');
});
test('spectators do not count toward the minimum and removed people lose their token',()=>{
 const {room:r,person:h}=room(),guest=joinRoom(r,{nickname:'Sam',code:r.code});act(r,h,{action:'role',personId:guest.id,role:'spectator'});expect(()=>act(r,h,{action:'start'})).toThrow('deux joueurs');r.people=r.people.filter(x=>x.id!==guest.id);expect(()=>authenticate(r,guest.token!)).toThrow('partie');
});
test('text options and bounds are delegated to the configured generator',()=>{
 const s={...defaultSettings,textType:'words' as const,length:200,numbers:true,specials:true,accents:false,punctuation:false,blacklist:'@'};
 const text=generateText(s);expect(text).not.toMatch(/[@éèà.,]/);expect(text).toMatch(/\d/);expect(generateText({...s,blacklist:'',textType:'custom',customText:'Une très belle rivière!'})).toBe('Une tres belle riviere');expect(()=>validateSettings({...s,length:2})).toThrow('limites');
});
test('reconnection restores only the current player’s input',()=>{
 const {room:r,person:h}=room(),guest=joinRoom(r,{nickname:'Sam',code:r.code});begin(r,h);now+=1000;act(r,h,{action:'progress',value:r.text!.slice(0,12),typed:12});expect(snapshot(r,h).people.find(p=>p.id===h.id)!.input).toBe(r.text!.slice(0,12));expect(snapshot(r,guest).people.find(p=>p.id===h.id)!.input).toBeUndefined();
});
test('rematch is host-only and resets metrics and appearances before another countdown',()=>{
 const {room:r,person:h}=room(),guest=joinRoom(r,{nickname:'Sam',code:r.code});begin(r,h);r.phase='finished';r.endedAt=now;h.progress=50;h.finishedAt=now;
 expect(()=>act(r,guest,{action:'rematch'})).toThrow('Seul l’hôte');act(r,h,{action:'rematch'});expect(r.phase).toBe('countdown');expect(r.endedAt).toBeUndefined();expect(r.people.every(p=>p.progress===0&&!p.finishedAt)).toBe(true);expect(r.startedAt).toBe(now+3000);expect(h.telemetry).toEqual([]);
});
test('bots continue while a human sends frequent valid updates',()=>{
 const {room:r,person:h}=room();act(r,h,{action:'settings',settings:{length:1000}});act(r,h,{action:'bot',difficulty:'medium'});begin(r,h);const bot=r.people.find(p=>p.kind==='bot')!,progress:number[]=[];
 for(let i=1;i<=30;i++){now+=200;act(r,h,{action:'progress',value:r.text!.slice(0,i),typed:i});tick(r);progress.push(bot.progress)}
 expect(progress.at(-1)).toBeGreaterThan(20);expect(progress.every((value,i)=>i===0||value>=progress[i-1])).toBe(true);expect(bot.finishedAt).toBeUndefined();expect(bot.telemetry!.length).toBeGreaterThan(1);
});
test('a late tick cannot advance bots or accept a submission beyond the configured limit',()=>{
 const {room:r,person:h}=room();joinRoom(r,{nickname:'Sam',code:r.code});act(r,h,{action:'bot',difficulty:'noob'});act(r,h,{action:'settings',settings:{timeLimit:30,length:1000}});begin(r,h);now+=40_000;tick(r);
 const bot=r.people.find(p=>p.kind==='bot')!;expect(bot.progress).toBeGreaterThan(0);expect(bot.progress).toBeLessThan(70);expect(bot.finishedAt).toBeUndefined();expect(r.endedAt).toBe(r.startedAt!+30_000);expect(()=>act(r,h,{action:'progress',value:r.text!,typed:r.text!.length})).toThrow('maintenant');
});
test('bots finishing between two polls keep their actual order of arrival',()=>{
 const {room:r,person:h}=room();act(r,h,{action:'settings',settings:{timeLimit:0,length:20}});act(r,h,{action:'bot',difficulty:'beginner'});act(r,h,{action:'bot',difficulty:'impossible'});begin(r,h);now+=300_000;tick(r);
 const slow=r.people[1],fast=r.people[2];expect(fast.finishedAt).toBeLessThan(slow.finishedAt!);expect(fast.finishedAt).toBeGreaterThan(r.startedAt!);expect(slow.finishedAt).toBeLessThan(now);
});
test.each([Infinity,NaN,-1,1.5,'42'])('invalid typed counter %s is rejected',typed=>{
 const {room:r,person:h}=room();joinRoom(r,{nickname:'Sam',code:r.code});begin(r,h);expect(()=>act(r,h,{action:'progress',value:r.text!.slice(0,5),typed})).toThrow('frappes');expect(h.progress).toBe(0);expect(h.typed).toBe(0);
});
test('typing counters remain monotonic across deletion and replacement corrections',()=>{
 const {room:r,person:h}=room();joinRoom(r,{nickname:'Sam',code:r.code});begin(r,h,'abc def ghi');now+=1000;
 act(r,h,{action:'progress',value:'axc',typed:3});expect(h.errors).toBe(1);act(r,h,{action:'progress',value:'abc',typed:3});expect(h.progress).toBe(3);expect(h.typed).toBe(4);expect(h.errors).toBe(1);
 act(r,h,{action:'progress',value:'ab',typed:2});expect(h.typed).toBe(4);act(r,h,{action:'progress',value:'abc',typed:3});expect(h.typed).toBe(5);
});
test('only active racers abandon; a finish cannot be revoked',()=>{
 const {room:r,person:h}=room(),guest=joinRoom(r,{nickname:'Sam',code:r.code}),watcher=joinRoom(r,{nickname:'Regard',code:r.code,role:'spectator'});
 expect(()=>act(r,guest,{action:'abandon'})).toThrow('abandonner');begin(r,h,'abc def ghi');expect(()=>act(r,watcher,{action:'abandon'})).toThrow('abandonner');now+=1000;
 act(r,guest,{action:'progress',value:r.text!,typed:r.text!.length});expect(()=>act(r,guest,{action:'abandon'})).toThrow('abandonner');expect(guest.abandoned).toBe(false);
});
test('a spectator host cannot start a race containing only bots',()=>{
 const {room:r,person:h}=room();act(r,h,{action:'bot',difficulty:'noob'});act(r,h,{action:'bot',difficulty:'expert'});act(r,h,{action:'role',personId:h.id,role:'spectator'});expect(()=>act(r,h,{action:'start'})).toThrow('humain');
});
test('account ownership is internal and never appears in room snapshots',()=>{
 const {room:r,person:h}=createRoom({...input,kind:'demo',userId:'account-123'});expect(h.userId).toBe('account-123');const guest=joinRoom(r,{nickname:'Sam',code:r.code,userId:'forged-account'});expect(guest.userId).toBeUndefined();expect(JSON.stringify(snapshot(r,h))).not.toContain('account-123');expect(JSON.stringify(snapshot(r,guest))).not.toContain('userId');
});
