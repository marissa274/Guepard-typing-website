'use client';
import {useState} from 'react';
import Link from 'next/link';
import {RoomRequestError,roomRequest} from '../../lib/room-client';
import {useSite} from '../SiteContext';
import {roomCopy} from '../../lib/room-copy';
export default function MembershipConflict({error,onLeft}:{error:RoomRequestError;onLeft:()=>void}){
 const {fr}=useSite(),copy=roomCopy(fr),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 if(!error.roomId)return null;
 const id=error.roomId;
 async function leave(){setBusy(true);try{await roomRequest(null,{action:'leave-current'});sessionStorage.removeItem('guepard-room-'+id);onLeft()}catch(cause){setMessage(cause instanceof Error?cause.message:copy.serverError)}finally{setBusy(false)}}
 return <div className="membership-conflict"><p>{copy.conflictHint}</p><Link href={'/lobby/'+id}>{copy.returnLobby}</Link><button type="button" disabled={busy} onClick={leave}>{copy.leaveCurrent}</button>{message&&<p role="alert">{message}</p>}</div>
}
