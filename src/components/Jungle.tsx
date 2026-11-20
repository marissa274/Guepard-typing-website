'use client';
import {useRef} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {useSite} from './SiteContext';
import {useParallax} from '../hooks/useParallax';
import SignBoard from './SignBoard';
import JoinByCode from './JoinByCode';
import {roomCopy} from '../lib/room-copy';
/* Utilities (TECH-03, lot A). Legacy class names stay as hooks (tests, sprites in kit.css). Kept in src/styles/home.css: the rope
   pseudo-elements, the sprite atlas bounds, @keyframes wooden-sign-sway and the reduced-motion !important rules. */
const depth='scene-depth absolute inset-0 pointer-events-none transition-[transform] duration-[450ms] ease-[ease-out] dark:[filter:brightness(.65)_saturate(.85)] phone:transform-none';
const sky='object-cover transition-[transform] duration-[450ms] ease-[ease-out] [transform:scale(1.04)_translate(calc(var(--pointer-x)*-3px),calc(var(--pointer-y)*-2px))]';
const ui={
 main:'home-main relative',
 scene:'jungle-scene relative w-full h-[calc(100svh_-_132px)] min-h-580 max-h-1100 bg-cream [--pointer-x:0] [--pointer-y:0] tablet:h-[calc(100svh_-_166px)] phone:max-h-850',
 background:'scene-background absolute inset-0 overflow-hidden pointer-events-none dark:bg-[#152e63]',
 skyLight:'scene-sky-light dark:hidden '+sky,
 skyDark:'scene-sky-dark hidden dark:block '+sky,
 far:depth+' depth-far z-1 [transform:translate(calc(var(--pointer-x)*-5px),calc(var(--pointer-y)*-3px))]',
 middle:depth+' depth-middle z-2 [transform:translate(calc(var(--pointer-x)*-9px),calc(var(--pointer-y)*-5px))]',
 near:depth+' depth-near z-4 [transform:translate(calc(var(--pointer-x)*-14px),calc(var(--pointer-y)*-8px))]',
 leaves:'scene-leaves absolute w-[38%] aspect-square bottom-[-1%] [filter:drop-shadow(4px_7px_8px_#24412820)] phone:w-[65%] phone:bottom-0',
 leavesLeft:'leaves-left left-[-3%] phone:left-[-10%]',
 leavesRight:'leaves-right right-[-3%] [transform:scaleX(-1)] phone:right-[-10%]',
 cutoutRight:'[animation-delay:-4s] [animation-duration:9s]',
 clearing:'jungle-clearing absolute z-6 left-1/2 top-[42%] [transform:translate(-50%,-50%)] w-[min(44vw,610px)] tablet:w-[55vw] phone:w-[83%]',
 menu:'jungle-menu hanging-boards relative isolate [--canopy-reach:max(65px,calc((100svh_-_132px)_*_.42_-_157px))] [transform-origin:50%_calc(0px_-_var(--canopy-reach))] [animation:wooden-sign-sway_6s_ease-in-out_3_alternate] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none tablet:[--canopy-reach:max(65px,calc((100svh_-_166px)_*_.42_-_157px))] phone:[--canopy-reach:max(115px,calc((100svh_-_166px)_*_.42_-_128px))]',
 ropes:'board-ropes absolute left-0 right-0 top-[calc(0px_-_var(--canopy-reach))] -bottom-16 pointer-events-none -z-1 phone:-bottom-12',
 planks:'board-planks relative flex flex-col gap-25 phone:gap-20',
 board:'board-action relative isolate flex items-center justify-between gap-14 w-full min-h-88 py-21 px-46 text-left font-display font-black leading-[1.25] text-[#382a1a] drop-shadow-plank text-shadow-wood [transition:transform_.18s] hover:[filter:drop-shadow(2px_6px_3px_#46301c32)_brightness(1.06)] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-focus-woodland dark:focus-visible:outline-focus-night focus-visible:outline-offset-2 focus-visible:rounded-[7px] focus-visible:[box-shadow:0_0_0_2px_var(--color-parchment)] motion-reduce:[transition:none] phone:min-h-72 phone:py-18 phone:px-26 tiny:py-17 tiny:px-24',
 boardSize:'text-[clamp(19px,1.8vw,28px)] phone:text-[17px] tiny:text-[16px]',
 boardFirstSize:'text-[clamp(22px,2.2vw,33px)] phone:text-[21px] tiny:text-[19px]',
 icon:'text-[24px] phone:text-[20px]',
 mascot:'jungle-mascot sleeping-cheetah absolute z-7 left-[2%] -bottom-55 w-[clamp(290px,33vw,475px)] pointer-events-none [filter:drop-shadow(0_8px_6px_#18312222)] dark:[filter:brightness(.8)] phone:w-[67%] phone:min-w-235 phone:left-[-2%] phone:-bottom-25',
};
const animalBase='scene-animal absolute pointer-events-none';
const shadow='[filter:drop-shadow(5px_12px_9px_#243c2424)]';
const animals:Record<string,string>={
 monkey:`scene-monkey ${animalBase} ${shadow} aspect-square z-5 w-[clamp(180px,19vw,285px)] left-[23%] -top-10 dark:[filter:brightness(.8)] tablet:left-[24%] tablet:w-[23%] phone:w-[39%] phone:left-[6%] phone:-top-8`,
 elephant:`scene-elephant ${animalBase} ${shadow} aspect-square w-[29%] left-0 top-[26%] tablet:w-[32%] tablet:left-[-3%] phone:w-[48%] phone:left-[-9%] phone:top-[55%]`,
 giraffe:`scene-giraffe ${animalBase} aspect-[2/3] w-[17%] right-[7%] top-[5%] [filter:drop-shadow(4px_9px_7px_#24412822)] tablet:w-[19%] tablet:right-[6%] phone:w-[30%] phone:right-[4%] phone:top-[4%]`,
 toucan:`scene-toucan ${animalBase} ${shadow} aspect-[491/512] w-[18%] left-0 top-[4%] phone:w-[33%] phone:top-[27%]`,
 crocodile:`scene-crocodile ${animalBase} ${shadow} aspect-[610/512] w-[28%] right-[19%] bottom-0 phone:w-[49%] phone:right-[17%] phone:bottom-[8%]`,
 parrot:`scene-parrot ${animalBase} ${shadow} aspect-square w-[20%] min-w-180 right-0 bottom-[3%] [transform:rotate(-6deg)] phone:w-[39%] phone:min-w-0 phone:right-[-2%] phone:bottom-[13%] phone:[transform:rotate(-5deg)]`,
};
function Animal({name}:{name:string}){const {state}=useSite();return <div className={animals[name]} data-sleeping={state.dark} aria-hidden="true">{name==='giraffe'?<Image width={1024} height={1536} sizes="(max-width: 700px) 30vw, 17vw" className="giraffe-full block w-full h-full object-contain" src={state.dark?'/assets/giraffe-night.webp':'/assets/giraffe-full.webp'} alt=""/>:<div className={`animal-cutout animal-${name}`}/>}</div>}
export default function Jungle(){const {fr}=useSite(),copy=roomCopy(fr),ref=useRef<HTMLElement|null>(null);useParallax(ref);return <main id="main" tabIndex={-1} className={ui.main}><h1 className="sr-only m-0">{copy.homeTitle}</h1><section ref={ref} className={ui.scene}>
 <div className={ui.background} aria-hidden="true"><Image className={ui.skyLight} fill sizes="100vw" src="/assets/relief-background.webp" alt="" fetchPriority="high"/><Image className={ui.skyDark} fill sizes="100vw" src="/assets/jungle-blue-night.webp" alt="" fetchPriority="high"/></div>
 <div className={ui.far} aria-hidden="true"><Animal name="giraffe"/><Animal name="elephant"/><Animal name="toucan"/></div>
 <div className={ui.middle} aria-hidden="true"><Animal name="crocodile"/></div>
 <div className={ui.clearing}><div className={ui.menu}><div className={ui.ropes} aria-hidden="true"/><div className={ui.planks}><Link className={`${ui.board} ${ui.boardFirstSize}`} href="/play"><SignBoard/>{copy.quick}<span className={ui.icon} aria-hidden="true">➜</span></Link><Link className={`${ui.board} ${ui.boardSize}`} href="/create"><SignBoard/>{copy.create}<span className={ui.icon} aria-hidden="true">＋</span></Link><Link className={`${ui.board} ${ui.boardSize}`} href="/races"><SignBoard/>{copy.browse}<span className={ui.icon} aria-hidden="true">↗</span></Link></div></div><JoinByCode home/></div>
 <div className={ui.near} aria-hidden="true"><div className={`${ui.leaves} ${ui.leavesLeft}`}><div className="leaves-cutout"/></div><div className={`${ui.leaves} ${ui.leavesRight}`}><div className={`leaves-cutout ${ui.cutoutRight}`}/></div><Animal name="parrot"/></div>
 <Animal name="monkey"/><div className={ui.mascot} aria-hidden="true"/>
 </section></main>}
