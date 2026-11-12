'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useSite} from '../SiteContext';
import {resultService} from '../../services/results';
import type {RoomView} from '../../lib/room-types';
import RaceResults from './RaceResults';
export default function HistoricalResults({id}:{id:string}){
 const {fr,ready,state}=useSite(),[room,setRoom]=useState<RoomView|null>(null),[error,setError]=useState('');
 useEffect(()=>{if(!ready||!state.user)return;const controller=new AbortController();resultService.detail(id,controller.signal).then(result=>setRoom(result.room)).catch(e=>{if(!controller.signal.aborted)setError(e.message)});return()=>controller.abort()},[id,ready,state.user]);
 return <main className="inner"><Link className="woodland-back" href="/stats">← {fr?'Mon historique':'My history'}</Link>{!ready?<p role="status">{fr?'Chargement…':'Loading…'}</p>:!state.user?<><p>{fr?'Connectez-vous pour consulter cette course.':'Log in to view this race.'}</p><Link className="button primary" href="/login">{fr?'Se connecter':'Log in'}</Link></>:error?<p role="alert">{error}</p>:room?<RaceResults room={room} basePath={'/history/'+encodeURIComponent(id)}/>:<p role="status">{fr?'Chargement…':'Loading…'}</p>}</main>;
}
