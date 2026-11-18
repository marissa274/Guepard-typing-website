import type {AnimalId} from './animals';
import type {RoomView,Settings,Invitation} from './room-types';
export interface PublicRoom {id:string;name:{fr:string;en:string};animal:AnimalId;language:'FR'|'EN';complexity:Settings['complexity'];capacity:number;host:string;players:number;state:RoomView['phase'];joinable:boolean;live:boolean}
export interface RoomReply {room?:RoomView;rooms?:PublicRoom[];id?:string;token?:string;left?:boolean;closed?:boolean;invitation?:Invitation;invitations?:Invitation[];error?:string;code?:string;roomId?:string;canCreate?:boolean}
