'use client';
import {useEffect,useId,useState} from 'react';
import Link from 'next/link';
import {useSite} from './SiteContext';
import SignBoard from './SignBoard';
import {resultService} from '../services/results';
import type {ResultPage} from '../lib/result-types';
import type {Language} from '../lib/site-types';
import type {copy} from '../i18n';
import {formatDate,formatDateTime,formatNumber,formatOptionalPercent} from '../i18n/format';
import {roomLabel} from '../lib/room-copy';

function ProgressChart({points,lang,c}:{points:{date:number;speed:number}[];lang:Language;c:typeof copy.fr}){
 const max=Math.max(1,...points.map(p=>p.speed)),first=points[0].date,last=points[points.length-1].date;
 const dots=points.map(p=>({x:30+(last===first?0:(p.date-first)/(last-first))*540,y:150-p.speed/max*120,...p})),summaryId=useId();
 const summary=roomLabel(c.chartSummary,{count:formatNumber(lang,points.length),min:formatNumber(lang,Math.min(...points.map(p=>p.speed))),max:formatNumber(lang,max),last:formatNumber(lang,points[points.length-1].speed)});
 return <figure><figcaption>{c.chartCaption}</figcaption><p id={summaryId} className="sr-only m-0">{summary}</p><svg viewBox="-40 0 640 190" role="img" aria-label={c.chartLabel} aria-describedby={summaryId} style={{width:'100%',maxWidth:820,height:'auto'}}><line x1="30" y1="150" x2="580" y2="150" stroke="currentColor"/><line x1="30" y1="25" x2="30" y2="150" stroke="currentColor"/><text x="24" y="32" textAnchor="end" fontSize="22" fill="currentColor">{formatNumber(lang,max)}</text><text x="24" y="150" textAnchor="end" fontSize="22" fill="currentColor">{formatNumber(lang,0)}</text><polyline points={dots.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2"/>{dots.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill="currentColor"><title>{formatDateTime(lang,p.date)} · {formatNumber(lang,p.speed)} {c.wordsPerMinute}</title></circle>)}<text x="30" y="182" fontSize="22" fill="currentColor">{formatDate(lang,first)}</text><text x="580" y="182" textAnchor="end" fontSize="22" fill="currentColor">{formatDate(lang,last)}</text></svg></figure>;
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
 if(!state.user&&!state.results.length)return <main id="main" tabIndex={-1} className="inner"><h1>{c.stats}</h1><p>{c.loginText}</p><Link className="button primary mt-24" href="/login">{c.login}</Link></main>;
 const local=state.results,precisions=local.filter(r=>r.accuracy!==null),summary=state.user?data?.summary:{races:local.length,wins:local.filter(r=>r.won).length,bestSpeed:Math.max(0,...local.map(r=>r.speed)),averageSpeed:local.length?Math.round(local.reduce((sum,r)=>sum+r.speed,0)/local.length):0,averageAccuracy:precisions.length?Math.round(precisions.reduce((sum,r)=>sum+(r.accuracy||0),0)/precisions.length):null};
 const results=state.user?data?.results||[]:local.slice().reverse().slice((page-1)*10,page*10),total=state.user?data?.total||0:local.length,points=state.user?data?.progression||[]:local.slice(-100).map(r=>({date:r.date,speed:r.speed}));
 const metrics=summary?[[formatNumber(lang,summary.races),c.racesDone],[formatNumber(lang,summary.wins),c.wins],[formatNumber(lang,summary.bestSpeed),`${c.best} (${c.speed})`],[formatNumber(lang,summary.averageSpeed),c.averageSpeed],[formatOptionalPercent(lang,summary.averageAccuracy),c.averageAccuracy]]:[];
 return <main id="main" tabIndex={-1} className="inner max-w-none px-[5%]"><div className="eyebrow">{state.user?c.account:c.guestSession}</div><h1>{c.statsTitle}</h1><p>{state.user?c.statsAccountNote:c.statsGuestNote}</p><div role="status">{loading&&<p>{c.loading}</p>}</div>{error&&<div role="alert"><p>{error}</p><button className="button" onClick={()=>setRetry(n=>n+1)}>{c.retry}</button></div>}{summary&&<div className="relative isolate my-28 px-30 py-26 drop-shadow-plank phone:px-16"><SignBoard panel/><div className="scoreboard border-0 m-0 [&_span]:text-wood-ink [&_strong]:text-wood-ink phone:flex-wrap phone:gap-x-10 phone:gap-y-14 phone:[&>div]:basis-[28%]">{metrics.map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></div>}{points.length>0&&<section className="bg-wood-small-bg text-wood-ink border-2 border-wood-small-edge rounded-panel drop-shadow-board p-24 my-28 phone:p-14"><ProgressChart points={points} lang={lang} c={c}/></section>}{results.length>0?<section className="bg-wood-small-bg text-wood-ink border-2 border-wood-small-edge rounded-panel drop-shadow-board p-24 my-28 phone:p-14"><h2 className="mt-0 text-deep-forest dark:text-deep-forest">{c.history}</h2><ul className="history [list-style:none] m-0 p-0">{results.map((result,i)=><li key={result.id||i} className="flex justify-between p-20 border-b border-b-line phone:flex-wrap phone:gap-x-14 phone:gap-y-4 phone:text-[13px] phone:py-14 phone:px-0"><span>{formatDateTime(lang,result.date)}</span><strong>{formatNumber(lang,result.speed)} {c.speed}</strong><span>{formatOptionalPercent(lang,result.accuracy)} {c.accuracy}</span>{result.won&&<span>{c.win}</span>}{state.user&&<Link href={'/history/'+encodeURIComponent(result.id)+'?view=results'}>{result.roomName} · {c.viewResults}</Link>}</li>)}</ul><nav aria-label={c.historyPagination}><button className="button" aria-disabled={page===1||loading} onClick={()=>{if(page>1&&!loading)setPage(p=>p-1)}}>{c.previousPage}</button><span role="status"> {c.page} {formatNumber(lang,page)} / {formatNumber(lang,Math.max(1,Math.ceil(total/10)))} </span><button className="button" aria-disabled={page*10>=total||loading} onClick={()=>{if(page*10<total&&!loading)setPage(p=>p+1)}}>{c.nextPage}</button></nav></section>:!loading&&!error&&<div className="empty bg-wood-small-bg text-wood-ink border-2 border-wood-small-edge rounded-panel drop-shadow-board py-30 px-30 my-28 col-[1/-1]"><p className="mb-25">{c.noStats}</p><Link className="button primary" href="/races">{c.join} →</Link></div>}</main>;
}
