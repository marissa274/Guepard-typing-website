import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {transaction,memberships} from '../src/server/room-store';
import {createRoom} from '../src/server/room-engine';
jest.mock('pg',()=>({Pool:jest.fn()}));
test('membership identity is unique across rooms and spectators count as room members',()=>{
 const first=createRoom({name:'First',nickname:'Host',animal:'cheetah',identityKey:'user:one'}).room;
 const second=createRoom({name:'Second',nickname:'Other',animal:'cheetah',identityKey:'user:one'}).room;
 first.people[0].role='spectator';
 expect(memberships({[first.id]:first}).get('user:one')).toEqual({roomId:first.id,personId:first.people[0].id});
 expect(()=>memberships({[first.id]:first,[second.id]:second})).toThrow(/un seul salon/);
});
test('async file transactions await the action and failed membership changes are not persisted',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'guepard-store-test-')),oldDir=process.env.GUEPARD_DATA_DIR,oldDb=process.env.DATABASE_URL;
 process.env.GUEPARD_DATA_DIR=dir;delete process.env.DATABASE_URL;
 const first=createRoom({name:'First',nickname:'Host',animal:'cheetah',identityKey:'user:one'}).room;
 try{
  await transaction(async data=>{await Promise.resolve();data[first.id]=first});
  expect(await transaction(data=>Object.keys(data),false)).toEqual([first.id]);
  const second=createRoom({name:'Second',nickname:'Other',animal:'cheetah',identityKey:'user:one'}).room;
  await expect(transaction(data=>{data[second.id]=second})).rejects.toMatchObject({status:409});
  expect(await transaction(data=>Object.keys(data),false)).toEqual([first.id]);
 }finally{await rm(dir,{recursive:true,force:true});if(oldDir===undefined)delete process.env.GUEPARD_DATA_DIR;else process.env.GUEPARD_DATA_DIR=oldDir;if(oldDb!==undefined)process.env.DATABASE_URL=oldDb}
});
