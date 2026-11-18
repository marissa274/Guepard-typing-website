'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useSite} from '../SiteContext';
import {roomRequest,RoomRequestError} from '../../lib/room-client';
import MembershipConflict from './MembershipConflict';
import {roomCopy} from '../../lib/room-copy';
export default function QuickJoin(){
 const {state,ready,fr,save}=useSite(),copy=roomCopy(fr),router=useRouter(),started=useRef(false),[error,setError]=useState<Error|null>(null),[busy,setBusy]=useState(false),[nickname,setNickname]=useState(state.name);
 async function join(){setBusy(true);setError(null);try{const result=await roomRequest(null,{action:'quick',nickname:state.user?state.name:nickname});if(!result.room)throw new Error(copy.lobbyUnavailable);if(!state.user)save('name',nickname);router.replace('/lobby/'+result.room.id)}catch(cause){setError(cause instanceof Error?cause:new Error(copy.serverError))}finally{setBusy(false)}}
 useEffect(()=>{if(!ready||!state.user||started.current)return;started.current=true;void join()},[ready,state.user]);
 const empty=error instanceof RoomRequestError&&error.code==='QUICK_JOIN_EMPTY';
 return <main id="main" tabIndex={-1} className="woodland-page quick-join-page"><div className="woodland-scenery" aria-hidden="true"/><div className="room-entry wood-panel"><h1>{copy.quickTitle}</h1>{!ready||busy?<p role="status">{copy.finding}</p>:!state.user&&!error?<form onSubmit={event=>{event.preventDefault();void join()}}><label htmlFor="quick-nickname">{copy.quickNickname}</label><input id="quick-nickname" minLength={3} maxLength={20} required value={nickname} onChange={event=>setNickname(event.target.value)}/><button className="wood-primary">{copy.findRace}</button></form>:null}{error&&<p role={empty?'status':'alert'}>{error.message}</p>}{empty&&state.user&&<Link className="wood-primary" href="/create">{copy.createPublic}</Link>}{empty&&!state.user&&<p>{copy.noLobbyCreated}</p>}{error instanceof RoomRequestError&&error.code==='ROOM_MEMBERSHIP_CONFLICT'&&<MembershipConflict error={error} onLeft={()=>void join()}/>}<Link className="woodland-back" href="/races">{copy.browse}</Link></div></main>
}
