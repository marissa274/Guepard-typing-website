import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {afterEach,describe,expect,jest,test} from '@jest/globals';
import {clientError} from '../src/i18n/errors';
import {roomErrorMessage} from '../src/lib/room-copy';
import {RoomRequestError,roomRequest} from '../src/lib/room-client';
import {authService} from '../src/services/auth';

const files=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(dir,entry.name)):[join(dir,entry.name)]);
const english=readFileSync(join(__dirname,'../src/i18n/errors.ts'),'utf8');
/** Operator-facing log or startup messages that never reach the interface. */
const internal=new Set(['Aucun proxy déclaré.']);

afterEach(()=>{document.documentElement.lang='fr';jest.restoreAllMocks()});

describe('I18N-01 : messages d’erreur du serveur',()=>{
 test('every user-facing message written in the server sources has an English translation',()=>{
  const missing=new Set<string>();
  for(const file of [...files(join(__dirname,'../src/server')),...files(join(__dirname,'../app/api'))]){
   const source=readFileSync(file,'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
   for(const match of source.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)){
    const text=match[1].replace(/\\'/g,"'");
    if(/^[A-ZÀ-Ý][^']*\.$/.test(text)&&!/GUEPARD_|AUTH_SECRET/.test(text)&&!internal.has(text)&&!english.includes(`'${text.replace(/'/g,"\\'")}':`))missing.add(`${file}: ${text}`);
   }
  }
  expect([...missing]).toEqual([]);
 });

 test('a room error is shown in English when the language is English and in French otherwise',async()=>{
  const reply={ok:false,status:404,json:async()=>({error:'Ce salon est fermé ou introuvable.'})} as Response;
  global.fetch=jest.fn(async()=>reply) as unknown as typeof fetch;
  document.documentElement.lang='en';
  const failure=await roomRequest('abc').catch(error=>error as unknown);
  expect(failure).toBeInstanceOf(RoomRequestError);
  expect(roomErrorMessage(failure,false)).toBe('This lobby is closed or could not be found.');
  document.documentElement.lang='fr';
  const french=await roomRequest('abc').catch(error=>error as unknown);
  expect(roomErrorMessage(french,true)).toBe('Ce salon est fermé ou introuvable.');
 });

 test('a network failure falls back to the generic localized text',()=>{
  expect(roomErrorMessage(new TypeError('Failed to fetch'),false)).toBe('The request could not be completed. Try again.');
  expect(roomErrorMessage(new TypeError('Failed to fetch'),true)).toBe('Failed to fetch');
 });

 test('an authentication error is shown in English when the language is English and in French otherwise',async()=>{
  const reply={ok:false,status:401,json:async()=>({error:'Nom d’utilisateur ou mot de passe incorrect.'})} as Response;
  global.fetch=jest.fn(async()=>reply) as unknown as typeof fetch;
  document.documentElement.lang='en';
  await expect(authService.submit({username:'a',password:'b',confirmation:'',avatar:'cheetah'},'login')).rejects.toThrow('Incorrect username or password.');
  document.documentElement.lang='fr';
  await expect(authService.submit({username:'a',password:'b',confirmation:'',avatar:'cheetah'},'login')).rejects.toThrow('Nom d’utilisateur ou mot de passe incorrect.');
  expect(clientError('Rôle invalide.','en')).toBe('Invalid role.');
 });
});
