'use client';
import {useId,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {roomRequest} from '../lib/room-client';
import {roomCopy,roomErrorMessage} from '../lib/room-copy';
import {useSite} from './SiteContext';
import SignBoard from './SignBoard';
/** Row of the code form, reused for the filters of the race browser (Races.tsx). Its inputs, buttons and selects share one size. */
const entryBase='course-code-entry max-w-1560 mb-30 mx-auto flex gap-12 items-center text-[17px] [&_input]:max-w-240 [&_input]:uppercase [&_input]:text-[16px] [&_input]:min-h-48 [&_button]:text-[16px] [&_button]:min-h-48 [&_select]:text-[16px] [&_select]:min-h-48';
export const codeEntry=entryBase+' mt-0 py-0 px-36 upto-800:p-0 upto-800:flex-wrap upto-550:py-0 upto-550:px-5';
/* Home: a wooden board hanging under the three signs, same wood and edge as the rest of the creation pages. */
const homeEntry='course-code-entry home-code-entry relative isolate mt-24 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-12 min-h-88 py-20 px-38 text-woodland-ink drop-shadow-plank upto-1250:grid-cols-[minmax(0,1fr)] upto-1250:gap-10 upto-1250:px-28 phone:px-22 [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-48 [&_input]:text-[16px] [&_button]:min-h-48 [&_button]:text-[16px] dark:[&_input]:bg-field-bg dark:[&_input]:text-field-ink dark:[&_input]:border-field-edge dark:[&_input::placeholder]:text-placeholder';
export default function JoinByCode({home=false}:{home?:boolean}){
 const {fr}=useSite(),copy=roomCopy(fr),router=useRouter(),id=useId();
 const [code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function resolve(event:FormEvent){
  event.preventDefault();setBusy(true);setError('');
  try{const result=await roomRequest(null,{action:'resolve',code:code.toUpperCase()});if(!result.id)throw new Error(copy.codeUnavailable);router.push('/lobby/'+result.id+'?code='+encodeURIComponent(code.toUpperCase()))}
  catch(cause){setError(roomErrorMessage(cause,fr))}finally{setBusy(false)}
 }
 return <><form className={home?homeEntry:codeEntry} onSubmit={resolve}>{home&&<SignBoard panel/>}<label className={home?'m-0 font-display font-extrabold text-[15px] upto-1250:px-16':'m-0 whitespace-nowrap'} htmlFor={id}>{copy.haveCode}</label><input className={home?'min-w-0':undefined} id={id} value={code} onChange={event=>setCode(event.target.value.toUpperCase())} minLength={6} maxLength={6} pattern="[A-HJKMNP-Z2-9]{6}" title={copy.codeFormat} aria-invalid={!!error} aria-describedby={error?id+'-error':undefined} autoCapitalize="characters" autoComplete="off" required placeholder={copy.codePlaceholder}/><button className="wood-small-button whitespace-nowrap" disabled={busy}>{copy.openLobby}</button></form>{error&&<p role="alert" id={id+'-error'} className="public-rooms-error max-w-1680 my-30 mx-auto py-22 px-35 text-[19px]">{error}</p>}</>;
}
