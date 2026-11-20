import {createHash,randomBytes,randomUUID,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {Pool} from 'pg';
import {isProfileAnimal} from '../lib/animals';
import {authSchema} from './auth-schema';
import {AuthError} from './auth-error';
export {AuthError} from './auth-error';

const scrypt=promisify(scryptCallback);
const lifetime=30*24*60*60*1000;
const runtime=globalThis as typeof globalThis & {guepardAuth?:{pool:Pool;ready:Promise<unknown>}};
import type {Account} from '../lib/auth-types';
export type {Account} from '../lib/auth-types';
type AccountRow=Account & {avatar_version?:string;password_hash?:string|null};
type AccountBody={username?:unknown;password?:unknown;confirmation?:unknown;avatar?:unknown;currentPassword?:unknown};
function accountView(row:AccountRow):Account{return {id:row.id,username:row.username,avatar:row.avatar,...(row.avatar_version?{avatarUrl:`/api/avatars/${row.id}?v=${row.avatar_version}`}:{})}}

export function authDatabase(){
 if(!process.env.DATABASE_URL)throw new AuthError('La base de données est indisponible.',503);
 if(!runtime.guepardAuth){
  const pool=new Pool({connectionString:process.env.DATABASE_URL,max:8});
  const ready=pool.query(authSchema);
  runtime.guepardAuth={pool,ready};
 }
 return runtime.guepardAuth;
}
function cleanUsername(value:unknown){
 if(typeof value!=='string')throw new AuthError('Choisissez un nom d’utilisateur.');
 const username=value.trim();
 if(username.length<3||username.length>24||!/^[-_\p{L}\p{N}]+$/u.test(username))throw new AuthError('Le nom doit contenir 3 à 24 lettres, chiffres, tirets ou traits de soulignement.');
 return username;
}
function cleanPassword(value:unknown){if(typeof value!=='string'||value.length<8||value.length>128)throw new AuthError('Le mot de passe doit contenir entre 8 et 128 caractères.');return value}
async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64) as Buffer;return `scrypt$${salt}$${hash.toString('hex')}`}
async function checkPassword(password:string,stored:string|null|undefined){if(!stored)return false;const [algorithm,salt,hex]=stored.split('$');if(algorithm!=='scrypt'||!salt||!hex)return false;const expected=Buffer.from(hex,'hex');const actual=await scrypt(password,salt,expected.length) as Buffer;return expected.length===actual.length&&timingSafeEqual(expected,actual)}
/** Verified when the username is unknown (or has no password) so that a login attempt costs one scrypt either way and response time does not reveal which accounts exist. */
const decoyHash=`scrypt$decoy-salt$${'0'.repeat(128)}`;
const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function createSession(pool:Pick<Pool,'query'>,user:Account){const token=randomBytes(32).toString('base64url');await pool.query('INSERT INTO guepard_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[tokenHash(token),user.id,new Date(Date.now()+lifetime)]);return {user,token}}
export async function signup(body:AccountBody){
 const username=cleanUsername(body?.username),password=cleanPassword(body?.password);
 if(body?.confirmation!==password)throw new AuthError('Les mots de passe ne correspondent pas.');
 if(!isProfileAnimal(body?.avatar))throw new AuthError('Choisissez un animal.');
 const {pool,ready}=authDatabase();await ready;
 const hash=await hashPassword(password),id=randomUUID();
 try{await pool.query('INSERT INTO guepard_users(id,username,username_key,password_hash,avatar) VALUES($1,$2,$3,$4,$5)',[id,username,username.toLocaleLowerCase('fr'),hash,body.avatar])}
 catch(error){if((error as {code?:string}).code==='23505')throw new AuthError('Ce nom d’utilisateur est déjà pris.',409);throw error}
 return createSession(pool,{id,username,avatar:body.avatar});
}
export async function login(body:AccountBody){
 const username=cleanUsername(body?.username),password=String(body?.password||'');
 if(!password||password.length>128)throw new AuthError('Nom d’utilisateur ou mot de passe incorrect.',401);
 const {pool,ready}=authDatabase();await ready;
 const result=await pool.query('SELECT u.id,u.username,u.avatar,u.password_hash,a.version AS avatar_version FROM guepard_users u LEFT JOIN guepard_avatars a ON a.user_id=u.id WHERE u.username_key=$1',[username.toLocaleLowerCase('fr')]);
 const row=result.rows[0];
 const passwordMatches=await checkPassword(password,row?.password_hash||decoyHash);
 if(!row||!passwordMatches)throw new AuthError('Nom d’utilisateur ou mot de passe incorrect.',401);
 return createSession(pool,accountView(row));
}
export async function currentUser(token:string|undefined){
 if(!token)return null;
 const {pool,ready}=authDatabase();await ready;
 const result=await pool.query('SELECT u.id,u.username,u.avatar,a.version AS avatar_version FROM guepard_sessions s JOIN guepard_users u ON u.id=s.user_id LEFT JOIN guepard_avatars a ON a.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now()',[tokenHash(token)]);
 return result.rows[0]?accountView(result.rows[0] as AccountRow):null;
}
export async function requireAccount(token:string|undefined){
 const account=await currentUser(token);
 if(!account)throw new AuthError('Reconnectez-vous pour modifier votre compte.',401);
 return account;
}
export async function updateProfile(token:string|undefined,body:AccountBody){
 const account=await requireAccount(token),username=cleanUsername(body?.username);
 if(!isProfileAnimal(body?.avatar))throw new AuthError('Choisissez un animal.');
 const {pool}=authDatabase();
 try{
  const result=await pool.query('UPDATE guepard_users SET username=$1,username_key=$2,avatar=$3 WHERE id=$4 RETURNING id,username,avatar',[username,username.toLocaleLowerCase('fr'),body.avatar,account.id]);
  if(!result.rows[0])throw new AuthError('Compte introuvable.',401);
  return {...accountView(result.rows[0] as AccountRow),...(account.avatarUrl?{avatarUrl:account.avatarUrl}:{})};
 }catch(error){if((error as {code?:string}).code==='23505')throw new AuthError('Ce nom d’utilisateur est déjà pris.',409);throw error}
}
export async function changePassword(token:string|undefined,body:AccountBody){
 const account=await requireAccount(token),password=cleanPassword(body?.password);
 if(body?.confirmation!==password)throw new AuthError('Les mots de passe ne correspondent pas.');
 if(typeof body?.currentPassword!=='string'||!body.currentPassword||body.currentPassword.length>128)throw new AuthError('Le mot de passe actuel est incorrect.',401);
 const {pool}=authDatabase(),stored=await pool.query('SELECT password_hash FROM guepard_users WHERE id=$1',[account.id]);
 const previousHash=stored.rows[0]?.password_hash;
 if(!previousHash||!await checkPassword(body.currentPassword,previousHash))throw new AuthError('Le mot de passe actuel est incorrect.',401);
 const hash=await hashPassword(password);
 // Comparing the old hash prevents simultaneous password changes from overwriting each other.
 const result=await pool.query(`WITH changed AS (
  UPDATE guepard_users SET password_hash=$1 WHERE id=$2 AND password_hash=$3 RETURNING id
 ), revoked AS (
  DELETE FROM guepard_sessions WHERE user_id IN (SELECT id FROM changed) AND token_hash<>$4
 ) SELECT id FROM changed`,[hash,account.id,previousHash,tokenHash(token!)]);
 if(!result.rows[0])throw new AuthError('Le compte a changé. Réessayez.',409);
}
export async function logout(token:string|undefined){if(!token)return;const {pool,ready}=authDatabase();await ready;await pool.query('DELETE FROM guepard_sessions WHERE token_hash=$1',[tokenHash(token)])}
export const sessionMaxAge=Math.floor(lifetime/1000);

export async function putAvatar(token:string|undefined,data:Buffer){
 const user=await requireAccount(token),version=randomUUID(),{pool}=authDatabase();
 await pool.query('INSERT INTO guepard_avatars(user_id,data,version) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET data=EXCLUDED.data,version=EXCLUDED.version,updated_at=now()',[user.id,data,version]);
 return {...user,avatarUrl:`/api/avatars/${user.id}?v=${version}`};
}
export async function removeAvatar(token:string|undefined){
 const user=await requireAccount(token),{pool}=authDatabase();
 await pool.query('DELETE FROM guepard_avatars WHERE user_id=$1',[user.id]);
 return {id:user.id,username:user.username,avatar:user.avatar};
}
export async function readAvatar(userId:string){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))return null;
 const {pool,ready}=authDatabase();await ready;
 const result=await pool.query<{data:Buffer;version:string}>('SELECT data,version FROM guepard_avatars WHERE user_id=$1',[userId]);
 return result.rows[0]||null;
}
