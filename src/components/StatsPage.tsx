'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useSite} from './SiteContext';
import {resultService} from '../services/results';
import type {ResultPage} from '../lib/result-types';
import type {Language} from '../lib/site-types';
import type {copy} from '../i18n';
import {formatDate,formatDateTime,formatNumber,formatOptionalPercent} from '../i18n/format';

function ProgressChart({points,lang,c}:{points:{date:number;speed:number}[];lang:Language;c:typeof copy.fr}){
 const max=Math.max(1,...points.map(p=>p.speed)),first=points[0].date,last=points[points.length-1].date;
 const dots=points.map(p=>({x:30+(last===first?0:(p.date-first)/(last-first))*540,y:150-p.speed/max*120,...p}));
 return <figure><figcaption>{c.chartCaption}</figcaption><svg viewBox="0 0 600 180" role="img" aria-label={c.chartLabel} style={{width:'100%',maxWidth:720,height:'auto'}}><line x1="30" y1="150" x2="580" y2="150" stroke="currentColor"/><line x1="30" y1="25" x2="30" y2="150" stroke="currentColor"/><text x="0" y="25" fontSize="12">{formatNumber(lang,max)}</text><text x="5" y="150" fontSize="12">{formatNumber(lang,0)}</text><polyline points={dots.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2"/>{dots.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill="currentColor"><title>{formatDateTime(lang,p.date)} · {formatNumber(lang,p.speed)} {c.wordsPerMinute}</title></circle>)}<text x="30" y="175" fontSize="12">{formatDate(lang,first)}</text><text x="580" y="175" textAnchor="end" fontSize="12">{formatDate(lang,last)}</text></svg></figure>;
}

export default function StatsPage(){
 const {state,c,fr,ready}=useSite(),lang:Language=fr?'fr':'en',[page,setPage]=useState(1),[data,setData]=useState<ResultPage|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!ready||!state.user){setData(null);return}
  const controller=new AbortController();setLoading(true);setError('');
  resultService.list(page,controller.signal).then(setData).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[ready,state.user,page,retry]);
 if(!ready)return <main id="main" tabIndex={-1} className="inner"><h1>{c.stats}</h1><p role="status">{c.loading}</p></main>;
 if(!state.user&&!state.results.length)return <main id="main" tabIndex={-1} className="inner"><h1>{c.stats}</h1><p>{c.loginText}</p><Link className="button primary mt-6" href="/login">{c.login}</Link></main>;
 const local=state.results,precisions=local.filter(r=>r.accuracy!==null),summary=state.user?data?.summary:{races:local.length,wins:local.filter(r=>r.won).length,bestSpeed:Math.max(0,...local.map(r=>r.speed)),averageSpeed:local.length?Math.round(local.reduce((sum,r)=>sum+r.speed,0)/local.length):0,averageAccuracy:precisions.length?Math.round(precisions.reduce((sum,r)=>sum+(r.accuracy||0),0)/precisions.length):null};
 const results=state.user?data?.results||[]:local.slice().reverse().slice((page-1)*10,page*10),total=state.user?data?.total||0:local.length,points=state.user?data?.progression||[]:local.slice(-100).map(r=>({date:r.date,speed:r.speed}));
 const metrics=summary?[[formatNumber(lang,summary.races),c.racesDone],[formatNumber(lang,summary.wins),c.wins],[formatNumber(lang,summary.bestSpeed),`${c.best} (${c.speed})`],[formatNumber(lang,summary.averageSpeed),c.averageSpeed],[formatOptionalPercent(lang,summary.averageAccuracy),c.averageAccuracy]]:[];
 return <main id="main" tabIndex={-1} className="inner"><div className="eyebrow">{state.user?c.account:c.guestSession}</div><h1>{c.statsTitle}</h1><p>{state.user?c.statsAccountNote:c.statsGuestNote}</p>{loading&&<p role="status">{c.loading}</p>}{error&&<div role="alert"><p>{error}</p><button className="button" onClick={()=>setRetry(n=>n+1)}>{c.retry}</button></div>}{summary&&<div className="scoreboard">{metrics.map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>}{points.length>0&&<ProgressChart points={points} lang={lang} c={c}/>}{results.length>0?<><h2>{c.history}</h2><div className="history">{results.map((result,i)=><div key={result.id||i}><span>{formatDateTime(lang,result.date)}</span><strong>{formatNumber(lang,result.speed)} {c.speed}</strong><span>{formatOptionalPercent(lang,result.accuracy)} {c.accuracy}</span>{result.won&&<span>{c.win}</span>}{state.user&&<Link href={'/history/'+encodeURIComponent(result.id)+'?view=results'}>{result.roomName} · {c.viewResults}</Link>}</div>)}</div><nav aria-label={c.historyPagination}><button className="button" disabled={page===1||loading} onClick={()=>setPage(p=>p-1)}>{c.previousPage}</button><span> {c.page} {formatNumber(lang,page)} / {formatNumber(lang,Math.max(1,Math.ceil(total/10)))} </span><button className="button" disabled={page*10>=total||loading} onClick={()=>setPage(p=>p+1)}>{c.nextPage}</button></nav></>:!loading&&!error&&<div className="empty"><p>{c.noStats}</p><Link className="button primary" href="/races">{c.join} →</Link></div>}</main>;
}
