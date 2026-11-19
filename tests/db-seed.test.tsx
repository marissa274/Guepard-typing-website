/** @jest-environment node */
import {expect,test} from '@jest/globals';
import {initialCorpus} from '../src/data/corpus';
import {demoUsers,seedDemo,type SeedClient} from '../scripts/seed-demo';

interface UserRow {id:string;username:string;username_key:string}
/** In-memory double reproducing the unique constraints the seed must respect. */
class FakeDatabase implements SeedClient {
 users:UserRow[]=[];results=new Map<string,{userId:string;snapshot:string}>();corpus=new Set<string>();
 async query(sql:string,params:unknown[]=[]):Promise<{rows:unknown[]}>{
  const text=(index:number)=>String(params[index]);
  if(sql.startsWith('INSERT INTO guepard_corpus')){this.corpus.add(text(0));return {rows:[]}}
  if(sql.startsWith('INSERT INTO guepard_users')){
   const row={id:text(0),username:text(1),username_key:text(2)};
   const conflict=this.users.some(user=>user.id===row.id||user.username_key===row.username_key);
   if(conflict&&!sql.includes('ON CONFLICT DO NOTHING'))throw Object.assign(new Error('duplicate key'),{code:'23505'});
   if(conflict)return {rows:[]};
   this.users.push(row);return {rows:[{id:row.id}]};
  }
  if(sql.startsWith('SELECT id FROM guepard_users'))return {rows:this.users.filter(user=>user.id===text(0))};
  if(sql.startsWith('INSERT INTO guepard_results')){
   if(!this.results.has(text(0)))this.results.set(text(0),{userId:text(1),snapshot:text(6)});
   return {rows:[]};
  }
  throw new Error('Unexpected SQL: '+sql);
 }
}
const options={corpus:initialCorpus,passwordHash:async()=>'scrypt$salt$hash'};

test('the seed creates several demo users with history and is idempotent',async()=>{
 const db=new FakeDatabase();
 const first=await seedDemo(db,options);
 expect(first.users.map(user=>user.status)).toEqual(demoUsers.map(()=>'created'));
 expect(db.users.length).toBeGreaterThanOrEqual(3);
 for(const user of demoUsers)expect([...db.results.values()].filter(row=>row.userId===user.id).length).toBeGreaterThanOrEqual(3);
 const counts={users:db.users.length,results:db.results.size,corpus:db.corpus.size};
 const second=await seedDemo(db,options);
 expect(second.users.map(user=>user.status)).toEqual(demoUsers.map(()=>'existing'));
 expect({users:db.users.length,results:db.results.size,corpus:db.corpus.size}).toEqual(counts);
});

test('a demo username already owned by another account is skipped without failing or touching that account',async()=>{
 const db=new FakeDatabase(),owner={id:'99999999-9999-4999-8999-999999999999',username:'gueparddemo',username_key:'gueparddemo'};
 db.users.push(owner);
 const summary=await seedDemo(db,options);
 expect(summary.users.find(user=>user.username==='GuepardDemo')?.status).toBe('skipped');
 expect(db.users.find(user=>user.username_key==='gueparddemo')).toEqual(owner);
 expect([...db.results.values()].some(row=>row.userId===owner.id||row.userId===demoUsers[0]!.id)).toBe(false);
 expect(summary.users.filter(user=>user.status==='created')).toHaveLength(demoUsers.length-1);
 await expect(seedDemo(db,options)).resolves.toMatchObject({users:expect.arrayContaining([{username:'GuepardDemo',status:'skipped'}])});
});
