'use client';
import {useCallback,useEffect,useState,type CSSProperties} from 'react';
import Link from 'next/link';
import {useSite} from './SiteContext';
import {AnimalAvatar} from './AnimalAvatar';
import {animalFor,type AnimalId} from '../lib/animals';
import {roomRequest} from '../lib/room-client';
import type {PublicRoom} from '../lib/room-api-types';
import type {Settings} from '../lib/room-types';
import {roomCopy} from '../lib/room-copy';
import JoinByCode,{codeEntry} from './JoinByCode';
import {formatNumber,formatPadded} from '../i18n/format';

/* Utilities (TECH-03, lot A). Legacy class names stay as hooks. Kept in src/styles/expeditions.css: the gradient veil of the
   cards (::after), the focus rings of the page and the details marker. */
const ui={
 page:'expeditions-page bg-paper text-[17px] pt-[clamp(42px,5vw,80px)] px-[clamp(18px,3.2vw,54px)] pb-110 phone:pt-42 phone:px-16 phone:pb-88',
 intro:'expeditions-intro max-w-1680 mx-auto flex items-end justify-between gap-36 pb-48 px-[clamp(10px,2.5vw,40px)] phone:flex-col phone:items-start phone:gap-22 phone:pb-30',
 eyebrow:'expeditions-eyebrow text-[12px] tracking-[2.5px] font-extrabold text-leaf mb-20 phone:mb-14',
 title:'text-[clamp(42px,4.5vw,70px)] leading-[1.08] tracking-[-3px] text-ink font-extrabold max-w-900 phone:tracking-[-2px]',
 lead:'expeditions-lead text-[20px] leading-[1.7] mt-22 text-muted max-w-720 phone:mt-15 upto-550:text-[17px]',
 actions:'expeditions-intro-actions flex flex-col items-center gap-17 pb-9 shrink-0 phone:items-start',
 create:'expedition-create primary inline-flex items-center gap-25 py-16 px-22 text-[18px]',
 arrow:'ml-10',
 filters:'m-0 whitespace-nowrap',
 toolbar:'expeditions-toolbar max-w-1680 mx-auto relative flex items-center justify-between gap-15 border-t border-t-line pt-20 pb-27 px-36 tablet:px-15 phone:pt-16 phone:pb-23 phone:px-4',
 hint:'expeditions-scroll-hint flex items-center gap-12 text-[15px] text-muted phone:max-w-160 phone:gap-7',
 tools:'expeditions-tools flex gap-13 items-center phone:gap-7',
 identity:'expeditions-identity relative',
 summary:'cursor-pointer [list-style:none] text-[15px] font-semibold text-leaf max-w-220 wrap-anywhere phone:max-w-135 [&::-webkit-details-marker]:hidden',
 caret:'pl-9',
 panel:'expeditions-identity-panel absolute right-0 top-[calc(100%_+_15px)] z-30 w-280 p-23 bg-card border border-line rounded-[20px] [box-shadow:0_12px_40px_#17332322] phone:-right-38',
 refresh:'expeditions-refresh grid place-items-center w-35 h-35 border border-line rounded-[50%] text-[19px] text-leaf',
 empty:'expeditions-empty-note max-w-1680 mx-auto mb-28 py-18 px-28 border border-[#d7c79f] rounded-[16px] bg-[#fff7e7] text-[#315f3d] text-[clamp(16px,1.4vw,20px)] font-bold leading-[1.5] phone:py-16 phone:px-18',
 stack:'expedition-stack max-w-1680 mx-auto relative isolate pb-25',
 card:'expedition-card isolate flex items-center even:justify-end sticky top-[calc(18px_+_var(--card-index)*18px)] z-[calc(1_+_var(--card-index))] focus-within:z-20 min-h-[clamp(570px,72svh,760px)] p-[clamp(40px,5.5vw,94px)] text-cream bg-jungle rounded-[34px_40px_32px_38px] overflow-hidden border border-[#2f6b3d55] [box-shadow:0_-8px_28px_#192f2020,0_8px_0_#183a2230] scroll-mt-90 tablet:p-42 upto-800:min-h-780 phone:relative phone:top-auto phone:items-end phone:rounded-[26px] phone:pt-290 phone:pb-35 phone:px-26 upto-550:min-h-730 upto-550:pt-270 upto-550:pb-32 upto-550:px-23',
 cardGap:'mb-80 upto-550:mb-32',
 cardLast:'mb-0',
 copy:'expedition-copy relative z-2 w-[60%] max-w-710 min-w-0 py-12 [text-shadow:0_2px_14px_#102c2040] upto-800:w-full phone:py-0',
 topline:'expedition-topline flex justify-between gap-15 items-center mb-36 tablet:mb-28 phone:mb-23',
 number:'expedition-number text-[18px] font-extrabold tracking-[2px] tabular-nums phone:text-[16px]',
 status:'expedition-status inline-flex items-center gap-10 border border-[#f7e7c678] rounded-pill py-10 px-16 text-[14px] bg-[#173b2bbb] whitespace-nowrap tablet:text-[12px] phone:py-8 phone:px-12',
 dot:'w-8 h-8 rounded-[50%]',
 place:'expedition-place text-[14px] font-extrabold uppercase tracking-[2.5px] text-[#ffd666] mb-17 phone:text-[12px] phone:tracking-[1.6px] phone:mb-13',
 heading:'text-[clamp(42px,4.5vw,72px)] leading-[1.04] tracking-[-2px] text-balance text-[#fff2d4] phone:tracking-[-1.5px] upto-550:text-[42px]',
 description:'expedition-description text-[clamp(19px,1.6vw,24px)] leading-[1.6] max-w-570 mt-26 text-cream tablet:text-[20px] phone:text-[18px] phone:leading-[1.55] phone:mt-20',
 meta:'expedition-meta flex flex-wrap gap-12 my-30 phone:my-24 phone:gap-9',
 chip:'border border-[#f7e7c665] bg-[#173b2bbd] rounded-[10px] py-10 px-14 text-[15px] font-semibold phone:text-[13px] phone:py-9 phone:px-11',
 join:'expedition-join flex items-center justify-between gap-38 w-fit min-w-300 min-h-66 py-18 px-25 primary text-[20px] font-black text-shadow-none tablet:text-[18px] tablet:min-w-270 phone:min-w-0 phone:min-h-62 phone:w-full phone:py-16 phone:px-18 phone:gap-12',
 joinIcon:'text-[30px] leading-none',
 art:'expedition-art bg-deep-forest absolute inset-0 z-0 pointer-events-none',
 image:'block w-full h-full object-cover object-center dark:[filter:brightness(.7)]',
};
const imagePosition=(landscape:string)=>landscape==='river'?'phone:object-[30%_top]':'phone:object-[67%_top]';
export function Nickname(){
 const {state,save,fr}=useSite(),copy=roomCopy(fr);
 return <div><label htmlFor="nickname">{copy.nickname}</label><input id="nickname" minLength={state.user?3:3} maxLength={state.user?24:20} value={state.name} readOnly={state.user} onChange={event=>save('name',event.target.value)} onBlur={()=>{if(!state.name.trim())save('name','GuépardCurieux')}}/>{state.user?<p>{copy.profileSettings}</p>:<div className="guest-animal flex items-center gap-13 my-20 text-[13px] leading-[1.6]"><AnimalAvatar animal="cheetah"/><small>{copy.guestAnimal}</small></div>}</div>;
}
export function RaceCard({race,index=0,total=1}:{race:PublicRoom;index?:number;total?:number}){
 const {fr}=useSite(),lang=fr?'fr':'en',copy=roomCopy(fr),animal=animalFor(race.animal),name=fr?race.name.fr:race.name.en;
 const action=race.joinable?copy.join:race.players>=race.capacity?copy.full:copy.states[race.state];
 return <article className={`${ui.card} ${ui.cardGap} expedition-${animal.landscape}`} style={{'--card-index':index} as CSSProperties} aria-labelledby={'expedition-'+race.id}><div className={ui.copy}><div className={ui.topline}><span className={ui.number}>{formatPadded(lang,index+1)} / {formatPadded(lang,total)}</span><span className={ui.status}><i className={`${race.state} ${race.state==='running'?'bg-[#5bc0eb]':'bg-sun'} ${ui.dot}`}/>{copy.states[race.state]}</span></div><p className={ui.place}>{copy.publicLobby} · {fr?animal.themeFr:animal.themeEn}</p><h2 className={ui.heading} id={'expedition-'+race.id}>{name}</h2><div className={ui.meta}><span className={ui.chip}>{formatNumber(lang,race.players)} / {formatNumber(lang,race.capacity)} {copy.players}</span><span className={ui.chip}>{race.language==='FR'?'FR · Français':'EN · English'}</span><span className={ui.chip}>{copy.complexity} : {copy[race.complexity]}</span><span className={ui.chip}>{copy.hostLabel} {race.host}</span></div>{race.joinable?<Link className={ui.join} href={'/lobby/'+race.id} aria-label={action+' — '+name}>{action}<span className={ui.joinIcon} aria-hidden="true">↗</span></Link>:<button className={ui.join} disabled aria-label={action+' — '+name}>{action}</button>}</div><div className={ui.art}><img className={`${ui.image} ${imagePosition(animal.landscape)}`} src={'/assets/race-'+animal.landscape+'.webp'} alt="" loading={index===0?'eager':'lazy'} width="1536" height="1024" decoding="async"/></div></article>;
}
const starters:[string,AnimalId,'riverRace'|'canopyRace'][]=[['river','crocodile','riverRace'],['canopy','parrot','canopyRace']];
function StarterCard({course,index,total}:{course:typeof starters[number];index:number;total:number}){
 const {fr}=useSite(),lang=fr?'fr':'en',copy=roomCopy(fr),[id,animalId,titleKey]=course,animal=animalFor(animalId),title=copy[titleKey];
 return <article className={`${ui.card} ${index===total-1?ui.cardLast:ui.cardGap} expedition-${animal.landscape} expedition-starter`} style={{'--card-index':index} as CSSProperties} aria-labelledby={'starter-'+id}><div className={ui.copy}><div className={ui.topline}><span className={ui.number}>{formatPadded(lang,index+1)} / {formatPadded(lang,total)}</span><span className={ui.status}>{copy.toCreate}</span></div><p className={ui.place}>{copy.suggested} · {fr?animal.themeFr:animal.themeEn}</p><h2 className={ui.heading} id={'starter-'+id}>{title}</h2><p className={ui.description}>{copy.suggestedDescription}</p><Link className={ui.join} href={'/create?animal='+animal.id+'&name='+encodeURIComponent(title)}>{copy.createSuggested}<span className={ui.joinIcon} aria-hidden="true">↗</span></Link></div><div className={ui.art}><img className={`${ui.image} ${imagePosition(animal.landscape)}`} src={'/assets/race-'+animal.landscape+'.webp'} alt="" loading="lazy" width="1536" height="1024" decoding="async"/></div></article>;
}
export function Races(){
 const {state,fr}=useSite(),lang=fr?'fr':'en',copy=roomCopy(fr),[races,setRaces]=useState<PublicRoom[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[language,setLanguage]=useState(''),[complexity,setComplexity]=useState('');
 const refresh=useCallback(async(showSpinner=false)=>{if(showSpinner)setLoading(true);try{const result=await roomRequest(null);setRaces(result.rooms||[]);setError('')}catch{setError(roomCopy(fr).loadError)}finally{setLoading(false)}},[fr]);
 useEffect(()=>{void refresh(true);const timer=setInterval(()=>void refresh(),8000);return()=>clearInterval(timer)},[refresh]);
 const filtered=races.filter(race=>(!language||race.language===language)&&(!complexity||race.complexity===complexity)),available=filtered.filter(race=>race.joinable).length;
 return <main id="main" tabIndex={-1} className={ui.page}><div className={ui.intro}><div><p className={ui.eyebrow}>{copy.publicLobbies}</p><h1 className={ui.title}>{copy.browse}</h1><p className={ui.lead}>{copy.publicIntro}</p></div><div className={ui.actions}><Link className={ui.create} href="/create">{copy.create} <span className={ui.arrow} aria-hidden="true">→</span></Link></div></div><JoinByCode/><div className={codeEntry}><label className={ui.filters} htmlFor="filter-language">{copy.filterLanguage}</label><select id="filter-language" value={language} onChange={event=>setLanguage(event.target.value)}><option value="">{copy.allLanguages}</option><option value="FR" lang="fr">Français</option><option value="EN" lang="en">English</option></select><label className={ui.filters} htmlFor="filter-complexity">{copy.filterComplexity}</label><select id="filter-complexity" value={complexity} onChange={event=>setComplexity(event.target.value as Settings['complexity']|'')}><option value="">{copy.allComplexities}</option><option value="easy">{copy.easy}</option><option value="medium">{copy.medium}</option><option value="hard">{copy.hard}</option></select></div><div className={ui.toolbar}><span className={ui.hint}>{!loading&&filtered.length?`${formatNumber(lang,filtered.length)} · ${formatNumber(lang,available)} ${copy.available}`:copy.publicAppear}</span><div className={ui.tools}>{!state.user&&<details className={ui.identity}><summary className={ui.summary}><AnimalAvatar className="pl-9 size-32" animal={state.user?state.avatar:'cheetah'} avatarUrl={state.user?state.avatarUrl:undefined}/> {state.name} <span className={ui.caret} aria-hidden="true">⌄</span></summary><div className={ui.panel}><Nickname/></div></details>}<button className={ui.refresh} onClick={()=>void refresh(true)} disabled={loading} aria-label={copy.refresh}><span aria-hidden="true">↻</span></button></div></div>{error&&<p role="alert" className="public-rooms-error max-w-1680 my-30 mx-auto py-22 px-35 text-[19px]">{error}</p>}{loading&&!races.length&&<p role="status" className="public-rooms-loading max-w-1680 my-30 mx-auto py-22 px-35 text-[19px]">{copy.loading}</p>}{!loading&&!filtered.length&&!error&&<p className={ui.empty}>{races.length?copy.filterEmpty:copy.publicEmpty}</p>}{!loading&&<section className={ui.stack} aria-label={copy.courseSection}>{filtered.map((race,index)=><RaceCard key={race.id} race={race} index={index} total={filtered.length+starters.length}/>)}{starters.map((course,index)=><StarterCard key={course[0]} course={course} index={filtered.length+index} total={filtered.length+starters.length}/>)}</section>}</main>;
}
