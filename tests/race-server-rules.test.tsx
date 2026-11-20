import {afterEach,beforeEach,expect,jest,test} from '@jest/globals';
import {act,createRoom,joinRoom,snapshot,tick} from '../src/server/room-engine';
import {raceResults} from '../src/lib/race-results';
import type {Person,Room} from '../src/lib/room-types';

let now=1_000_000;
let clock:ReturnType<typeof jest.spyOn>;
beforeEach(()=>{now=1_000_000;clock=jest.spyOn(Date,'now').mockImplementation(()=>now)});
afterEach(()=>clock.mockRestore());

const longText='abc def ghi jkl mno pqr stu vwx yz '.repeat(10).trim();
function race(text=longText,guests=1):{room:Room;host:Person;others:Person[]}{
 const {room,person:host}=createRoom({name:'Jungle',nickname:'Alice',animal:'cheetah',visibility:'public'});
 const others=Array.from({length:guests},(_,index)=>joinRoom(room,{nickname:'Invité '+index}));
 act(room,host,{action:'start'},text);now+=3000;tick(room);
 return {room,host,others};
}

test('progress requests sample at most one telemetry point per second per player, only when it changed',()=>{
 const {room,host,others}=race(longText,5);
 const typists=[host,...others.slice(0,4)],idle=others[4];
 for(let step=1;step<=15;step++){
  now+=200;
  for(const person of typists)act(room,person,{action:'progress',value:longText.slice(0,step),typed:step});
 }
 for(const person of typists){
  const series=person.telemetry??[];
  expect(series.length).toBeLessThanOrEqual(5);
  for(let index=1;index<series.length;index++)expect(series[index].at-series[index-1].at).toBeGreaterThanOrEqual(1000);
 }
 expect((idle.telemetry??[]).length).toBeLessThanOrEqual(1);
});

test('the final telemetry point still matches the authoritative result for every racer',()=>{
 const {room,host,others}=race(longText,2);
 for(let step=1;step<=10;step++){now+=300;act(room,host,{action:'progress',value:longText.slice(0,step),typed:step})}
 act(room,others[0],{action:'abandon'});
 now+=200_000;tick(room,true);
 expect(room.phase).toBe('finished');
 const view=snapshot(room,host),results=raceResults(view);
 for(const person of room.people){
  const last=person.telemetry?.at(-1),result=results.find(row=>row.person.id===person.id);
  expect(last?.at).toBe(person.finishedAt??person.abandonedAt??room.endedAt);
  expect(last?.wpm).toBe(result?.speed);
 }
});

test('errors come from the characters the server validates, not from the client heatmap',()=>{
 const {room,host}=race();
 act(room,host,{action:'progress',value:'axc',typed:3,heatmap:{a:{hits:1,errors:0},b:{hits:1,errors:0},c:{hits:1,errors:0}}});
 expect(host.errors).toBe(1);
 const accuracy=raceResults(snapshot(room,host)).find(row=>row.person.id===host.id)?.accuracy;
 expect(accuracy).toBe(67);
});

test('the client heatmap only distributes errors and cannot exceed what the server can account for',()=>{
 const {room,host}=race();
 now+=1000;
 // Two keypresses were typed then erased inside the same batch: the server never saw them.
 act(room,host,{action:'progress',value:'ab',typed:4,heatmap:{a:{hits:2,errors:1},b:{hits:2,errors:1}}});
 expect(host.errors).toBe(2);
 expect(host.heatmap).toEqual({a:{hits:2,errors:1},b:{hits:2,errors:1}});
 // A heatmap claiming more errors than any unseen keypress can explain is not trusted.
 act(room,host,{action:'progress',value:'abc',typed:5,heatmap:{a:{hits:2,errors:1},b:{hits:2,errors:1},c:{hits:1,errors:1}}});
 expect(host.errors).toBe(2);
 const heatErrors=Object.values(host.heatmap??{}).reduce((sum,entry)=>sum+entry.errors,0);
 expect(heatErrors).toBeLessThanOrEqual(host.errors);
 expect(host.heatmap?.c).toEqual({hits:1,errors:0});
});

test('in free mode reaching the end of the text finishes the race, errors included (COURSE-09)',()=>{
 const text='abc def ghi';
 const {room,host,others}=race(text);
 now+=1000;
 act(room,host,{action:'progress',value:'abc def ghx',typed:11});
 expect(host.finishedAt).toBe(now);
 expect(host.errors).toBe(1);
 expect(host.progress).toBe(10);
 act(room,others[0],{action:'abandon'});
 expect(room.phase).toBe('finished');
 expect(raceResults(snapshot(room,host))[0]).toMatchObject({rank:1,errors:1,status:'Terminé'});
});

test('in blocking mode an uncorrected text still cannot be submitted',()=>{
 const {room,person:host}=createRoom({name:'Jungle',nickname:'Alice',animal:'cheetah',visibility:'public'});
 joinRoom(room,{nickname:'Bastien'});
 act(room,host,{action:'settings',settings:{blockErrors:true}});
 act(room,host,{action:'start'},'abc def ghi');now+=4000;tick(room);
 expect(()=>act(room,host,{action:'progress',value:'abc def ghx',typed:11})).toThrow('Corrigez');
 expect(host.finishedAt).toBeUndefined();
});

test('a custom text is only visible to the host before the countdown',()=>{
 const {room,person:host}=createRoom({name:'Jungle',nickname:'Alice',animal:'cheetah',visibility:'public'});
 const guest=joinRoom(room,{nickname:'Bastien'});
 const secret='Un passage secret que personne ne doit lire avant le départ.';
 act(room,host,{action:'settings',settings:{textType:'custom',customText:secret}});
 expect(snapshot(room,host).settings.customText).toBe(secret);
 expect(JSON.stringify(snapshot(room,guest))).not.toContain('passage secret');
 act(room,host,{action:'start'});
 expect(snapshot(room,guest).text).toBe(secret);
});

test('a batch sent during the leader pause is ignored without error, then accepted after the pause',()=>{
 const {room,host}=race();
 now+=500;
 act(room,host,{action:'progress',value:'abc',typed:3});
 host.pausedUntil=now+2000;host.pauses=[{start:now,end:now+2000}];
 expect(()=>act(room,host,{action:'progress',value:'abc de',typed:6})).not.toThrow();
 expect(host.input).toBe('abc');
 expect(host.typed).toBe(3);
 now+=2000;
 act(room,host,{action:'progress',value:'abc de',typed:6});
 expect(host.input).toBe('abc de');
 expect(host.progress).toBe(6);
});

test('invitations and removals are no longer handled by the engine (room-service owns them)',()=>{
 const {room,person:host}=createRoom({name:'Jungle',nickname:'Alice',animal:'cheetah',visibility:'private'});
 const guest:Person={...host,id:'guest-id',token:'guest-token',name:'Bastien'};room.people.push(guest);
 expect(()=>act(room,host,{action:'invite'})).toThrow('Action inconnue');
 expect(room.invites).toHaveLength(0);
 expect(()=>act(room,host,{action:'kick',personId:guest.id})).toThrow('Action inconnue');
 expect(room.people.some(person=>person.id===guest.id)).toBe(true);
});

test('a key whose lower case spans several code units (İ → i̇) is recorded and accepted, the race goes on',()=>{
 const text='İstanbul ville',{room,host}=race(text);
 const key='İ'.toLowerCase();
 expect(key.length).toBe(2);
 now+=1000;
 act(room,host,{action:'progress',value:'İs',typed:2,heatmap:{[key]:{hits:1,errors:0},s:{hits:1,errors:0}}});
 expect(host.progress).toBe(2);
 expect(host.heatmap).toEqual({[key]:{hits:1,errors:0},s:{hits:1,errors:0}});
 now+=1000;
 // Without a client heatmap the server builds the same key itself.
 act(room,host,{action:'progress',value:'İst',typed:3});
 expect(host.heatmap?.[key]).toEqual({hits:1,errors:0});
 expect(host.heatmap?.t).toEqual({hits:1,errors:0});
});
