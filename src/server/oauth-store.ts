import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {authDatabase,AuthError,createSession,type Account} from './auth-store';
export type OAuthProvider='github'|'discord';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');

export async function saveOAuthState(state:string,provider:OAuthProvider,verifier:string,redirectUri:string){
 const {pool,ready}=authDatabase();await ready;
 await pool.query('DELETE FROM guepard_oauth_states WHERE expires_at<now()');
 await pool.query('INSERT INTO guepard_oauth_states(state_hash,provider,verifier,redirect_uri,expires_at) VALUES($1,$2,$3,$4,$5)',[digest(state),provider,verifier,redirectUri,new Date(Date.now()+10*60*1000)]);
}
export async function consumeOAuthState(state:string,provider:OAuthProvider){
 const {pool,ready}=authDatabase();await ready;
 const result=await pool.query<{verifier:string;redirect_uri:string}>('DELETE FROM guepard_oauth_states WHERE state_hash=$1 AND provider=$2 AND expires_at>now() RETURNING verifier,redirect_uri',[digest(state),provider]);
 if(!result.rows[0])throw new AuthError('La connexion a expiré. Réessayez.',400);
 return result.rows[0];
}

/** Link by the provider's stable ID only. A matching email or display name never links accounts. */
export async function loginWithOAuth(provider:OAuthProvider,providerId:string,suggestedName:string){
 const {pool,ready}=authDatabase();await ready;
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[provider+':'+providerId]);
  const existing=await client.query<Account & {avatar_version?:string}>(`SELECT u.id,u.username,u.avatar,a.version AS avatar_version FROM guepard_oauth_accounts o JOIN guepard_users u ON u.id=o.user_id LEFT JOIN guepard_avatars a ON a.user_id=u.id WHERE o.provider=$1 AND o.provider_id=$2`,[provider,providerId]);
  let user:Account;
  if(existing.rows[0]){const row=existing.rows[0];user={id:row.id,username:row.username,avatar:row.avatar,...(row.avatar_version?{avatarUrl:`/api/avatars/${row.id}?v=${row.avatar_version}`}:{})}}
  else{
   const base=suggestedName.replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,15)||provider;
   const username=base+'_'+randomBytes(3).toString('hex'),id=randomUUID();
   await client.query('INSERT INTO guepard_users(id,username,username_key,password_hash,avatar) VALUES($1,$2,$3,NULL,$4)',[id,username,username.toLocaleLowerCase('fr'),'cheetah']);
   await client.query('INSERT INTO guepard_oauth_accounts(provider,provider_id,user_id) VALUES($1,$2,$3)',[provider,providerId,id]);
   user={id,username,avatar:'cheetah'};
  }
  const result=await createSession(client,user);await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
