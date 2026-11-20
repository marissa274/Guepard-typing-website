const mockQueries:string[]=[];
let mockFailures=0;
const mockEnded=jest.fn();
jest.mock('pg',()=>({Pool:class{
 async query(sql:string){mockQueries.push(sql);if(mockFailures>0){mockFailures--;throw new Error('connection refused')}return {rows:[]}}
 end(){mockEnded();return Promise.resolve()}
}}));
import {prepareConfiguredText} from '../src/server/text-corpus';
import type {Settings} from '../src/lib/room-types';

const settings={language:'FR',complexity:'easy',textType:'custom',customText:'Un texte assez long pour courir.'} as Settings;
const runtime=globalThis as typeof globalThis&{guepardCorpus?:unknown};

describe('text corpus initialisation',()=>{
 beforeEach(()=>{process.env.DATABASE_URL='postgres://corpus.test/guepard';runtime.guepardCorpus=undefined;mockQueries.length=0;mockFailures=0});
 afterAll(()=>{delete process.env.DATABASE_URL;runtime.guepardCorpus=undefined});
 it('forgets a failed initialisation and starts over on the next call',async()=>{
  mockFailures=1;
  await expect(prepareConfiguredText(settings)).rejects.toThrow('connection refused');
  expect(runtime.guepardCorpus).toBeUndefined();
  expect(mockEnded).toHaveBeenCalledTimes(1);
  await expect(prepareConfiguredText(settings)).resolves.toEqual(expect.any(String));
  expect(runtime.guepardCorpus).toBeDefined();
 });
 it('keeps a successful initialisation for the following calls',async()=>{
  await prepareConfiguredText(settings);
  const created=mockQueries.length;
  await prepareConfiguredText(settings);
  expect(mockQueries).toHaveLength(created);
 });
});
