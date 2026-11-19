import {z} from 'zod';
import {animals,profileAnimals} from '../lib/animals';
import type {AnimalId,ProfileAnimalId} from '../lib/animals';
import type {Difficulty,Settings,Visibility} from '../lib/room-types';
import type {OAuthProvider} from './oauth-store';

/**
 * Schémas de validation de toutes les entrées serveur (TECH-07).
 * Les messages reprennent ceux des couches métier afin que l'API reste identique pour les clients.
 */

export interface InputIssue {message:string;status:number}

/** Wrap a schema so that its failure reports a single message with a specific HTTP status. */
function withStatus<S extends z.ZodType>(schema:S,message:string,status:number){
 return z.unknown().refine(value=>schema.safeParse(value).success,{message,params:{status}}).pipe(schema);
}
export function firstIssue(error:z.ZodError,fallback='Requête invalide.'):InputIssue{
 const issue=error.issues[0];
 if(!issue)return {message:fallback,status:400};
 const status=issue.code==='custom'&&typeof issue.params?.status==='number'?issue.params.status:400;
 return {message:issue.message||fallback,status};
}
/** Parse an input or throw the error type of the calling layer. */
export function parseInput<S extends z.ZodType>(schema:S,value:unknown,fail:(issue:InputIssue)=>Error):z.output<S>{
 const result=schema.safeParse(value);
 if(!result.success)throw fail(firstIssue(result.error));
 return result.data;
}

const animalIds=animals.map(animal=>animal.id) as [AnimalId,...AnimalId[]];
const profileAnimalIds=profileAnimals.map(animal=>animal.id) as [ProfileAnimalId,...ProfileAnimalId[]];
const difficulties=['noob','beginner','medium','expert','impossible'] as const satisfies readonly Difficulty[];
const visibilities=['public','semi','private'] as const satisfies readonly Visibility[];
const languages=['FR','EN'] as const satisfies readonly Settings['language'][];
const complexities=['easy','medium','hard'] as const satisfies readonly Settings['complexity'][];
const roles=['player','spectator'] as const;
const oauthProviders=['github','discord'] as const satisfies readonly OAuthProvider[];
/** Fails to compile if a difficulty is added to the domain type without being accepted here. */
type Exhaustive<Listed,Domain>=[Domain] extends [Listed]?true:never;
const _difficultiesCovered:Exhaustive<typeof difficulties[number],Difficulty>=true;
const _providersCovered:Exhaustive<typeof oauthProviders[number],OAuthProvider>=true;
void _difficultiesCovered;void _providersCovered;

const identifier=(message:string)=>z.string({error:message}).min(1,message).max(200,message);
const nullableText=(max:number,message:string)=>z.string({error:message}).max(max,message).nullish().transform(value=>value??undefined);

// ---------- Paramètres de route et en-têtes ----------
/** Un paramètre de chemin invalide désigne une ressource inexistante (404). */
const pathId=(message:string)=>withStatus(z.string().min(1).max(200),message,404);
export const roomIdSchema=pathId('Ce salon est fermé ou introuvable.');
export const resultIdSchema=pathId('Résultat introuvable.');
export const avatarIdSchema=z.guid();
export const oauthProviderSchema=withStatus(z.enum(oauthProviders),'Fournisseur inconnu.',404);
/** `Authorization: Bearer <jeton>` ; tout autre format équivaut à l'absence de jeton. */
export const bearerSchema=z.string().max(512).regex(/^Bearer [\w-]+$/).transform(value=>value.slice(7));
export const contentLengthSchema=z.string().regex(/^\d{1,12}$/,'Formulaire photo invalide.').transform(Number).nullable();

// ---------- Paramètres de requête ----------
const emptyAsUndefined=(value:unknown)=>value===''||value===null?undefined:value;
export const roomFiltersSchema=z.object({
 language:z.preprocess(emptyAsUndefined,z.enum(languages,{error:'Filtres invalides.'}).optional()),
 complexity:z.preprocess(emptyAsUndefined,z.enum(complexities,{error:'Filtres invalides.'}).optional()),
});
const pageNumber=(fallback:number,max:number)=>z.preprocess(emptyAsUndefined,z.string().regex(/^\d{1,6}$/,'Pagination invalide.').optional())
 .transform(value=>value===undefined?fallback:Number(value)).pipe(z.number().int().min(1,'Pagination invalide.').max(max,'Pagination invalide.'));
export const resultsQuerySchema=z.object({page:pageNumber(1,100000),pageSize:pageNumber(10,50)});
export const oauthStartQuerySchema=z.object({format:z.preprocess(emptyAsUndefined,z.string().max(16).optional())});
const oauthValue=z.preprocess(emptyAsUndefined,z.string().max(2048).optional());
export const oauthCallbackQuerySchema=z.object({state:oauthValue,code:oauthValue,error:oauthValue});

// ---------- Réglages de salon ----------
const settingsInvalid='Paramètres invalides.',outOfRange='Valeur de paramètre hors limites.',optionInvalid='Option invalide.',tooLong='Texte trop long.';
const bounded=(min:number,max:number,message=outOfRange)=>z.number({error:message}).int(message).min(min,message).max(max,message);
const flag=z.boolean({error:optionInvalid});
const capacityMessage='La capacité doit être comprise entre 2 et 30.';
const settingsShape:{[Key in keyof Settings]-?:z.ZodType<Settings[Key]>}={
 visibility:z.enum(visibilities,{error:settingsInvalid}),
 capacity:bounded(2,30,capacityMessage),
 language:z.enum(languages,{error:settingsInvalid}),
 textType:z.enum(['story','words','custom'],{error:settingsInvalid}),
 complexity:z.enum(complexities,{error:settingsInvalid}),
 uppercase:flag,
 whitelist:z.string({error:tooLong}).max(100,tooLong),
 length:bounded(20,1000),
 timeLimit:z.number({error:outOfRange}).int(outOfRange).refine(value=>value===0||value>=30&&value<=600,outOfRange),
 blockErrors:flag,
 punctuation:flag,
 accents:flag,
 numbers:flag,
 specials:flag,
 blacklist:z.string({error:tooLong}).max(100,tooLong),
 customText:z.string({error:tooLong}).max(15000,tooLong),
 bank:z.enum(['jungle','adventure','science'],{error:settingsInvalid}),
 targetWpm:bounded(0,400),
 inactiveAfter:bounded(15,600),
 bonuses:flag,
};
export const settingsPatchSchema=z.object(settingsShape,{error:settingsInvalid}).partial();

// ---------- Actions d'un salon : POST /api/rooms/[id] ----------
const role=z.enum(roles,{error:'Rôle invalide.'});
const nickname=z.string({error:'Le pseudo invité doit contenir de 3 à 20 caractères.'}).max(40,'Le pseudo invité doit contenir de 3 à 20 caractères.').optional();
const personId=identifier('Participant introuvable.');
const difficulty=(message:string)=>z.enum(difficulties,{error:message});
const heatmapError='Les statistiques du clavier sont invalides.';
const counter=(message:string)=>z.number({error:message}).int(message).min(0,message).max(Number.MAX_SAFE_INTEGER,message);
export const heatmapSchema=z.record(z.string({error:heatmapError}).length(1,heatmapError),z.object({hits:counter(heatmapError),errors:counter(heatmapError)},{error:heatmapError}),{error:heatmapError})
 .refine(heatmap=>Object.keys(heatmap).length<=256,heatmapError);
/** Message temps réel de progression envoyé pendant la course. */
export const progressSchema=z.object({
 action:z.literal('progress'),
 value:z.string({error:'Saisie invalide.'}).max(20000,'Saisie invalide.'),
 typed:counter('Le nombre de frappes est invalide.').optional(),
 heatmap:heatmapSchema.optional(),
});
const bare=<A extends string>(action:A)=>z.object({action:z.literal(action)});
export const roomActionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('join'),nickname,role:role.optional(),code:nullableText(32,'Le code du salon est incorrect.'),invite:nullableText(200,'Invitation expirée, révoquée ou introuvable.')}),
 bare('leave'),bare('close'),bare('heartbeat'),bare('abandon'),bare('start'),bare('reset'),bare('rematch'),
 z.object({action:z.literal('invite'),count:bounded(1,30,'Nombre d’invitations invalide.').optional()}),
 z.object({action:z.literal('revokeInvite'),invite:identifier('Invitation introuvable.')}),
 z.object({action:z.literal('kick'),personId}),
 z.object({action:z.literal('role'),personId,role}),
 z.object({action:z.literal('bot'),difficulty:difficulty('Niveau invalide.').optional()}),
 z.object({action:z.literal('difficulty'),personId:identifier('Bot ou niveau invalide.'),difficulty:difficulty('Bot ou niveau invalide.')}),
 z.object({action:z.literal('settings'),settings:settingsPatchSchema}),
 progressSchema,
],{error:'Action inconnue.'});
export type RoomAction=z.output<typeof roomActionSchema>;

// ---------- Salons : POST /api/rooms ----------
export const roomsCommandSchema=z.preprocess(
 value=>value&&typeof value==='object'&&!Array.isArray(value)&&(value as {action?:unknown}).action===undefined?{...value,action:'create'}:value,
 z.discriminatedUnion('action',[
  z.object({action:z.literal('resolve'),code:z.string({error:'Code invalide.'}).refine(code=>code.length<=64,{message:'Code introuvable.',params:{status:404}})}),
  z.object({action:z.literal('quick'),nickname}),
  bare('leave-current'),
  z.object({
   action:z.literal('create'),
   nickname,
   name:z.string({error:'Donnez un nom au salon (80 caractères maximum).'}).max(80,'Donnez un nom au salon (80 caractères maximum).').refine(value=>value.trim().length>0,'Donnez un nom au salon (80 caractères maximum).'),
   animal:z.enum(animalIds,{error:'Choisissez un animal pour la course.'}),
   visibility:z.enum(visibilities,{error:settingsInvalid}).optional(),
   language:z.enum(languages,{error:settingsInvalid}).optional(),
   capacity:bounded(2,30,capacityMessage).optional(),
   role:role.optional(),
  }),
 ],{error:'Action inconnue.'}),
);
export type RoomsCommand=z.output<typeof roomsCommandSchema>;

// ---------- Comptes : POST /api/auth ----------
const usernameRule='Le nom doit contenir 3 à 24 lettres, chiffres, tirets ou traits de soulignement.';
export const usernameSchema=z.string({error:'Choisissez un nom d’utilisateur.'}).trim().min(3,usernameRule).max(24,usernameRule).regex(/^[-_\p{L}\p{N}]+$/u,usernameRule);
const passwordRule='Le mot de passe doit contenir entre 8 et 128 caractères.';
export const passwordSchema=z.string({error:passwordRule}).min(8,passwordRule).max(128,passwordRule);
const mismatch='Les mots de passe ne correspondent pas.';
const confirmation=z.string({error:mismatch}).max(128,mismatch);
const avatar=z.enum(profileAnimalIds,{error:'Choisissez un animal.'});
const loginFailure='Nom d’utilisateur ou mot de passe incorrect.';
const sameConfirmation=(value:{password:string;confirmation:string})=>value.password===value.confirmation;
export const authCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('signup'),username:usernameSchema,password:passwordSchema,confirmation,avatar}).refine(sameConfirmation,{message:mismatch,path:['confirmation']}),
 z.object({action:z.literal('login'),username:usernameSchema,password:withStatus(z.string().min(1).max(128),loginFailure,401)}),
 z.object({action:z.literal('profile'),username:usernameSchema,avatar}),
 z.object({action:z.literal('password'),password:passwordSchema,confirmation,currentPassword:withStatus(z.string().min(1).max(128),'Le mot de passe actuel est incorrect.',401)}).refine(sameConfirmation,{message:mismatch,path:['confirmation']}),
 bare('logout'),
],{error:'Action inconnue.'});
export type AuthCommand=z.output<typeof authCommandSchema>;

// ---------- Photo de profil : POST /api/auth/avatar (multipart) ----------
export interface UploadedFile {size:number;type:string;arrayBuffer():Promise<ArrayBuffer>}
function isUploadedFile(value:unknown):value is UploadedFile{
 return typeof value==='object'&&value!==null&&'arrayBuffer' in value&&typeof value.arrayBuffer==='function'&&'size' in value&&typeof value.size==='number'&&'type' in value&&typeof value.type==='string';
}
export function avatarFormSchema(maximumBytes:number){
 return z.object({
  photo:z.custom<UploadedFile>(isUploadedFile,{error:'Choisissez une photo.'})
   .refine(photo=>photo.size<=maximumBytes,{message:'La photo ne doit pas dépasser 2 Mo.',params:{status:413}}),
 });
}
