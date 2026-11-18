'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useSite} from '../SiteContext';
import {roomRequest,RoomRequestError} from '../../lib/room-client';
import MembershipConflict from './MembershipConflict';
export default function QuickJoin(){
 const {state,ready,fr,save}=useSite(),router=useRouter(),started=useRef(false),[error,setError]=useState<Error|null>(null),[busy,setBusy]=useState(false),[nickname,setNickname]=useState(state.name);
 async function join(){setBusy(true);setError(null);try{const result=await roomRequest(null,{action:'quick',nickname:state.user?state.name:nickname});if(!result.room)throw new Error(fr?'Salon indisponible.':'Lobby unavailable.');if(!state.user)save('name',nickname);router.replace('/lobby/'+result.room.id)}catch(cause){setError(cause instanceof Error?cause:new Error('Erreur serveur.'))}finally{setBusy(false)}}
 useEffect(()=>{if(!ready||!state.user||started.current)return;started.current=true;void join()},[ready,state.user]);
 const empty=error instanceof RoomRequestError&&error.code==='QUICK_JOIN_EMPTY';
 return <main className="woodland-page quick-join-page"><div className="woodland-scenery" aria-hidden="true"/><div className="room-entry wood-panel"><h1>{fr?'Rejoindre rapidement':'Quick race'}</h1>{!ready||busy?<p role="status">{fr?'Recherche d’un salon disponible…':'Finding an available lobby…'}</p>:!state.user&&!error?<form onSubmit={event=>{event.preventDefault();void join()}}><label htmlFor="quick-nickname">{fr?'Ton pseudo invité':'Guest nickname'}</label><input id="quick-nickname" minLength={3} maxLength={20} required value={nickname} onChange={event=>setNickname(event.target.value)}/><button className="wood-primary">{fr?'Chercher une course':'Find a race'}</button></form>:null}{error&&<p role={empty?'status':'alert'}>{error.message}</p>}{empty&&state.user&&<Link className="wood-primary" href="/create">{fr?'Créer un salon public':'Create a public lobby'}</Link>}{empty&&!state.user&&<p>{fr?'Aucune salle n’a été créée. Reviens plus tard ou connecte-toi pour créer un salon.':'No lobby was created. Try later or log in to create one.'}</p>}{error instanceof RoomRequestError&&error.code==='ROOM_MEMBERSHIP_CONFLICT'&&<MembershipConflict error={error} onLeft={()=>void join()}/>}<Link className="woodland-back" href="/races">{fr?'Parcourir les courses':'Browse races'}</Link></div></main>
}
