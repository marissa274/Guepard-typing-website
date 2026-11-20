'use client';
import {useSite} from './SiteContext';
import {howCopy} from '../i18n/how';
import {formatPadded} from '../i18n/format';
import Link from 'next/link';
import Runner from './lobby/Runner';
import {AnimalAvatar} from './AnimalAvatar';
import type {RunnerSpecies} from '../lib/race-ranking';
const runnerSpecies:RunnerSpecies[]=['cheetah','gazelle','hare'];

/* Utilities (TECH-03, lot A). Kept in src/styles/how.css: the wooden frame, the illustration backdrop and the podium blocks
   (repeating gradients and url()). The hooks `how-cards`, `how-mini-tracks`, `how-*` stay for the tests. */
const ui={
 page:'how-jungle bg-cream text-canopy pb-150 dark:bg-[#173b32] dark:text-cream',
 banner:'how-banner flex items-center justify-between gap-35 bg-sun text-canopy pt-65 pb-45 px-[max(6%,24px)] phone:flex-col phone:gap-15 phone:pt-45 phone:pb-25 phone:px-24 phone:text-center',
 bannerKicker:'text-[14px] font-extrabold tracking-[3px]',
 title:'text-[clamp(38px,5vw,76px)] my-16 leading-[1.05] text-[#234e30]',
 intro:'text-[20px]',
 logo:'w-[40%] max-w-520 [filter:drop-shadow(0_12px_5px_#8f6d2330)] phone:w-[65%] phone:max-w-300',
 cards:'how-cards grid grid-cols-[1fr_1fr] gap-30 max-w-1350 my-50 mx-auto px-24 phone:grid-cols-[1fr] phone:gap-25 phone:mt-30 phone:px-15',
 card:'how-card rounded-[24px] [box-shadow:0_9px_0_#77512b38] overflow-hidden dark:text-canopy',
 copy:'how-card-copy pt-25 pb-30 px-28 phone:p-20',
 number:'text-[18px] font-black text-[#a55d20]',
 cardTitle:'text-[30px] mt-8 mb-12 phone:text-[27px]',
 cardText:'text-[19px] leading-[1.6]',
 art:'how-illustration relative flex flex-col justify-center items-center p-22 overflow-hidden h-250 phone:h-220',
 friends:'how-friends flex gap-18',
 sign:'how-mini-sign py-12 px-25 border-5 border-[#b18a51] rounded-[14px] bg-cream text-[20px] font-extrabold',
 keyboard:'how-keyboard grid grid-cols-[repeat(8,1fr)] gap-3 bg-[#a88f67] p-8 w-190 [transform:perspective(200px)_rotateX(25deg)] rounded-[8px]',
 key:'h-10 rounded-[2px] bg-[#fff4df] [box-shadow:0_2px_#79694d]',
 lobby:'how-mini-lobby w-[90%] grid grid-cols-[1fr_1fr] gap-12 bg-[#fff3df] border-8 border-[#ac7946] rounded-panel p-13',
 miniRow:'flex gap-10 items-center p-6 border-b border-b-[#dcca9d] text-[13px]',
 line:'how-line h-8 rounded-[6px] bg-[#93aa73] flex-1',
 tracks:'how-mini-tracks w-full [&_.race-runner]:w-85 [&_.race-runner]:h-85',
 track:'relative h-62 [border-bottom:3px_dashed_#537845]',
 trackRunner:'absolute bottom-0',
 podium:'how-mini-podium flex items-end gap-10 w-[90%] justify-center',
 place:'mini-place flex flex-col items-center flex-1 [&_.race-runner]:w-85 [&_.race-runner]:h-85',
 block:'grid place-items-center text-[35px] w-full rounded-[8px_8px_0_0] text-[#fff4dc] [box-shadow:5px_5px_#805733]',
 ready:'how-ready text-center py-15 px-24',
 readyText:'text-[18px] leading-[1.8]',
 readyTitle:'text-[36px] mt-30 mb-24 dark:text-cream phone:text-[30px]',
 actions:'flex justify-center items-center gap-25 phone:flex-col phone:gap-20',
 action:'text-[18px]',
 secondary:'text-[18px] underline underline-offset-5',
};
const blockHeight:Record<number,string>={1:'h-100',2:'h-75',3:'h-55'};
function Illustration({index}:{index:number}){const {fr}=useSite(),labels=howCopy[fr?'fr':'en'];return <div className={ui.art+' how-art-'+index} aria-hidden="true">{index===0?<><div className={ui.friends}>{['monkey','cheetah','parrot'].map(a=><AnimalAvatar key={a} animal={a} className="size-82"/>)}</div><div className={ui.sign}>{labels.welcome}</div><div className={ui.keyboard}>{Array.from({length:24},(_,i)=><i key={i} className={ui.key}/>)}</div></>:index===1?<div className={ui.lobby}><div>{['cheetah','toucan','elephant'].map(a=><p key={a} className={ui.miniRow}><AnimalAvatar animal={a} className="size-35"/><span className={ui.line}/></p>)}</div><div>{labels.mini.map(t=><p key={t} className={ui.miniRow}>{t}<span className={ui.line}/></p>)}</div></div>:index===2?<div className={ui.tracks}>{runnerSpecies.map((a,i)=><div key={a} className={ui.track}><span className={ui.trackRunner} style={{left:(65-i*20)+'%'}}><Runner species={a} motion="running"/></span></div>)}</div>:<div className={ui.podium}>{[2,1,3].map((rank)=><div key={rank} className={`${ui.place} place-${rank}`}><Runner species={runnerSpecies[rank-1]}/><b className={`${ui.block} ${blockHeight[rank]}`}>{rank}</b></div>)}</div>}</div>}
export default function HowToPlay(){const {fr}=useSite(),labels=howCopy[fr?'fr':'en'];return <main id="main" tabIndex={-1} className={ui.page}><section className={ui.banner}><div><p className={ui.bannerKicker}>{labels.banner}</p><h1 className={ui.title}>{labels.title}<br/>{labels.subtitle}</h1><p className={ui.intro}>{labels.intro}</p></div><img className={ui.logo} src="/assets/guepard-logo.webp" alt={labels.image}/></section><div className={ui.cards}>{labels.steps.map(([title,copy],i)=><article className={ui.card} key={title}><Illustration index={i}/><div className={ui.copy}><span className={ui.number}>{formatPadded(fr?'fr':'en',i+1)}</span><h2 className={ui.cardTitle}>{title}</h2><p className={ui.cardText}>{copy}</p>{i===0&&<small>{labels.codeNote}</small>}{i===3&&<small>{labels.rematchNote}</small>}</div></article>)}</div><section className={ui.ready}><p className={ui.readyText}>{labels.physical}</p><p className={ui.readyText}>{labels.guest}</p><h2 className={ui.readyTitle}>{labels.ready}</h2><div className={ui.actions}><Link className={`wood-primary ${ui.action}`} href="/play">{labels.quick} <span aria-hidden="true">→</span></Link><Link className={ui.secondary} href="/create">{labels.create}</Link></div></section></main>}
