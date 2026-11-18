import type {ProfileAnimalId} from './animals';
export interface Account{id:string;username:string;avatar:ProfileAnimalId;avatarUrl?:string}
export interface Credentials{username:string;password:string;confirmation?:string;avatar?:string}
