import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL est requis.');
const source=join(process.cwd(),'.data','rooms.json');
const rooms=JSON.parse(await readFile(source,'utf8'));
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try {
  await client.query('BEGIN');
  await client.query('CREATE TABLE IF NOT EXISTS guepard_rooms (id TEXT PRIMARY KEY, data JSONB NOT NULL)');
  let imported=0;
  for (const [id,room] of Object.entries(rooms)) {
    const result=await client.query('INSERT INTO guepard_rooms(id,data) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[id,JSON.stringify(room)]);
    imported+=result.rowCount||0;
  }
  await client.query('COMMIT');
  console.log(`${imported} salon(s) importé(s) dans PostgreSQL. Les salons déjà présents ont été conservés.`);
} catch(error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
