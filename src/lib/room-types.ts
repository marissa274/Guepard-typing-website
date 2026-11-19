import type {AnimalId,ProfileAnimalId} from './animals';
export type Visibility='public'|'semi'|'private';
export type Difficulty='noob'|'beginner'|'medium'|'expert'|'impossible';
export interface Settings {visibility:Visibility;capacity:number;language:'FR'|'EN';textType:'story'|'words'|'custom';complexity:'easy'|'medium'|'hard';uppercase:boolean;whitelist:string;length:number;timeLimit:number;blockErrors:boolean;punctuation:boolean;accents:boolean;numbers:boolean;specials:boolean;blacklist:string;customText:string;bank:'jungle'|'adventure'|'science';targetWpm:number;inactiveAfter:number;bonuses:boolean}
export type Heatmap=Record<string,{hits:number;errors:number}>;
export interface TelemetryPoint {at:number;wpm:number;grossWpm:number;progress:number}
export interface Pause {start:number;end:number}
export type BonusType='shortcut'|'detour'|'pause';
export interface BonusEvent {checkpoint:25|50|75;type:BonusType;recipientId:string;targetId:string;at:number}
export interface Person {id:string;userId?:string;identityKey?:string;ipHash?:string;joinedAt?:number;name:string;avatarUrl?:string;animal:ProfileAnimalId;kind:'guest'|'demo'|'bot';role:'player'|'spectator';late:boolean;difficulty?:Difficulty;token?:string;seen:number;lastInput?:number;input?:string;progress:number;errors:number;typed:number;finishedAt?:number;abandoned:boolean;abandonedAt?:number;targetText?:string;telemetry?:TelemetryPoint[];heatmap?:Heatmap;bonusReceived?:number;pausedUntil?:number;pauses?:Pause[];lastProgressAt?:number;typingBudget?:number}
export interface Invitation {token:string;expires:number;used:boolean;usedBy?:string;usedName?:string;ipHash?:string;identityKey?:string;revoked?:boolean}
/** Temporary IP ban left by a kicked guest (SALLE-07, C2-B1): refuses new guest identities from that fingerprint until `until`. */
export interface IpBan {hash:string;until:number}
export interface Room {id:string;name:string;animal:AnimalId;code:string;hostId:string;people:Person[];settings:Settings;phase:'waiting'|'countdown'|'running'|'finished';createdAt:number;revision:number;startedAt?:number;endedAt?:number;lastTick?:number;text?:string;invites:Invitation[];bannedIdentities?:string[];bannedIpHashes?:IpBan[];bonusCheckpoints?:number[];bonusEvents?:BonusEvent[]}
export interface RoomView extends Omit<Room,'invites'|'bannedIdentities'|'bannedIpHashes'> {me:string;isHost:boolean;players:number;serverNow:number;personalBest?:boolean;invitations?:Pick<Invitation,'token'|'expires'|'used'|'usedName'|'revoked'>[]}
export const defaultSettings:Settings={visibility:'semi',capacity:8,language:'FR',textType:'story',complexity:'medium',uppercase:true,whitelist:'',length:50,timeLimit:120,blockErrors:false,punctuation:true,accents:true,numbers:false,specials:false,blacklist:'',customText:'',bank:'jungle',targetWpm:0,inactiveAfter:120,bonuses:false};
