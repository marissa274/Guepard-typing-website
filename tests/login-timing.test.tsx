import {beforeEach,expect,jest,test} from '@jest/globals';
import {scryptSync} from 'node:crypto';
import {login} from '../src/server/auth-store';
type QueryArgs=[sql:string,params?:unknown[]];
const mockQuery=jest.fn<(...args:QueryArgs)=>Promise<{rows?:unknown[]}>>();
const mockScrypt=jest.fn();
jest.mock('node:crypto',()=>{const actual=jest.requireActual<typeof import('node:crypto')>('node:crypto');return {...actual,scrypt:(...args:unknown[])=>{mockScrypt(...args);return (actual.scrypt as (...a:unknown[])=>void)(...args)}}});
jest.mock('pg',()=>({Pool:jest.fn().mockImplementation(()=>({query:(...args:QueryArgs)=>mockQuery(...args)}))}));
const failure={status:401,message:'Nom d’utilisateur ou mot de passe incorrect.'};
beforeEach(()=>{process.env.DATABASE_URL='postgres://test';Reflect.deleteProperty(globalThis,'guepardAuth');mockQuery.mockReset();mockScrypt.mockClear()});
test('an unknown username still runs a scrypt verification and fails like a wrong password',async()=>{
 mockQuery.mockImplementation(async()=>({rows:[]}));
 await expect(login({username:'nobody',password:'whatever-secret'})).rejects.toMatchObject(failure);
 expect(mockScrypt).toHaveBeenCalledTimes(1);
});
test('an account without a password hash also runs scrypt and fails the same way',async()=>{
 mockQuery.mockImplementation(async(sql)=>sql.startsWith('SELECT u.id')?{rows:[{id:'1',username:'Oauth',avatar:'cheetah',password_hash:null}]}:{});
 await expect(login({username:'Oauth',password:'whatever-secret'})).rejects.toMatchObject(failure);
 expect(mockScrypt).toHaveBeenCalledTimes(1);
});
test('a wrong password on a real account fails identically, with one scrypt',async()=>{
 const salt='salt',password_hash=`scrypt$${salt}$${scryptSync('right-secret',salt,64).toString('hex')}`;
 mockQuery.mockImplementation(async(sql)=>sql.startsWith('SELECT u.id')?{rows:[{id:'1',username:'Jungle',avatar:'cheetah',password_hash}]}:{});
 await expect(login({username:'Jungle',password:'wrong-secret'})).rejects.toMatchObject(failure);
 expect(mockScrypt).toHaveBeenCalledTimes(1);
});
