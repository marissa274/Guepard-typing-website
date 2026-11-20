import type {ProfileAnimalId} from './animals';
import type {ResultSummary} from './result-types';
export type Language='fr'|'en';
export type {Account} from './auth-types';
export interface SessionResult {id:string;date:number;speed:number;accuracy:number|null;score?:number|null;rank?:number;won?:boolean;roomName?:string;personalBest?:boolean}
export interface LegacyRace {id:string;name:{fr:string;en:string};language:string;players:number;max:number;animal:string;color:string;state:string;private?:boolean;code?:string}
export interface SiteState {lang:Language;dark:boolean;user:boolean;name:string;nameIsDefault:boolean;avatar:ProfileAnimalId;avatarUrl?:string;results:SessionResult[];privateRaces:LegacyRace[];summary:ResultSummary|null}
