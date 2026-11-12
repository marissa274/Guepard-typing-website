import {collectFinishedResults,saveFinishedResults,listResults,getResult} from '../src/server/result-store';
import {defaultSettings} from '../src/lib/room-types';
import {Pool} from 'pg';
jest.mock('pg',()=>({Pool:jest.fn()}));

const player={id:'p1',userId:'user1',name:'Alice',animal:'cheetah',kind:'demo',role:'player',late:false,token:'secret',input:'secret-input',seen:61000,progress:250,typed:250,errors:0,finishedAt:61000,abandoned:false};
const room={id:'room1',name:'Jungle',animal:'cheetah',code:'SECRET',hostId:'p1',people:[player,{...player,id:'guest',userId:undefined,kind:'guest',finishedAt:undefined,progress:20},{...player,id:'spectator',role:'spectator'}],settings:defaultSettings,phase:'finished',createdAt:1000,startedAt:1000,endedAt:61000,revision:3,invites:[{token:'invite-secret',expires:99000,used:false}]};

test('only authenticated racers receive authoritative results and private snapshots omit credentials',()=>{
 const entries=collectFinishedResults([room]);
 expect(entries).toHaveLength(1);
 expect(entries[0]).toMatchObject({userId:'user1',result:{speed:50,accuracy:100,rank:1,won:true}});
 const serialized=JSON.stringify(entries[0].room);
 expect(serialized).not.toContain('secret');
 expect(serialized).not.toContain('user1');
 expect(entries[0].room.code).toBe('');
 expect(entries[0].room.me).toBe('p1');
 expect(collectFinishedResults([{...room,phase:'running'}])).toEqual([]);
});

test('finalized races use a stable unique identity and are saved idempotently',async()=>{
 const query=jest.fn().mockResolvedValue({rows:[]});
 await saveFinishedResults({query},[room]);
 await saveFinishedResults({query},[room]);
 expect(query).toHaveBeenCalledTimes(2);
 expect(query.mock.calls[0][0]).toContain('ON CONFLICT');
 expect(query.mock.calls[0][1]).toEqual(query.mock.calls[1][1]);
 expect(collectFinishedResults([{...room,startedAt:2000}])[0].result.id).not.toBe(collectFinishedResults([room])[0].result.id);
});

test('pagination and archived snapshots are selected only for the authenticated account',async()=>{
 const old=process.env.DATABASE_URL;process.env.DATABASE_URL='postgres://test-only';
 delete globalThis.guepardResults;
 const query=jest.fn(async(sql)=>{
  if(sql.includes('COUNT(*)'))return {rows:[{races:11,wins:3,best_speed:80,average_speed:55,average_accuracy:95}]};
  if(sql.includes('SELECT result FROM'))return {rows:[{result:{id:'last',speed:50}}]};
  if(sql.includes('SELECT snapshot'))return {rows:[]};
  if(sql.includes('SELECT ended_at'))return {rows:[{date:'1000',speed:'50'}]};
  return {rows:[]};
 });
 Pool.mockImplementation(()=>({query}));
 try{
  const result=await listResults('user-private',2,10);
  expect(result).toMatchObject({total:11,page:2,summary:{races:11,wins:3,bestSpeed:80,averageSpeed:55,averageAccuracy:95},progression:[{date:1000,speed:50}]});
  expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id=$1 ORDER BY'),['user-private',10,10]);
  expect(await getResult('other-account','last')).toBeNull();
  expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id=$1 AND id=$2'),['other-account','last']);
 }finally{if(old===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=old;delete globalThis.guepardResults}
});
