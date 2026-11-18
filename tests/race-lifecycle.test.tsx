import {afterEach,beforeEach,expect,jest,test} from '@jest/globals';
import {act,createRoom,joinRoom,snapshot,tick,validateSettings} from '../src/server/room-engine';
import {defaultSettings} from '../src/lib/room-types';
let now=1_000_000;
let clock:ReturnType<typeof jest.spyOn>;
beforeEach(()=>{now=1_000_000;clock=jest.spyOn(Date,'now').mockImplementation(()=>now)});
afterEach(()=>clock.mockRestore());
function pair(){const result=createRoom({name:'Jungle',nickname:'Alice',animal:'cheetah',visibility:'public'});const guest=joinRoom(result.room,{nickname:'Bastien'});return {...result,guest}}
function start(){const result=pair();act(result.room,result.person,{action:'start'});return result}

test('a synchronized three second countdown forbids typing and joining until results',()=>{
 const {room,person}=start();expect(room.phase).toBe('countdown');expect(room.startedAt).toBe(now+3000);expect(room.text!.length).toBeGreaterThan(0);
 expect(()=>act(room,person,{action:'progress',value:'a',typed:1})).toThrow('maintenant');expect(()=>joinRoom(room,{nickname:'Charlie'})).toThrow('cours');
 now+=2999;tick(room);expect(room.phase).toBe('countdown');now++;tick(room);expect(room.phase).toBe('running');
});
test.each([1,29,601,3600])('time limit %s is rejected',timeLimit=>expect(()=>validateSettings({...defaultSettings,timeLimit})).toThrow('limites'));
test.each([0,30,600])('time limit %s is accepted',timeLimit=>expect(validateSettings({...defaultSettings,timeLimit}).timeLimit).toBe(timeLimit));
test('abandonment freezes its timestamp without ending another active player’s race',()=>{
 const {room,person,guest}=start();now+=4000;act(room,guest,{action:'abandon'});expect(guest.abandonedAt).toBe(now);expect(room.phase).toBe('running');
 const frozen=guest.abandonedAt;now+=1000;act(room,person,{action:'abandon'});expect(room.phase).toBe('finished');expect(room.endedAt).toBe(now);expect(guest.abandonedAt).toBe(frozen);
});
test('heartbeats preserve a connected non-typing player and absence beyond thirty seconds abandons',()=>{
 const {room,person,guest}=start();now+=3000;tick(room);now+=20_000;act(room,person,{action:'heartbeat'});act(room,guest,{action:'heartbeat'});
 now+=20_000;act(room,person,{action:'heartbeat'});expect(person.abandoned).toBe(false);expect(guest.abandoned).toBe(false);
 now+=10_001;tick(room);expect(guest.abandoned).toBe(true);expect(guest.abandonedAt).toBe(room.startedAt!+50_000);expect(person.abandoned).toBe(false);
});
test('a late heartbeat does not resurrect an abandoned player',()=>{
 const {room,person}=start();now=room.startedAt!+30_001;act(room,person,{action:'heartbeat'});expect(person.abandoned).toBe(true);
});
test('reconnection and snapshots never expose another member’s identity, input or keyboard heatmap',()=>{
 const {room,person,guest}=pair();person.identityKey='identity-secret';person.ipHash='ip-secret';person.input='typed-secret';person.heatmap={a:{hits:2,errors:1}};room.bannedIdentities=['ban-secret'];
 const view=snapshot(room,guest);expect(JSON.stringify(view)).not.toContain('secret');expect(view.people.find(p=>p.id===person.id)?.heatmap).toBeUndefined();expect(snapshot(room,person).people.find(p=>p.id===person.id)?.heatmap).toEqual(person.heatmap);
});
