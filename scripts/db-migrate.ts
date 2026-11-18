import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import pg from 'pg';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL est requis.');
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
const directory=fileURLToPath(new URL('../migrations/',import.meta.url));
await client.connect();
try{
 await client.query('SELECT pg_advisory_lock(74120932)');
 await client.query('CREATE TABLE IF NOT EXISTS guepard_migrations(name TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
 const files=(await readdir(directory)).filter(name=>/^\d+_[a-z0-9_-]+\.sql$/.test(name)).sort();
 let applied=0;
 for(const name of files){
  const sql=await readFile(join(directory,name),'utf8'),checksum=createHash('sha256').update(sql).digest('hex');
  const previous=await client.query<{checksum:string}>('SELECT checksum FROM guepard_migrations WHERE name=$1',[name]);
  if(previous.rows[0]){if(previous.rows[0].checksum!==checksum)throw new Error(`La migration ${name} a déjà été appliquée avec un contenu différent. Ajoutez une nouvelle migration.`);continue}
  await client.query('BEGIN');
  try{await client.query(sql);await client.query('INSERT INTO guepard_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);await client.query('COMMIT');applied++}
  catch(error){await client.query('ROLLBACK');throw error}
 }
 console.log(`${applied} migration(s) appliquée(s), ${files.length} migration(s) versionnée(s).`);
}finally{await client.end()}
