'use client';
import {useState} from 'react';
import Link from 'next/link';
import {RoomRequestError,roomRequest} from '../../lib/room-client';
import {useSite} from '../SiteContext';
export default function MembershipConflict({error,onLeft}:{error:RoomRequestError;onLeft:()=>void}){
 const {fr}=useSite(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 if(!error.roomId)return null;
 const id=error.roomId;
 async function leave(){setBusy(true);try{await roomRequest(null,{action:'leave-current'});sessionStorage.removeItem('guepard-room-'+id);onLeft()}catch(cause){setMessage(cause instanceof Error?cause.message:'Erreur serveur.')}finally{setBusy(false)}}
 return <div className="membership-conflict"><p>{fr?'Tu peux retourner au salon actuel ou le quitter avant de continuer.':'Return to your current lobby or leave it before continuing.'}</p><Link href={'/lobby/'+id}>{fr?'Retourner au salon':'Return to lobby'}</Link><button type="button" disabled={busy} onClick={leave}>{fr?'Quitter le salon actuel':'Leave current lobby'}</button>{message&&<p role="alert">{message}</p>}</div>
}
