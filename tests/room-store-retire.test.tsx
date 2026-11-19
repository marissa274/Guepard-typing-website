import {afterEach,expect,jest,test} from '@jest/globals';
import type {Room} from '../src/lib/room-types';

interface QueryCall {sql:string;values?:unknown[]}
const mockCalls:QueryCall[]=[];
const mockRooms:{rows:{id:string;data:Room}[]}={rows:[]};
jest.mock('pg',()=>{
 const query=async(sql:string,values?:unknown[])=>{mockCalls.push({sql,values});return sql.startsWith('SELECT id,data')?mockRooms:{rows:[]}};
 return {Pool:class {query=query;async connect(){return {query,release:()=>undefined}}}};
});
import {retireRoom,transaction} from '../src/server/room-store';
import {createRoom,joinRoom} from '../src/server/room-engine';

const previous=process.env.DATABASE_URL;
afterEach(()=>{if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous});

test('C1-B17: a retired room is deleted and its finished human results are inserted in the same transaction',async()=>{
 process.env.DATABASE_URL='postgresql://test/guepard';
 const {room,person}=createRoom({name:'Jungle',nickname:'Alice',animal:'cheetah',kind:'demo',userId:'11111111-1111-1111-1111-111111111111',identityKey:'user:alice'});
 const other=joinRoom(room,{nickname:'Bastien',identityKey:'guest:b'},{accessVerified:true});
 Object.assign(room,{phase:'finished',text:'abc',startedAt:1000,endedAt:5000});
 Object.assign(person,{targetText:'abc',input:'abc',progress:3,typed:3,finishedAt:4000});
 Object.assign(other,{targetText:'abc',progress:1,abandoned:true,abandonedAt:5000});
 mockRooms.rows=[{id:room.id,data:room}];
 await transaction(data=>{const current=data[room.id];if(current)retireRoom(data,current)});
 const statements=mockCalls.map(call=>call.sql);
 const insert=statements.findIndex(sql=>sql.startsWith('INSERT INTO guepard_results'));
 expect(insert).toBeGreaterThan(-1);
 expect(mockCalls[insert].values?.[1]).toBe('11111111-1111-1111-1111-111111111111');
 expect(statements.findIndex(sql=>sql.startsWith('DELETE FROM guepard_rooms'))).toBeGreaterThan(insert);
 expect(statements.at(-1)).toBe('COMMIT');
});
