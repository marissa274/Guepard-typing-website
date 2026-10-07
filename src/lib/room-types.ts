import type {AnimalId,ProfileAnimalId} from './animals';
export type Visibility='public'|'semi'|'private';
export type Difficulty='beginner'|'medium'|'expert'|'impossible';
export interface Settings {visibility:Visibility;language:'FR'|'EN';textType:'story'|'words'|'custom';length:number;timeLimit:number;blockErrors:boolean;punctuation:boolean;accents:boolean;numbers:boolean;specials:boolean;blacklist:string;customText:string;bank:'jungle'|'adventure'|'science';targetWpm:number;inactiveAfter:number}
export interface Person {id:string;name:string;animal:ProfileAnimalId;kind:'guest'|'demo'|'bot';role:'player'|'spectator';late:boolean;difficulty?:Difficulty;token?:string;seen:number;lastInput?:number;input?:string;progress:number;errors:number;typed:number;finishedAt?:number;abandoned:boolean}
export interface Room {id:string;name:string;animal:AnimalId;code:string;hostId:string;people:Person[];settings:Settings;phase:'waiting'|'running'|'finished';createdAt:number;revision:number;startedAt?:number;lastTick?:number;text?:string;invites:{token:string;expires:number;used:boolean}[]}
export interface RoomView extends Omit<Room,'invites'> {me:string;isHost:boolean;players:number;serverNow:number}
export const defaultSettings:Settings={visibility:'semi',language:'FR',textType:'story',length:50,timeLimit:120,blockErrors:false,punctuation:true,accents:true,numbers:false,specials:false,blacklist:'',customText:'',bank:'jungle',targetWpm:0,inactiveAfter:120};
