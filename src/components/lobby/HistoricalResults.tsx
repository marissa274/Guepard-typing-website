'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useSite} from '../SiteContext';
import {resultService} from '../../services/results';
import type {RoomView} from '../../lib/room-types';
import RaceResults from './RaceResults';
import {roomCopy} from '../../lib/room-copy';
export default function HistoricalResults({id}:{id:string}){
 const {fr,ready,state}=useSite(),copy=roomCopy(fr),[room,setRoom]=useState<RoomView|null>(null),[error,setError]=useState('');
 useEffect(()=>{if(!ready||!state.user)return;const controller=new AbortController();resultService.detail(id,controller.signal).then(result=>setRoom(result.room)).catch(e=>{if(!controller.signal.aborted)setError(e.message)});return()=>controller.abort()},[id,ready,state.user]);
 return <main id="main" tabIndex={-1} className="inner"><Link className="woodland-back" href="/stats">← {copy.myHistory}</Link>{!room&&<h1 className="sr-only">{copy.historyTitle}</h1>}{!ready?<p role="status">{copy.pageLoading}</p>:!state.user?<><p>{copy.loginToView}</p><Link className="button primary" href="/login">{copy.login}</Link></>:error?<p role="alert">{error}</p>:room?<RaceResults room={room} basePath={'/history/'+encodeURIComponent(id)}/>:<p role="status">{copy.pageLoading}</p>}</main>;
}
