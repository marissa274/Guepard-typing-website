import {randomBytes,scrypt as scryptCallback} from 'node:crypto';
import {promisify} from 'node:util';
import pg from 'pg';
import {initialCorpus} from '../src/data/corpus.ts';
import {seedDemo} from './seed-demo.ts';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL est requis.');
const demoPassword=process.env.GUEPARD_DEMO_PASSWORD||(process.env.NODE_ENV==='production'?'':'GuepardDemo2026!');
if(demoPassword.length<8||demoPassword.length>128)throw new Error('Définissez GUEPARD_DEMO_PASSWORD (8 à 128 caractères) pour créer les comptes de démonstration en production.');
const client=new pg.Client({connectionString:process.env.DATABASE_URL}),scrypt=promisify(scryptCallback);
async function passwordHash(){const salt=randomBytes(16).toString('hex'),hash=await scrypt(demoPassword,salt,64) as Buffer;return `scrypt$${salt}$${hash.toString('hex')}`}
await client.connect();
try{
 await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(74120933)');
 const summary=await seedDemo(client,{corpus:initialCorpus,passwordHash});
 await client.query('COMMIT');
 console.log(`Corpus (${summary.corpus} entrées) et ${summary.races} résultats de démonstration présents. Les données existantes ont été conservées.`);
 for(const user of summary.users)console.log(` - ${user.username} : ${user.status==='created'?'créé':user.status==='existing'?'déjà présent':'ignoré (pseudo déjà pris par un autre compte)'}`);
}catch(error){await client.query('ROLLBACK');throw error}finally{await client.end()}
