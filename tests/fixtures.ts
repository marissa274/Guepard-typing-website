import {defaultSettings,type Person,type Room,type RoomView} from '../src/lib/room-types';
import type {ResultPage,ResultSummary,StoredRaceResult} from '../src/lib/result-types';

/** Complete, strictly typed participant: tests only spell out the fields they exercise. */
export function personFixture(overrides:Partial<Person>&Pick<Person,'id'>):Person{
 const progress=overrides.progress??0,typed=overrides.typed??progress;
 return {name:overrides.id,animal:'cheetah',kind:'guest',role:'player',late:false,seen:0,abandoned:false,...overrides,progress,typed,errors:overrides.errors??Math.max(0,typed-progress)};
}
export function roomFixture(overrides:Partial<Room>={}):Room{
 return {id:'room',name:'Salon',animal:'cheetah',code:'ABCDEF',hostId:'host',people:[],settings:{...defaultSettings},phase:'waiting',createdAt:0,revision:1,invites:[],...overrides};
}
export function roomViewFixture(overrides:Partial<RoomView>={}):RoomView{
 const {invites:_invites,bannedIdentities:_banned,bannedIpHashes:_bannedIps,...room}=roomFixture();
 return {...room,me:'host',isHost:false,players:0,serverNow:0,...overrides};
}
export function storedResultFixture(overrides:Partial<StoredRaceResult>={}):StoredRaceResult{
 return {id:'result',date:0,roomName:'Salon',speed:0,accuracy:100,rank:1,won:true,abandoned:false,score:null,...overrides};
}
export function resultPageFixture(results:StoredRaceResult[],summary:Partial<ResultSummary>={}):ResultPage{
 return {results,total:results.length,page:1,pageSize:10,summary:{races:results.length,wins:0,bestSpeed:0,averageSpeed:0,averageAccuracy:null,...summary},progression:[]};
}
