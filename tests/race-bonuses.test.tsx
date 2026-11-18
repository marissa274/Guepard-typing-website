import {expect,test} from '@jest/globals';
import {applyBonuses} from '../src/server/race-bonuses';
import {defaultSettings,type Person,type Room} from '../src/lib/room-types';
const text=Array.from({length:40},(_,i)=>'mot'+i).join(' ');
function person(id:string,progress:number):Person{return {id,name:id,animal:'cheetah',kind:'guest',role:'player',late:false,seen:1000,progress,typed:progress,errors:0,abandoned:false,targetText:text,input:text.slice(0,progress)}}
function race():Room{return {id:'room',name:'Jungle',animal:'cheetah',code:'ABCDEF',hostId:'lead',people:[person('lead',Math.ceil(text.length*.26)),person('last',0)],settings:{...defaultSettings,bonuses:true},phase:'running',createdAt:1,startedAt:1000,revision:1,text,invites:[]}}
test('disabled bonuses never alter texts or participants',()=>{const room=race();room.settings.bonuses=false;applyBonuses(room,2000);expect(room.people[1].targetText).toBe(text);expect(room.bonusEvents).toBeUndefined()});
test('the three checkpoints produce three distinct real effects and never replay',()=>{
 const room=race(),leader=room.people[0],last=room.people[1];
 applyBonuses(room,2000);expect(last.targetText!.split(' ').length).toBe(37);expect(last.bonusReceived).toBe(1);
 leader.progress=Math.ceil(leader.targetText!.length*.51);leader.input=leader.targetText!.slice(0,leader.progress);applyBonuses(room,3000);expect(leader.targetText!.split(' ').length).toBe(43);
 leader.progress=Math.ceil(leader.targetText!.length*.76);leader.input=leader.targetText!.slice(0,leader.progress);applyBonuses(room,4000);expect(leader.pausedUntil).toBe(6000);expect(leader.pauses).toEqual([{start:4000,end:6000}]);
 expect(last.bonusReceived).toBe(3);expect(room.bonusEvents!.map(event=>event.type)).toEqual(['shortcut','detour','pause']);
 const before=JSON.stringify(room);applyBonuses(room,5000);expect(JSON.stringify(room)).toBe(before);
});
test('a shortcut never changes already typed content and spectators receive no bonus',()=>{
 const room=race(),last=room.people[1];last.input=text.slice(0,180);last.progress=0;room.people.push({...person('watcher',0),role:'spectator'});
 applyBonuses(room,2000);expect(last.targetText!.startsWith(last.input)).toBe(true);expect(last.targetText!.length).toBeGreaterThan(last.input.length);expect(room.people[2].bonusReceived).toBeUndefined();
});
test('a bot receives the same effects and checkpoints are deterministic',()=>{
 const a=race(),b=race();a.people[1].kind='bot';b.people[1].kind='bot';applyBonuses(a,2000);applyBonuses(b,2000);expect(a).toEqual(b);expect(a.people[1].targetText).not.toBe(text);
});
