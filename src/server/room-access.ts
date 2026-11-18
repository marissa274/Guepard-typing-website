import {RoomError} from './room-engine';
export class RoomAccessError extends RoomError{
 constructor(message:string,status:number,public code?:string,public roomId?:string,public canCreate?:boolean){super(message,status)}
}
export function requireRoomAccess(condition:unknown,message:string,status=403):asserts condition{if(!condition)throw new RoomAccessError(message,status)}
