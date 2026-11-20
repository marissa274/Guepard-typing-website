'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useSite} from '../SiteContext';
import {AnimalPicker,AnimalAvatar} from '../AnimalAvatar';
import {roomRequest,RoomRequestError} from '../../lib/room-client';
import type {Visibility} from '../../lib/room-types';
import MembershipConflict from './MembershipConflict';
import {entryPanel,entryTitle,entryBack} from './room-styles';
import {roomCopy} from '../../lib/room-copy';
/* Utilities (TECH-03, lot B). Legacy class names stay as hooks. The background of the form (`.wood-panel`) and the descendant rules of the
   animal picker, which AnimalPicker renders, stay in src/styles/lobby.css. */
const ui={
 shell:'create-room-shell m-auto max-w-880',
 title:'woodland-title mt-20 mb-35 mx-0 max-w-760',
 h1:'mt-15 mb-12 mx-0 leading-[1.15] tracking-[-1.5px] text-[#294b2f] [overflow-wrap:anywhere] text-[clamp(40px,4vw,62px)] dark:text-cream',
 form:'wood-panel create-room-form p-38 border border-[#dac8a4] rounded-[25px] relative isolate [box-shadow:#4b482535_0px_11px_25px,#ffffff_0px_2px_1px_inset] text-canopy dark:[filter:brightness(0.9)] upto-1050:p-23 upto-800:p-24 upto-450:py-23 upto-450:px-19',
 fields:'wood-fields my-20 mx-0 gap-18 grid grid-cols-[1fr_1fr] upto-1050:gap-14 upto-450:grid-cols-[1fr]',
 field:'text-[16px]',
 picker:'mt-28 mb-0 mx-0 min-w-0',
 identity:'create-identity flex items-center gap-13 my-20 text-[13px] leading-[1.6]',
 error:'wood-error border border-[#cc9e73] bg-[#fff0dc] text-[#953e29] py-13 px-17 text-[13px] leading-[1.6] rounded-[10px] mb-20',
 submit:'wood-primary mt-25 min-w-240',
};
export default function CreateRoom(){
 const {state,fr,ready}=useSite(),copy=roomCopy(fr),router=useRouter();
 const [name,setName]=useState(''),[animal,setAnimal]=useState(''),[visibility,setVisibility]=useState<Visibility>('public'),[language,setLanguage]=useState<'FR'|'EN'>('FR'),[capacity,setCapacity]=useState(8),[spectator,setSpectator]=useState(false),[error,setError]=useState<Error|null>(null),[busy,setBusy]=useState(false),[animalMissing,setAnimalMissing]=useState(false),picker=useRef<HTMLFieldSetElement>(null);
 useEffect(()=>{const params=new URLSearchParams(window.location.search),chosen=params.get('animal');if(chosen&&['cheetah','parrot','crocodile','monkey','elephant','toucan'].includes(chosen))setAnimal(chosen);const title=params.get('name');if(title)setName(title.slice(0,80))},[]);
 async function create(event:FormEvent){event.preventDefault();if(!animal){setAnimalMissing(true);picker.current?.querySelector('input')?.focus();return}setBusy(true);setError(null);try{const result=await roomRequest(null,{action:'create',name,animal,visibility,language,capacity,role:spectator?'spectator':'player'});if(!result.room)throw new Error(copy.lobbyUnavailable);router.push('/lobby/'+result.room.id)}catch(cause){setError(cause instanceof Error?cause:new Error(copy.serverError))}finally{setBusy(false)}}
 if(!ready)return <main id="main" tabIndex={-1} className="woodland-page"><h1 className="sr-only">{copy.createTitle}</h1><p role="status">{copy.pageLoading}</p></main>;
 if(!state.user)return <main id="main" tabIndex={-1} className="woodland-page"><div className={entryPanel}><h1 className={entryTitle}>{copy.create}</h1><p>{copy.loginToCreate}</p><Link className="wood-primary" href="/login">{copy.login}</Link><Link className={entryBack} href="/races">{copy.browse}</Link></div></main>;
 return <main id="main" tabIndex={-1} className="woodland-page create-room-page"><div className="woodland-scenery" aria-hidden="true"/><div className={ui.shell}><Link href="/races" className="woodland-back">← {copy.browse}</Link><div className={ui.title}><h1 className={ui.h1}>{copy.createTitle}</h1></div><form className={ui.form} onSubmit={create}><div className={ui.fields}><div><label className={ui.field} htmlFor="room-name">{copy.roomName}</label><input className={ui.field} id="room-name" value={name} onChange={event=>setName(event.target.value)} required maxLength={80}/></div><div><label className={ui.field} htmlFor="host-name">{copy.hostNickname}</label><input className={ui.field} id="host-name" value={state.name} readOnly/></div></div><AnimalPicker value={animal} onChange={id=>{setAnimal(id);setAnimalMissing(false)}} message={animalMissing?copy.chooseAnimal:undefined} fieldRef={picker} landscape fr={fr} className={ui.picker}/><div className={ui.fields}><div><label className={ui.field} htmlFor="visibility">{copy.visibility}</label><select className={ui.field} id="visibility" value={visibility} onChange={event=>setVisibility(event.target.value as Visibility)}><option value="public">{copy.visibilityPublic}</option><option value="semi">{copy.visibilitySemi}</option><option value="private">{copy.visibilityPrivate}</option></select></div><div><label className={ui.field} htmlFor="race-language">{copy.textLanguage}</label><select className={ui.field} id="race-language" value={language} onChange={event=>setLanguage(event.target.value as 'FR'|'EN')}><option value="FR" lang="fr">Français</option><option value="EN" lang="en">English</option></select></div><div><label className={ui.field} htmlFor="room-capacity">{copy.maxCapacity}</label><input className={ui.field} id="room-capacity" type="number" min={2} max={30} value={capacity} onChange={event=>setCapacity(Number(event.target.value))} required/></div><label className={ui.field}><input className={ui.field} type="checkbox" checked={spectator} onChange={event=>setSpectator(event.target.checked)}/>{copy.hostSpectator}</label></div><div className={ui.identity}><AnimalAvatar animal={state.avatar} avatarUrl={state.avatarUrl}/><span>{state.name}</span></div>{error&&<p className={ui.error} role="alert">{error.message}</p>}{error instanceof RoomRequestError&&error.code==='ROOM_MEMBERSHIP_CONFLICT'&&<MembershipConflict error={error} onLeft={()=>setError(null)}/>}<button className={ui.submit} disabled={busy}>{busy?copy.creating:copy.create}</button></form></div></main>
}
