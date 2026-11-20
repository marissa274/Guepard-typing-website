import {Pool} from 'pg';
import {initialCorpus} from '../data/corpus';
import {drizzle} from 'drizzle-orm/node-postgres';
import {and,eq} from 'drizzle-orm';
import {corpusTable} from './db-schema';
import type {Settings} from '../lib/room-types';
import {generateConfiguredText} from './text-generator';

export const corpusSchema=`CREATE TABLE IF NOT EXISTS guepard_corpus (
 id TEXT PRIMARY KEY, language TEXT NOT NULL CHECK(language IN ('FR','EN')),
 complexity TEXT NOT NULL CHECK(complexity IN ('easy','medium','hard')),
 kind TEXT NOT NULL CHECK(kind IN ('story','words')), content TEXT NOT NULL, source TEXT NOT NULL
);`;
const runtime=globalThis as typeof globalThis&{guepardCorpus?:{pool:Pool;ready:Promise<void>}};
async function database(){
 if(!process.env.DATABASE_URL)return null;
 if(!runtime.guepardCorpus){
  const pool=new Pool({connectionString:process.env.DATABASE_URL,max:3});
  const ready=(async()=>{await pool.query(corpusSchema);for(const passage of initialCorpus)await pool.query('INSERT INTO guepard_corpus(id,language,complexity,kind,content,source) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',[passage.id,passage.language,passage.complexity,passage.kind,passage.content,passage.source])})();
  const entry={pool,ready};
  runtime.guepardCorpus=entry;
  /* A failed initialisation must not stay cached until the process restarts: the next call starts over. */
  ready.catch(()=>{if(runtime.guepardCorpus===entry)runtime.guepardCorpus=undefined;void pool.end().catch(()=>undefined)});
 }
 const entry=runtime.guepardCorpus;
 await entry.ready;
 return entry.pool;
}
export async function prepareConfiguredText(settings:Settings){
 const pool=await database();
 if(!pool||settings.textType==='custom')return generateConfiguredText(settings);
 const rows=await drizzle(pool).select().from(corpusTable).where(and(eq(corpusTable.language,settings.language),eq(corpusTable.complexity,settings.complexity),eq(corpusTable.kind,settings.textType))).orderBy(corpusTable.id);
 return generateConfiguredText(settings,rows);
}
