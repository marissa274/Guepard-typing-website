import {afterEach,expect,jest,test} from '@jest/globals';
import {Pool} from 'pg';
import type {MockedObject} from 'jest-mock';
import {listResults,saveFinishedResults} from '../src/server/result-store';
import {defaultSettings,type Person,type Room} from '../src/lib/room-types';

jest.mock('pg',()=>({Pool:jest.fn()}));
type QueryResult={rows:Record<string,unknown>[]};
type Query=(sql:string,values?:unknown[])=>Promise<QueryResult>;

const finisher:Person={id:'p1',userId:'user1',name:'Alice',animal:'cheetah',kind:'demo',role:'player',late:false,seen:61_000,progress:250,typed:250,errors:0,finishedAt:61_000,abandoned:false};
const quitter:Person={...finisher,id:'p2',userId:'user2',name:'Bastien',progress:200,typed:200,finishedAt:undefined,abandoned:true,abandonedAt:31_000};
const room:Room={id:'room1',name:'Jungle',animal:'cheetah',code:'CODE23',hostId:'p1',people:[finisher,quitter],settings:defaultSettings,phase:'finished',createdAt:1000,startedAt:1000,endedAt:61_000,revision:3,invites:[]};
const storedResult=(sql:string,values:unknown[]|undefined)=>{if(!sql.startsWith('INSERT'))return null;return JSON.parse(String(values?.[5])) as {abandoned:boolean;personalBest:boolean;speed:number}};

test('an abandoned race is never a personal best, and earlier abandons do not raise the record',async()=>{
 const query=jest.fn<Query>(async()=>({rows:[{best_speed:'10'}]}));
 await saveFinishedResults({query} as unknown as Parameters<typeof saveFinishedResults>[0],[room]);
 const stored=query.mock.calls.map(([sql,values])=>storedResult(sql,values)).filter(entry=>entry!==null);
 const abandoned=stored.find(entry=>entry.abandoned);
 expect(abandoned?.speed).toBeGreaterThan(10);
 expect(abandoned?.personalBest).toBe(false);
 expect(stored.find(entry=>!entry.abandoned)?.personalBest).toBe(true);
 const bestQueries=query.mock.calls.map(([sql])=>sql).filter(sql=>sql.startsWith('SELECT MAX'));
 expect(bestQueries.length).toBe(2);
 for(const sql of bestQueries)expect(sql).toMatch(/abandoned/);
});

const originalUrl=process.env.DATABASE_URL;
afterEach(()=>{process.env.DATABASE_URL=originalUrl;delete (globalThis as {guepardResults?:unknown}).guepardResults});
test('the best speed shown in the summary excludes abandoned races',async()=>{
 process.env.DATABASE_URL='postgres://test-only';
 const query=jest.fn<Query>(async sql=>sql.includes('COUNT(*)')?{rows:[{races:2,wins:1,best_speed:50,average_speed:40,average_accuracy:90}]}:{rows:[]});
 jest.mocked(Pool).mockImplementation(()=>({query}) as unknown as MockedObject<Pool>);
 await listResults('user1');
 const summary=query.mock.calls.map(([sql])=>sql).find(sql=>sql.includes('COUNT(*)'));
 expect(summary).toMatch(/MAX\(\(result->>'speed'\)::numeric\) FILTER\(WHERE NOT COALESCE\(\(result->>'abandoned'\)::boolean,false\)\)/);
});
