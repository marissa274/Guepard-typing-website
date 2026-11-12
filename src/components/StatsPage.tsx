'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useSite} from './SiteContext';
import {resultService} from '../services/results';
import type {ResultPage} from '../lib/result-types';

function ProgressChart({points,lang}:{points:{date:number;speed:number}[];lang:string}){
 const fr=lang==='fr',max=Math.max(1,...points.map(p=>p.speed)),first=points[0].date,last=points[points.length-1].date;
 const dots=points.map(p=>({x:30+(last===first?0:(p.date-first)/(last-first))*540,y:150-p.speed/max*120,...p}));
 return <figure><figcaption>{fr?'Progression de la vitesse — 100 dernières courses au maximum':'Speed progression — up to the latest 100 races'}</figcaption><svg viewBox="0 0 600 180" role="img" aria-label={fr?'Mots par minute au fil des courses':'Words per minute over time'} style={{width:'100%',maxWidth:720,height:'auto'}}><line x1="30" y1="150" x2="580" y2="150" stroke="currentColor"/><line x1="30" y1="25" x2="30" y2="150" stroke="currentColor"/><text x="0" y="25" fontSize="12">{max}</text><text x="5" y="150" fontSize="12">0</text><polyline points={dots.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2"/>{dots.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill="currentColor"><title>{new Date(p.date).toLocaleString(lang)} · {p.speed} {fr?'mots/min':'words/min'}</title></circle>)}<text x="30" y="175" fontSize="12">{new Date(first).toLocaleDateString(lang)}</text><text x="580" y="175" textAnchor="end" fontSize="12">{new Date(last).toLocaleDateString(lang)}</text></svg></figure>;
}

export default function StatsPage(){
 const {state,c,fr,ready}=useSite(),[page,setPage]=useState(1),[data,setData]=useState<ResultPage|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!ready||!state.user){setData(null);return}
  const controller=new AbortController();setLoading(true);setError('');
  resultService.list(page,controller.signal).then(setData).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[ready,state.user,page,retry]);
 if(!ready)return <main className="inner"><h1>{c.stats}</h1><p role="status">{c.loading}</p></main>;
 if(!state.user&&!state.results.length)return <main className="inner"><h1>{c.stats}</h1><p>{c.loginText}</p><Link className="button primary mt-6" href="/login">{c.login}</Link></main>;
 const local=state.results,precisions=local.filter(r=>r.accuracy!==null),summary=state.user?data?.summary:{races:local.length,wins:local.filter(r=>r.won).length,bestSpeed:Math.max(0,...local.map(r=>r.speed)),averageSpeed:local.length?Math.round(local.reduce((sum,r)=>sum+r.speed,0)/local.length):0,averageAccuracy:precisions.length?Math.round(precisions.reduce((sum,r)=>sum+r.accuracy,0)/precisions.length):null};
 const results=state.user?data?.results||[]:local.slice().reverse().slice((page-1)*10,page*10),total=state.user?data?.total||0:local.length,points=state.user?data?.progression||[]:local.slice(-100).map(r=>({date:r.date,speed:r.speed}));
 const metrics=summary?[[summary.races,c.racesDone],[summary.wins,fr?'victoires':'wins'],[summary.bestSpeed,`${c.best} (${c.speed})`],[summary.averageSpeed,fr?'MPM moyen':'average WPM'],[summary.averageAccuracy===null?'—':summary.averageAccuracy+' %',fr?'précision moyenne':'average accuracy']]:[];
 return <main className="inner"><div className="eyebrow">{state.user?c.account:fr?'Session invitée':'Guest session'}</div><h1>{c.statsTitle}</h1><p>{state.user?(fr?'Vos courses sont conservées dans votre compte, même après une déconnexion.':'Your races are saved to your account, including after you log out.'):(fr?'Ces résultats disparaissent à la fin de votre session de navigation.':'These results disappear when your browsing session ends.')}</p>{loading&&<p role="status">{c.loading}</p>}{error&&<div role="alert"><p>{error}</p><button className="button" onClick={()=>setRetry(n=>n+1)}>{fr?'Réessayer':'Retry'}</button></div>}{summary&&<div className="scoreboard">{metrics.map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>}{points.length>0&&<ProgressChart points={points} lang={state.lang}/>}{results.length>0?<><h2>{fr?'Historique des courses':'Race history'}</h2><div className="history">{results.map((result,i)=><div key={result.id||i}><span>{new Date(result.date).toLocaleString(state.lang)}</span><strong>{result.speed} {c.speed}</strong><span>{result.accuracy===null?'—':result.accuracy+' %'} {c.accuracy}</span>{result.won&&<span>{fr?'Victoire':'Win'}</span>}{state.user&&<Link href={'/history/'+encodeURIComponent(result.id)+'?view=results'}>{result.roomName} · {fr?'Voir les résultats':'View results'}</Link>}</div>)}</div><nav aria-label={fr?'Pagination de l’historique':'History pagination'}><button className="button" disabled={page===1||loading} onClick={()=>setPage(p=>p-1)}>{fr?'Précédente':'Previous'}</button><span> {fr?'Page':'Page'} {page} / {Math.max(1,Math.ceil(total/10))} </span><button className="button" disabled={page*10>=total||loading} onClick={()=>setPage(p=>p+1)}>{fr?'Suivante':'Next'}</button></nav></>:!loading&&!error&&<div className="empty"><p>{c.noStats}</p><Link className="button primary" href="/races">{c.join} →</Link></div>}</main>;
}
