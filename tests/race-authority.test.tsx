import {afterEach,beforeEach,expect,jest,test} from '@jest/globals';
import {act,createRoom,joinRoom,tick} from '../src/server/room-engine';
let now=1_000_000,clock:ReturnType<typeof jest.spyOn>;
beforeEach(()=>{now=1_000_000;clock=jest.spyOn(Date,'now').mockImplementation(()=>now)});
afterEach(()=>clock.mockRestore());
function race(){const {room,person}=createRoom({name:'Jungle',nickname:'Alice',animal:'cheetah',visibility:'public'});const guest=joinRoom(room,{nickname:'Bastien'});act(room,person,{action:'start'},'abc def ghi jkl mno pqr stu vwx yz '.repeat(10));now+=3000;tick(room);return {room,person,guest}}
test('the server rejects impossible jumps and excessive reported keypresses',()=>{
 const {room,person}=race();expect(()=>act(room,person,{action:'progress',value:room.text!.slice(0,60),typed:60})).toThrow('rapide');expect(person.progress).toBe(0);
 expect(()=>act(room,person,{action:'progress',value:'abc',typed:99999})).toThrow('rapide');expect(person.typed).toBe(0);
 act(room,person,{action:'progress',value:'abc',typed:3});expect(person.progress).toBe(3);
});
test('network buffering is allowed up to the documented reserve, never unlimited',()=>{
 const {room,person}=race();now+=2000;act(room,person,{action:'progress',value:room.text!.slice(0,35),typed:35});expect(person.progress).toBe(35);
 now+=10_000;expect(()=>act(room,person,{action:'progress',value:room.text!.slice(0,100),typed:100})).toThrow('rapide');
});
test('telemetry is sampled for humans and bots, freezes at abandonment and resets each round',()=>{
 const {room,person}=race();act(room,person,{action:'progress',value:'abc',typed:3});now+=1000;tick(room);expect(person.telemetry!.some(p=>p.wpm>0)).toBe(true);
 act(room,person,{action:'abandon'});const last=person.telemetry!.at(-1);now+=1000;tick(room);expect(person.telemetry!.at(-1)).toEqual(last);
});
test('keyboard aggregates are bounded, monotonic and cannot claim more attempts than accepted typing',()=>{
 const {room,person}=race();act(room,person,{action:'progress',value:'axc',typed:3,heatmap:{a:{hits:1,errors:0},b:{hits:1,errors:1},c:{hits:1,errors:0}}});
 expect(person.heatmap!.b).toEqual({hits:1,errors:1});now+=1000;
 expect(()=>act(room,person,{action:'progress',value:'abc',typed:4,heatmap:{b:{hits:9999,errors:0}}})).toThrow('clavier');expect(person.input).toBe('axc');
 act(room,person,{action:'progress',value:'abc',typed:4,heatmap:{a:{hits:1,errors:0},b:{hits:2,errors:1},c:{hits:1,errors:0}}});expect(person.typed).toBe(4);
});

test('deleting and retyping correct letters does not invent typing errors',()=>{
 const {room,person}=race();
 act(room,person,{action:'progress',value:'abc',typed:3});
 act(room,person,{action:'progress',value:'ab',typed:3});
 act(room,person,{action:'progress',value:'abc',typed:4});
 expect(person.errors).toBe(0);
 expect(person.heatmap!.c).toEqual({hits:2,errors:0});
});
