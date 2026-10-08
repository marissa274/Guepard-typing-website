import {createHash,randomBytes,randomUUID,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {Pool} from 'pg';
import {isProfileAnimal} from '../lib/animals';

const scrypt=promisify(scryptCallback);
const lifetime=30*24*60*60*1000;
const runtime=globalThis as typeof globalThis & {guepardAuth?:{pool:Pool;ready:Promise<unknown>}};
type Account={id:string;username:string;avatar:string};

function database(){
 if(!process.env.DATABASE_URL)throw new AuthError('La base de données est indisponible.',503);
 if(!runtime.guepardAuth){
  const pool=new Pool({connectionString:process.env.DATABASE_URL,max:8});
  const ready=pool.query(`CREATE TABLE IF NOT EXISTS guepard_users (
   id UUID PRIMARY KEY, username TEXT NOT NULL, username_key TEXT NOT NULL UNIQUE,
   password_hash TEXT NOT NULL, avatar TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  ); CREATE TABLE IF NOT EXISTS guepard_sessions (
   token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES guepard_users(id) ON DELETE CASCADE,
   expires_at TIMESTAMPTZ NOT NULL
  );`);
  runtime.guepardAuth={pool,ready};
 }
 return runtime.guepardAuth;
}
export class AuthError extends Error{constructor(message:string,public status=400){super(message)}}
function cleanUsername(value:unknown){
 if(typeof value!=='string')throw new AuthError('Choisissez un nom d’utilisateur.');
 const username=value.trim();
 if(username.length<3||username.length>24||!/^[-_\p{L}\p{N}]+$/u.test(username))throw new AuthError('Le nom doit contenir 3 à 24 lettres, chiffres, tirets ou traits de soulignement.');
 return username;
}
function cleanPassword(value:unknown){if(typeof value!=='string'||value.length<8||value.length>128)throw new AuthError('Le mot de passe doit contenir entre 8 et 128 caractères.');return value}
async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64) as Buffer;return `scrypt$${salt}$${hash.toString('hex')}`}
async function checkPassword(password:string,stored:string){const [algorithm,salt,hex]=stored.split('$');if(algorithm!=='scrypt'||!salt||!hex)return false;const expected=Buffer.from(hex,'hex');const actual=await scrypt(password,salt,expected.length) as Buffer;return expected.length===actual.length&&timingSafeEqual(expected,actual)}
const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
async function session(pool:Pool,user:Account){const token=randomBytes(32).toString('base64url');await pool.query('INSERT INTO guepard_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[tokenHash(token),user.id,new Date(Date.now()+lifetime)]);return {user,token}}
export async function signup(body:any){
 const username=cleanUsername(body?.username),password=cleanPassword(body?.password);
 if(body?.confirmation!==password)throw new AuthError('Les mots de passe ne correspondent pas.');
 if(!isProfileAnimal(body?.avatar))throw new AuthError('Choisissez un animal.');
 const {pool,ready}=database();await ready;
 const hash=await hashPassword(password),id=randomUUID();
 try{await pool.query('INSERT INTO guepard_users(id,username,username_key,password_hash,avatar) VALUES($1,$2,$3,$4,$5)',[id,username,username.toLocaleLowerCase('fr'),hash,body.avatar])}
 catch(error){if((error as {code?:string}).code==='23505')throw new AuthError('Ce nom d’utilisateur est déjà pris.',409);throw error}
 return session(pool,{id,username,avatar:body.avatar});
}
export async function login(body:any){
 const username=cleanUsername(body?.username),password=String(body?.password||'');
 if(!password||password.length>128)throw new AuthError('Nom d’utilisateur ou mot de passe incorrect.',401);
 const {pool,ready}=database();await ready;
 const result=await pool.query('SELECT id,username,avatar,password_hash FROM guepard_users WHERE username_key=$1',[username.toLocaleLowerCase('fr')]);
 const row=result.rows[0];
 if(!row||!await checkPassword(password,row.password_hash))throw new AuthError('Nom d’utilisateur ou mot de passe incorrect.',401);
 return session(pool,{id:row.id,username:row.username,avatar:row.avatar});
}
export async function currentUser(token:string|undefined){
 if(!token)return null;
 const {pool,ready}=database();await ready;
 const result=await pool.query('SELECT u.id,u.username,u.avatar FROM guepard_sessions s JOIN guepard_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[tokenHash(token)]);
 return (result.rows[0] as Account|undefined)||null;
}
export async function logout(token:string|undefined){if(!token)return;const {pool,ready}=database();await ready;await pool.query('DELETE FROM guepard_sessions WHERE token_hash=$1',[tokenHash(token)])}
export const sessionMaxAge=Math.floor(lifetime/1000);
