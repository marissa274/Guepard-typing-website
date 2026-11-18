import {afterEach,beforeEach,expect,jest,test} from '@jest/globals';
import {act,createRoom,joinRoom,tick} from '../src/server/room-engine';
import type {Room} from '../src/lib/room-types';
let now=1_000_000,clock:ReturnType<typeof jest.spyOn>;
beforeEach(()=>{now=1_000_000;clock=jest.spyOn(Date,'now').mockImplementation(()=>now)});
afterEach(()=>clock.mockRestore());
const text=Array.from({length:40},(_,i)=>'mot'+i).join(' ');

test('human bonuses alter personal text, block the paused leader and reset before a rematch',()=>{
 const {room,person}=createRoom({name:'Jungle',nickname:'Alice',animal:'cheetah',visibility:'public'});const last=joinRoom(room,{nickname:'Bastien'});
 act(room,person,{action:'settings',settings:{bonuses:true}});act(room,person,{action:'start'},text);now+=3000;tick(room);
 while(!person.pausedUntil){now+=1000;const length=Math.min((person.input?.length||0)+20,person.targetText!.length);act(room,person,{action:'progress',value:person.targetText!.slice(0,length),typed:length});}
 expect(last.targetText!.split(' ')).toHaveLength(37);expect(person.targetText!.split(' ')).toHaveLength(43);expect(last.bonusReceived).toBe(3);
 const input=person.input!;expect(()=>act(room,person,{action:'progress',value:input+'a',typed:person.typed+1})).toThrow('pause');expect(person.input).toBe(input);
 now=person.pausedUntil!;act(room,person,{action:'progress',value:person.targetText!.slice(0,input.length+1),typed:person.typed+1});
 act(room,last,{action:'abandon'});act(room,person,{action:'abandon'});act(room,person,{action:'rematch'},text);expect(room.phase).toBe('countdown');expect(person.pauses).toEqual([]);expect(room.bonusEvents).toEqual([]);expect(last.targetText).toBe(text);expect(last.bonusReceived).toBe(0);
});
test('bot effects and telemetry are identical under one late poll or frequent irregular polls',()=>{
 const {room,person}=createRoom({name:'Jungle',nickname:'Alice',animal:'cheetah',visibility:'public'});act(room,person,{action:'bot',difficulty:'impossible'});act(room,person,{action:'settings',settings:{bonuses:true,timeLimit:30}});act(room,person,{action:'start'},text);
 const a:Room=JSON.parse(JSON.stringify(room)),b:Room=JSON.parse(JSON.stringify(room)),start=room.startedAt!;
 now=start+30_000;tick(a);
 for(let elapsed=137;elapsed<30_000;elapsed+=137){now=start+elapsed;tick(b)}now=start+30_000;tick(b);
 const first=a.people.find(p=>p.kind==='bot')!,second=b.people.find(p=>p.kind==='bot')!;
 expect(first.finishedAt).toBe(second.finishedAt);expect(first.progress).toBe(second.progress);expect(first.targetText).toBe(second.targetText);expect(first.telemetry).toEqual(second.telemetry);expect(a.bonusEvents).toEqual(b.bonusEvents);
 expect(first.pauses).toHaveLength(1);expect(first.pauses![0].end-first.pauses![0].start).toBe(2000);expect(first.targetText!.length).toBeGreaterThan(text.length);
});
