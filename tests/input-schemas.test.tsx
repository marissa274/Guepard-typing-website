/** @jest-environment node */
import {describe,expect,test} from '@jest/globals';
import type {z} from 'zod';
import {authCommandSchema,avatarFormSchema,bearerSchema,contentLengthSchema,firstIssue,heatmapSchema,oauthCallbackQuerySchema,oauthProviderSchema,progressSchema,resultIdSchema,resultsQuerySchema,roomActionSchema,roomFiltersSchema,roomIdSchema,roomsCommandSchema,settingsPatchSchema} from '../src/server/schemas';
import {body} from '../src/server/http';

/** First reported issue, as surfaced to the client by the API. */
function rejection(schema:z.ZodType,value:unknown){
 const result=schema.safeParse(value);
 if(result.success)throw new Error('expected a rejection for '+JSON.stringify(value));
 return firstIssue(result.error);
}
function accepts(schema:z.ZodType,value:unknown){expect(schema.safeParse(value).success).toBe(true)}

describe('room actions (POST /api/rooms/[id]) use one schema per action',()=>{
 test('unknown, missing or non-string actions are refused',()=>{
  for(const value of [{},{action:'explode'},{action:42},{action:['join']}])expect(rejection(roomActionSchema,value)).toEqual({message:'Action inconnue.',status:400});
 });
 test.each([
  [{action:'join',role:'administrator'},'Rôle invalide.'],
  [{action:'join',nickname:42},'Le pseudo invité doit contenir de 3 à 20 caractères.'],
  [{action:'join',code:{toUpperCase:true}},'Le code du salon est incorrect.'],
  [{action:'join',invite:7},'Invitation expirée, révoquée ou introuvable.'],
  [{action:'invite',count:0},'Nombre d’invitations invalide.'],
  [{action:'invite',count:2.5},'Nombre d’invitations invalide.'],
  [{action:'revokeInvite'},'Invitation introuvable.'],
  [{action:'kick',personId:{}},'Participant introuvable.'],
  [{action:'role',personId:'p',role:'host'},'Rôle invalide.'],
  [{action:'bot',difficulty:'godlike'},'Niveau invalide.'],
  [{action:'difficulty',personId:'p'},'Bot ou niveau invalide.'],
  [{action:'settings'},'Paramètres invalides.'],
  [{action:'settings',settings:[]},'Paramètres invalides.'],
  [{action:'settings',settings:{capacity:31}},'La capacité doit être comprise entre 2 et 30.'],
  [{action:'settings',settings:{length:5}},'Valeur de paramètre hors limites.'],
  [{action:'settings',settings:{timeLimit:10}},'Valeur de paramètre hors limites.'],
  [{action:'settings',settings:{visibility:'secret'}},'Paramètres invalides.'],
  [{action:'settings',settings:{bonuses:'yes'}},'Option invalide.'],
  [{action:'settings',settings:{customText:'x'.repeat(15001)}},'Texte trop long.'],
 ])('%j is rejected with “%s”',(value,message)=>{expect(rejection(roomActionSchema,value)).toEqual({message,status:400})});
 test('valid actions are accepted and unknown fields (forged identities) are stripped',()=>{
  for(const action of ['leave','close','heartbeat','abandon','start','reset','rematch','bot','invite'])accepts(roomActionSchema,{action});
  accepts(roomActionSchema,{action:'join',nickname:'Sam',role:'spectator',code:null,invite:null});
  accepts(roomActionSchema,{action:'settings',settings:{capacity:4,timeLimit:0,textType:'words'}});
  expect(settingsPatchSchema.parse({capacity:4,unknown:true})).toEqual({capacity:4});
  expect(roomActionSchema.parse({action:'leave',identityKey:'user:admin',ipHash:'x',kind:'demo'})).toEqual({action:'leave'});
 });
});

describe('real-time progress messages',()=>{
 test.each([
  [{action:'progress'},'Saisie invalide.'],
  [{action:'progress',value:12},'Saisie invalide.'],
  [{action:'progress',value:'a'.repeat(20001)},'Saisie invalide.'],
  [{action:'progress',value:'a',typed:-1},'Le nombre de frappes est invalide.'],
  [{action:'progress',value:'a',typed:1.5},'Le nombre de frappes est invalide.'],
  [{action:'progress',value:'a',typed:'3'},'Le nombre de frappes est invalide.'],
  [{action:'progress',value:'a',heatmap:[]},'Les statistiques du clavier sont invalides.'],
  [{action:'progress',value:'a',heatmap:{ab:{hits:1,errors:0}}},'Les statistiques du clavier sont invalides.'],
  [{action:'progress',value:'a',heatmap:{a:{hits:-1,errors:0}}},'Les statistiques du clavier sont invalides.'],
  [{action:'progress',value:'a',heatmap:{a:{hits:1}}},'Les statistiques du clavier sont invalides.'],
 ])('%j is rejected with “%s”',(value,message)=>{expect(rejection(progressSchema,value).message).toBe(message);expect(rejection(roomActionSchema,value).message).toBe(message)});
 test('oversized heatmaps are refused and a valid message is accepted',()=>{
  const huge=Object.fromEntries(Array.from({length:257},(_,i)=>[String.fromCharCode(0x4e00+i),{hits:1,errors:0}]));
  expect(rejection(heatmapSchema,huge).message).toBe('Les statistiques du clavier sont invalides.');
  accepts(roomActionSchema,{action:'progress',value:'abc',typed:3,heatmap:{a:{hits:1,errors:0}}});
 });
 test('C2-B4: heatmap keys are one grapheme (base + combining marks), even when lower-casing produced two code units',()=>{
  for(const key of ['İ'.toLowerCase(),'e\u0301','\u0301','é','\uD83D'])accepts(heatmapSchema,{[key]:{hits:1,errors:0}});
  for(const key of ['','ab','i\u0307x','e'+'\u0301'.repeat(4)])expect(rejection(heatmapSchema,{[key]:{hits:1,errors:0}}).message).toBe('Les statistiques du clavier sont invalides.');
 });
});

describe('room creation and discovery (POST/GET /api/rooms)',()=>{
 test.each([
  [{action:'resolve'},'Code invalide.',400],
  [{action:'resolve',code:'X'.repeat(65)},'Code introuvable.',404],
  [{action:'quick',nickname:[]},'Le pseudo invité doit contenir de 3 à 20 caractères.',400],
  [{action:'nope'},'Action inconnue.',400],
  [{name:'Salon'},'Choisissez un animal pour la course.',400],
  [{name:'   ',animal:'cheetah'},'Donnez un nom au salon (80 caractères maximum).',400],
  [{name:'x'.repeat(81),animal:'cheetah'},'Donnez un nom au salon (80 caractères maximum).',400],
  [{name:'Salon',animal:'dragon'},'Choisissez un animal pour la course.',400],
  [{name:'Salon',animal:'cheetah',capacity:1},'La capacité doit être comprise entre 2 et 30.',400],
  [{name:'Salon',animal:'cheetah',visibility:'hidden'},'Paramètres invalides.',400],
  [{name:'Salon',animal:'cheetah',role:'owner'},'Rôle invalide.',400],
 ])('%j is rejected with “%s” (%i)',(value,message,status)=>{expect(rejection(roomsCommandSchema,value)).toEqual({message,status})});
 test('an omitted action still means creation and stays typed',()=>{
  expect(roomsCommandSchema.parse({name:'Salon',animal:'cheetah'})).toMatchObject({action:'create',name:'Salon'});
 });
 test('list filters are validated',()=>{
  expect(rejection(roomFiltersSchema,{language:'DE',complexity:null}).message).toBe('Filtres invalides.');
  expect(rejection(roomFiltersSchema,{language:null,complexity:'extreme'}).message).toBe('Filtres invalides.');
  expect(roomFiltersSchema.parse({language:'',complexity:null})).toEqual({language:undefined,complexity:undefined});
 });
});

describe('accounts (POST /api/auth)',()=>{
 const signup={action:'signup',username:'Jungle',password:'demo-secret',confirmation:'demo-secret',avatar:'parrot'};
 test.each([
  [{action:'hack'},'Action inconnue.',400],
  [{...signup,username:7},'Choisissez un nom d’utilisateur.',400],
  [{...signup,username:'ab'},'Le nom doit contenir 3 à 24 lettres, chiffres, tirets ou traits de soulignement.',400],
  [{...signup,username:'drop table;'},'Le nom doit contenir 3 à 24 lettres, chiffres, tirets ou traits de soulignement.',400],
  [{...signup,password:'short',confirmation:'short'},'Le mot de passe doit contenir entre 8 et 128 caractères.',400],
  [{...signup,confirmation:'different'},'Les mots de passe ne correspondent pas.',400],
  [{...signup,avatar:'dragon'},'Choisissez un animal.',400],
  [{action:'login',username:'Jungle'},'Nom d’utilisateur ou mot de passe incorrect.',401],
  [{action:'login',username:'Jungle',password:{}},'Nom d’utilisateur ou mot de passe incorrect.',401],
  [{action:'profile',username:'Jungle',avatar:3},'Choisissez un animal.',400],
  [{action:'password',password:'new-secret',confirmation:'new-secret'},'Le mot de passe actuel est incorrect.',401],
 ])('%j is rejected with “%s” (%i)',(value,message,status)=>{expect(rejection(authCommandSchema,value)).toEqual({message,status})});
 test('valid commands are accepted and usernames are trimmed',()=>{
  expect(authCommandSchema.parse({...signup,username:'  Jungle  '})).toMatchObject({username:'Jungle'});
  accepts(authCommandSchema,{action:'logout'});
 });
});

describe('route parameters, query strings, headers and upload fields',()=>{
 test('path identifiers map to 404 like a missing resource',()=>{
  expect(rejection(roomIdSchema,'x'.repeat(201))).toEqual({message:'Ce salon est fermé ou introuvable.',status:404});
  expect(rejection(resultIdSchema,'')).toEqual({message:'Résultat introuvable.',status:404});
  expect(rejection(oauthProviderSchema,'gitlab')).toEqual({message:'Fournisseur inconnu.',status:404});
 });
 test('pagination accepts defaults and refuses anything else',()=>{
  expect(resultsQuerySchema.parse({page:null,pageSize:null})).toEqual({page:1,pageSize:10});
  for(const value of [{page:'0',pageSize:null},{page:'abc',pageSize:null},{page:null,pageSize:'51'},{page:'1.5',pageSize:null},{page:'-2',pageSize:null}])expect(rejection(resultsQuerySchema,value).message).toBe('Pagination invalide.');
 });
 test('OAuth callback values are bounded',()=>{
  expect(oauthCallbackQuerySchema.safeParse({state:'s',code:'c'.repeat(2049),error:null}).success).toBe(false);
  expect(oauthCallbackQuerySchema.parse({state:'s',code:'',error:null})).toEqual({state:'s',code:undefined,error:undefined});
 });
 test('Bearer tokens and Content-Length are validated',()=>{
  expect(bearerSchema.parse('Bearer abc-123')).toBe('abc-123');
  for(const value of ['abc','Bearer ','Bearer a b','Bearer '+'a'.repeat(600),null])expect(bearerSchema.safeParse(value).success).toBe(false);
  expect(contentLengthSchema.parse('42')).toBe(42);expect(contentLengthSchema.parse(null)).toBeNull();
  expect(rejection(contentLengthSchema,'1e9')).toEqual({message:'Formulaire photo invalide.',status:400});
 });
 test('the avatar form requires a file within the size limit',()=>{
  const schema=avatarFormSchema(10);
  expect(rejection(schema,{photo:null})).toEqual({message:'Choisissez une photo.',status:400});
  expect(rejection(schema,{photo:'text field'})).toEqual({message:'Choisissez une photo.',status:400});
  expect(rejection(schema,{photo:new File(['x'.repeat(11)],'a.png',{type:'image/png'})})).toEqual({message:'La photo ne doit pas dépasser 2 Mo.',status:413});
  accepts(schema,{photo:new File(['x'],'a.png',{type:'image/png'})});
 });
});

describe('http.body validates JSON bodies against the given schema',()=>{
 const post=(payload:string,headers:Record<string,string>={})=>new Request('http://localhost:5173/api/rooms/r',{method:'POST',body:payload,headers});
 test('malformed JSON, non-objects and schema violations become 400 room errors',async()=>{
  await expect(body(post('{'),roomActionSchema)).rejects.toMatchObject({message:'Requête invalide.',status:400});
  await expect(body(post('[1]'),roomActionSchema)).rejects.toMatchObject({message:'Requête invalide.',status:400});
  await expect(body(post('{"action":"progress","value":1}'),roomActionSchema)).rejects.toMatchObject({message:'Saisie invalide.',status:400});
  await expect(body(post('{"action":"resolve","code":"'+'X'.repeat(70)+'"}'),roomsCommandSchema)).rejects.toMatchObject({message:'Code introuvable.',status:404});
 });
 test('a valid body is returned parsed and stripped',async()=>{
  await expect(body(post('{"action":"kick","personId":"p","identityKey":"user:x"}'),roomActionSchema)).resolves.toEqual({action:'kick',personId:'p'});
 });
 test('oversized bodies keep their 413',async()=>{
  await expect(body(post(JSON.stringify({action:'progress',value:'a'.repeat(70*1024)})),roomActionSchema)).rejects.toMatchObject({status:413});
 });
});
