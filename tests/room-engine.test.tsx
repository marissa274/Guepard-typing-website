import {test,expect,jest} from '@jest/globals';
import {createRoom,joinRoom,act,authenticate,snapshot,generateText,validateSettings,tick} from '../src/server/room-engine';
import {defaultSettings} from '../src/lib/room-types';
const input={name:'La jungle',nickname:'Hôte',animal:'parrot',visibility:'semi',kind:'guest'};
function room(){return createRoom(input)}
test('animal is required, guest assigned default, and tokens never leak',()=>{expect(()=>createRoom({...input,animal:'unknown'})).toThrow('animal');const {room:r,person:p}=room();expect(r.animal).toBe('parrot');expect(p.animal).toBe('cheetah');expect(JSON.stringify(snapshot(r,p))).not.toContain(p.token);expect(JSON.stringify(snapshot(r,p))).not.toContain('invites')});
test('class of 35 can join, only host controls roles/settings/start',()=>{const {room:r,person:h}=room();let guest;for(let i=0;i<35;i++)guest=joinRoom(r,{code:r.code,nickname:'Élève '+i});expect(r.people.length).toBe(36);for(const action of [{action:'start'},{action:'settings',settings:{length:200}},{action:'role',personId:h.id,role:'spectator'},{action:'kick',personId:h.id},{action:'bot'}])expect(()=>act(r,guest,action)).toThrow('Seul l’hôte');act(r,h,{action:'settings',settings:{length:200}});expect(snapshot(r,guest).settings.length).toBe(200);act(r,h,{action:'role',personId:guest.id,role:'spectator'});expect(guest.role).toBe('spectator')});
test('private invitation is host-only, expiring and single use',()=>{const {room:r,person:h}=createRoom({...input,visibility:'private'});expect(()=>joinRoom(r,{nickname:'Sam',code:r.code})).toThrow('Invitation');const {invitation}=act(r,h,{action:'invite'});joinRoom(r,{nickname:'Sam',invite:invitation.token});expect(()=>joinRoom(r,{nickname:'Replay',invite:invitation.token})).toThrow('utilisée');const second=act(r,h,{action:'invite'}).invitation;second.expires=Date.now()-1;expect(()=>joinRoom(r,{nickname:'Late',invite:second.token})).toThrow('expirée')});
test('minimum two players, individual bot difficulty, late arrival spectator and next round restoration',()=>{const {room:r,person:h}=room();expect(()=>act(r,h,{action:'start'})).toThrow('deux joueurs');act(r,h,{action:'bot',difficulty:'impossible'});expect(r.people[1].difficulty).toBe('impossible');act(r,h,{action:'start'});expect(r.phase).toBe('running');const late=joinRoom(r,{nickname:'Retardataire',code:r.code});expect(late.role).toBe('spectator');expect(()=>act(r,h,{action:'settings',settings:{length:25}})).toThrow('verrouillés');act(r,h,{action:'reset'});expect(late.role).toBe('player');expect(r.phase).toBe('waiting')});
test('kick revokes token and spectators do not count toward minimum',()=>{const {room:r,person:h}=room(),guest=joinRoom(r,{nickname:'Sam',code:r.code});act(r,h,{action:'role',personId:guest.id,role:'spectator'});expect(()=>act(r,h,{action:'start'})).toThrow('deux joueurs');act(r,h,{action:'kick',personId:guest.id});expect(()=>authenticate(r,guest.token)).toThrow('partie')});
test('advanced options and bounds apply to generated/custom text',()=>{const s={...defaultSettings,length:200,numbers:true,specials:true,accents:false,punctuation:false,blacklist:'@'};const text=generateText(s);expect(text).not.toMatch(/[@éèà.,]/);expect(text).toMatch(/\d/);expect(generateText({...s,textType:'custom',customText:'Une très belle rivière!'})).toBe('Une tres belle riviere');expect(()=>validateSettings({...s,length:2})).toThrow('limites')});
test('inactivity uses typing activity rather than heartbeat',()=>{const {room:r,person:h}=room();act(r,h,{action:'settings',settings:{timeLimit:0}});act(r,h,{action:'bot'});act(r,h,{action:'start'});r.startedAt=Date.now()-130000;h.lastInput=r.startedAt;act(r,h,{action:'heartbeat'});tick(r);expect(h.abandoned).toBe(true)});
test('reconnection restores only the current player’s typed text',()=>{const {room:r,person:h}=room(),guest=joinRoom(r,{nickname:'Sam',code:r.code});act(r,h,{action:'start'});r.startedAt=Date.now()-5000;act(r,h,{action:'progress',value:r.text.slice(0,12),typed:12});expect(snapshot(r,h).people.find(p=>p.id===h.id).input).toBe(r.text.slice(0,12));expect(snapshot(r,guest).people.find(p=>p.id===h.id).input).toBeUndefined()});
test('rematch is host-only and atomically resets the finished round',()=>{const {room:r,person:h}=room(),guest=joinRoom(r,{nickname:'Sam',code:r.code});act(r,h,{action:'start'});r.phase='finished';r.endedAt=Date.now();h.progress=50;h.finishedAt=Date.now();expect(()=>act(r,guest,{action:'rematch'})).toThrow('Seul l’hôte');act(r,h,{action:'rematch'});expect(r.phase).toBe('running');expect(r.endedAt).toBeUndefined();expect(r.people.every(p=>p.progress===0&&!p.finishedAt)).toBe(true);expect(r.startedAt).toBeLessThanOrEqual(Date.now())});
test('bot keeps progressing while a human types repeatedly',()=>{const clock=jest.spyOn(Date,'now');let now=1_000_000;clock.mockImplementation(()=>now);try{const {room:r,person:h}=room();act(r,h,{action:'settings',settings:{length:1000}});act(r,h,{action:'bot',difficulty:'medium'});act(r,h,{action:'start'});const bot=r.people.find(p=>p.kind==='bot');const progress=[];for(let i=1;i<=30;i++){now+=200;act(r,h,{action:'progress',value:r.text.slice(0,i),typed:i});tick(r);progress.push(bot.progress)}expect(progress.at(-1)).toBeGreaterThan(20);expect(progress.every((value,i)=>i===0||value>=progress[i-1])).toBe(true);expect(bot.finishedAt).toBeUndefined()}finally{clock.mockRestore()}});
test('a two-player race ends immediately when one abandons and the other wins',()=>{const {room:r,person:h}=room(),guest=joinRoom(r,{nickname:'Sam',code:r.code});act(r,h,{action:'start'});act(r,guest,{action:'abandon'});expect(r.phase).toBe('finished');expect(r.endedAt).toBeDefined();expect(r.people.filter(p=>!p.abandoned).map(p=>p.id)).toEqual([h.id]);expect(()=>act(r,h,{action:'progress',value:'x'})).toThrow('maintenant')});

test('a submission after the time limit cannot complete the race',()=>{
 const clock=jest.spyOn(Date,'now');let now=1_000_000;clock.mockImplementation(()=>now);
 try{const {room:r,person:h}=room();joinRoom(r,{nickname:'Sam',code:r.code});act(r,h,{action:'settings',settings:{timeLimit:1}});act(r,h,{action:'start'});now+=1500;
 expect(()=>act(r,h,{action:'progress',value:r.text,typed:r.text.length})).toThrow('maintenant');expect(h.finishedAt).toBeUndefined();expect(h.progress).toBe(0);
 }finally{clock.mockRestore()}
});
test('a late server tick stops bots at the time limit instead of completing the text',()=>{
 const clock=jest.spyOn(Date,'now');let now=1_000_000;clock.mockImplementation(()=>now);
 try{const {room:r,person:h}=room();act(r,h,{action:'bot',difficulty:'impossible'});act(r,h,{action:'settings',settings:{length:20,timeLimit:1}});act(r,h,{action:'start'});now+=60_000;tick(r);
 const bot=r.people.find(p=>p.kind==='bot');expect(bot.progress).toBeGreaterThan(0);expect(bot.progress).toBeLessThan(20);expect(bot.finishedAt).toBeUndefined();expect(r.endedAt).toBe(r.startedAt+1000);
 }finally{clock.mockRestore()}
});
test('bots finishing between two ticks keep their actual order of arrival',()=>{
 const clock=jest.spyOn(Date,'now');let now=1_000_000;clock.mockImplementation(()=>now);
 try{const {room:r,person:h}=room();act(r,h,{action:'settings',settings:{timeLimit:0,inactiveAfter:600}});act(r,h,{action:'bot',difficulty:'beginner'});act(r,h,{action:'bot',difficulty:'impossible'});act(r,h,{action:'start'});now+=300_000;tick(r);
 const slow=r.people[1],fast=r.people[2];expect(fast.finishedAt).toBeLessThan(slow.finishedAt);expect(fast.finishedAt).toBeGreaterThan(r.startedAt);expect(slow.finishedAt).toBeLessThan(now);
 }finally{clock.mockRestore()}
});
test.each([Infinity,NaN,-1,1.5,'42'])('invalid typed counter %s is rejected before mutating the player',typed=>{
 const {room:r,person:h}=room();joinRoom(r,{nickname:'Sam',code:r.code});act(r,h,{action:'start'});
 expect(()=>act(r,h,{action:'progress',value:r.text.slice(0,5),typed})).toThrow('frappes');expect(h.progress).toBe(0);expect(h.typed).toBe(0);
});
test('typing counters cannot decrease when a player corrects and resubmits text',()=>{
 const {room:r,person:h}=room();joinRoom(r,{nickname:'Sam',code:r.code});act(r,h,{action:'start'});
 act(r,h,{action:'progress',value:r.text.slice(0,5),typed:8});act(r,h,{action:'progress',value:r.text.slice(0,3),typed:3});expect(h.typed).toBe(8);
 act(r,h,{action:'progress',value:r.text.slice(0,6),typed:6});expect(h.typed).toBe(11);
});
test('only active racers can abandon and their finish cannot be revoked',()=>{
 const {room:r,person:h}=room(),guest=joinRoom(r,{nickname:'Sam',code:r.code});
 expect(()=>act(r,guest,{action:'abandon'})).toThrow('abandonner');act(r,h,{action:'bot'});act(r,h,{action:'start'});
 const spectator=joinRoom(r,{nickname:'Regard',code:r.code});expect(()=>act(r,spectator,{action:'abandon'})).toThrow('abandonner');
 act(r,guest,{action:'progress',value:r.text,typed:r.text.length});expect(()=>act(r,guest,{action:'abandon'})).toThrow('abandonner');expect(guest.abandoned).toBe(false);
});
test('a spectator host cannot start a race with only bots',()=>{
 const {room:r,person:h}=room();act(r,h,{action:'bot',difficulty:'noob'});act(r,h,{action:'bot',difficulty:'expert'});act(r,h,{action:'role',personId:h.id,role:'spectator'});
 expect(()=>act(r,h,{action:'start'})).toThrow('humain');
});
test('account ownership is internal and never appears in room snapshots',()=>{
 const {room:r,person:h}=createRoom({...input,kind:'demo',userId:'account-123'});expect(h.userId).toBe('account-123');
 const guest=joinRoom(r,{nickname:'Sam',code:r.code,userId:'forged-account'});expect(guest.userId).toBeUndefined();
 expect(JSON.stringify(snapshot(r,h))).not.toContain('account-123');expect(JSON.stringify(snapshot(r,guest))).not.toContain('userId');
});
test('replacing a wrong character preserves its error and counts the correction',()=>{
 const {room:r,person:h}=room();joinRoom(r,{nickname:'Sam',code:r.code});act(r,h,{action:'start'});r.text='abc def ghi';
 act(r,h,{action:'progress',value:'axc',typed:3});expect(h.progress).toBe(2);expect(h.errors).toBe(1);
 act(r,h,{action:'progress',value:'abc',typed:3});expect(h.progress).toBe(3);expect(h.typed).toBe(4);expect(h.errors).toBe(1);
});
