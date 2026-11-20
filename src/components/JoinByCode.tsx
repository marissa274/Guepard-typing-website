'use client';
import {useId,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {roomRequest} from '../lib/room-client';
import {roomCopy,roomErrorMessage} from '../lib/room-copy';
import {useSite} from './SiteContext';
export default function JoinByCode({home=false}:{home?:boolean}){
 const {fr}=useSite(),copy=roomCopy(fr),router=useRouter(),id=useId();
 const [code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function resolve(event:FormEvent){
  event.preventDefault();setBusy(true);setError('');
  try{const result=await roomRequest(null,{action:'resolve',code:code.toUpperCase()});if(!result.id)throw new Error(copy.codeUnavailable);router.push('/lobby/'+result.id+'?code='+encodeURIComponent(code.toUpperCase()))}
  catch(cause){setError(roomErrorMessage(cause,fr))}finally{setBusy(false)}
 }
 return <><form className={'course-code-entry'+(home?' home-code-entry flex-wrap bg-paper rounded-[12px]':'')} onSubmit={resolve}><label className="m-0 whitespace-nowrap" htmlFor={id}>{copy.haveCode}</label><input className={home?'min-w-0 flex-1':undefined} id={id} value={code} onChange={event=>setCode(event.target.value.toUpperCase())} minLength={6} maxLength={6} pattern="[A-HJKMNP-Z2-9]{6}" title={copy.codeFormat} aria-invalid={!!error} aria-describedby={error?id+'-error':undefined} autoCapitalize="characters" autoComplete="off" required placeholder={copy.codePlaceholder}/><button className="wood-small-button" disabled={busy}>{copy.openLobby}</button></form>{error&&<p role="alert" id={id+'-error'} className="public-rooms-error">{error}</p>}</>;
}
