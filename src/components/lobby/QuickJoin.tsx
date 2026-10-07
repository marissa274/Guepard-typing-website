'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useSite} from '../SiteContext';
import {roomRequest} from '../../lib/room-client';

export default function QuickJoin(){
 const {state,ready}=useSite(),router=useRouter(),started=useRef(false),[error,setError]=useState('');
 useEffect(()=>{if(!ready||started.current)return;started.current=true;roomRequest(null,{action:'quick',nickname:state.name?.trim()||'GuépardCurieux',avatar:state.avatar,kind:state.user?'demo':'guest'}).then(({room})=>router.replace('/lobby/'+room.id)).catch(e=>setError(e.message))},[ready,router,state.name,state.avatar,state.user]);
 return <main className="woodland-page quick-join-page"><div className="woodland-scenery" aria-hidden="true"/><div className="room-entry wood-panel"><p className="woodland-eyebrow">LA JUNGLE T’ATTEND</p><h1>Rejoindre rapidement</h1>{error?<><p className="wood-error" role="alert">{error}</p><Link className="wood-primary" href="/races">Parcourir les courses publiques</Link></>:<p role="status">Nous cherchons une course en attente. S’il n’y en a pas, nous créons ton salon.</p>}</div></main>
}
