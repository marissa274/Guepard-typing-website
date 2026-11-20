'use client';
import {useEffect,useRef,type KeyboardEvent} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname,useRouter} from 'next/navigation';
import {useSite} from './SiteContext';
import {AnimalAvatar} from './AnimalAvatar';
/** Account disclosure: Escape closes it and returns focus to its summary; navigation and outside clicks close it too. */
function useDisclosure(path:string){
 const menu=useRef<HTMLDetailsElement|null>(null);
 useEffect(()=>{if(menu.current)menu.current.open=false},[path]);
 useEffect(()=>{
  function outside(event:PointerEvent){const element=menu.current;if(element?.open&&event.target instanceof Node&&!element.contains(event.target))element.open=false}
  document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);
 },[]);
 function onKeyDown(event:KeyboardEvent<HTMLDetailsElement>){const element=menu.current;if(event.key==='Escape'&&element?.open){event.preventDefault();element.open=false;element.querySelector('summary')?.focus()}}
 return {menu,onKeyDown};
}
/* Utilities (TECH-03, lot 0). The legacy class names stay as hooks for tests and for the contextual rules kept in
   src/styles/chrome.css (#app:has(...), active and races link colours, decorative backgrounds, footer padding). */
const ui={
 header:'canopy-header relative z-10 isolate grid grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-between gap-28 min-h-[var(--header-height)] pt-23 pb-31 px-[4%] bg-jungle text-cream [box-shadow:inset_0_-12px_25px_#143d2517] [--header-height:132px] [--branch-height:clamp(115px,15vw,220px)] dark:bg-[#1d452e] upto-1250:gap-12 upto-1250:px-[3%] tablet:grid-cols-[1fr_auto] tablet:pt-15 tablet:pb-30 tablet:px-[4%] phone:min-h-160 phone:flex-wrap phone:pt-14 phone:pb-28 phone:[--branch-height:120px] upto-450:px-8',
 skip:'skip-link absolute -left-999 top-0 focus:left-8 focus:top-8 focus:z-100 focus:bg-parchment focus:text-[#1b3a2b] focus:p-12 focus:rounded-[8px] focus:font-bold',
 brand:'brand relative z-2 flex items-center gap-10 font-display font-ultra text-[32px] tracking-[-1px] text-parchment upto-1250:text-[27px] phone:text-[24px] phone:gap-4 upto-450:text-[20px] upto-450:tracking-[-.5px]',
 logo:'w-106 h-78 object-contain upto-1250:w-88 upto-1250:h-65 tablet:h-58 phone:w-65 phone:h-49 tiny:w-50 tiny:h-43',
 navigation:'main-navigation relative z-2 flex items-center justify-center justify-self-center w-max max-w-full gap-3 p-7 border border-[#ffffff40] rounded-[40px] bg-[#00000026] text-[16px] font-semibold dark:bg-[#ffffff0c] upto-1250:text-[15px] tablet:col-[1/-1] tablet:row-[2] tablet:w-auto tablet:text-[16px] phone:w-full phone:p-5 phone:gap-0 phone:text-[14px] phone:order-3 upto-450:text-[13px]',
 link:'whitespace-nowrap rounded-[30px] py-13 px-17 upto-1250:py-12 upto-1250:px-12 phone:py-11 phone:px-10 upto-450:py-9 upto-450:px-8',
 controls:'controls relative z-3 flex items-center gap-12 text-[16px] font-semibold upto-1250:gap-8 tablet:col-[2] tablet:row-[1] phone:gap-5 phone:text-[14px] upto-450:gap-2',
 summary:'flex items-center justify-center gap-8 cursor-pointer [list-style:none] tablet:min-w-44 tablet:min-h-44',
 menu:'absolute right-0 top-35 tablet:top-50 z-5 grid gap-16 min-w-230 p-20 bg-card text-ink text-[16px] border border-line rounded-[15px] [box-shadow:0_10px_25px_#0002]',
 menuButton:'text-left p-0',
 login:'login wood-small-button whitespace-nowrap text-[16px] py-13 px-20 min-h-48 upto-1250:py-12 upto-1250:px-15 phone:text-[14px] phone:py-10 phone:px-12 phone:min-h-44 upto-450:text-[12px] upto-450:py-8 upto-450:px-9 upto-450:min-h-38',
 language:'language quiet text-cream gap-6 whitespace-nowrap border border-[#ffffff4a] rounded-control py-11 px-14 min-h-48 phone:text-[14px] phone:p-10 phone:min-h-44 upto-450:text-[12px] upto-450:p-7 upto-450:min-h-38',
 theme:'theme quiet text-cream border border-[#ffffff4a] rounded-control p-6 min-w-48 min-h-48 phone:p-0 phone:min-w-44 phone:min-h-44 upto-450:min-w-38 upto-450:min-h-38',
 branch:'header-branch absolute z-1 left-0 bottom-[calc(var(--branch-height)*-.47)] w-full h-[var(--branch-height)] object-fill pointer-events-none',
 footer:'compact-footer relative z-5 bg-jungle text-[#f4ead3] dark:bg-[#173d27]',
 cheetah:'footer-cheetah absolute right-[10%] -top-196 w-270 h-270 pointer-events-none [filter:drop-shadow(0_5px_3px_#17362328)] tablet:right-[7%] tablet:-top-185 tablet:w-250 tablet:h-250 phone:right-[2%] phone:-top-142 phone:w-200 phone:h-200',
 row:'compact-footer-row flex items-center justify-between max-w-1400 m-auto gap-45 upto-1250:gap-30 tablet:items-start phone:flex-col phone:gap-18',
 footerBrand:'brand shrink-0 flex items-center gap-5 font-display font-ultra text-[30px] tracking-[-1px] text-cream phone:text-[28px]',
 essential:'essential-links flex flex-wrap items-center justify-end gap-x-25 gap-y-12 p-0 [border:0] rounded-[40px] bg-transparent text-[16px] leading-[1.45] font-semibold text-cream upto-1250:gap-x-20 upto-1250:gap-y-10 tablet:justify-start phone:gap-x-22 phone:gap-y-4',
 essentialLink:'items-center min-h-44 p-0 aria-[current=page]:underline aria-[current=page]:underline-offset-8 aria-[current=page]:decoration-2 aria-[current=page]:text-sun',
 copyright:'compact-copyright block max-w-1400 mt-15 mx-auto mb-0 text-right text-[13px] text-[#d8e3ca] phone:text-left phone:text-[12px]',
};
const navClass=(active:boolean,extra='')=>[extra,ui.link,active?'active':''].filter(Boolean).join(' ');
export function Header(){const {state,save,signOut,c,fr,setModal}=useSite(),path=usePathname()||'/',router=useRouter(),{menu,onKeyDown}=useDisclosure(path),current=(href:string)=>path===href?'page' as const:undefined;return <header className={ui.header}><a className={ui.skip} href="#main">{c.skipToContent}</a><Link className={ui.brand} href="/"><Image className={ui.logo} src="/assets/guepard-logo.webp" width={106} height={78} sizes="106px" alt="" preload/><span>GUÉPARD</span></Link><nav className={ui.navigation} aria-label={c.navigation}><Link href="/" aria-current={current('/')} className={navClass(path==='/')}>{c.home}</Link><Link href="/how" aria-current={current('/how')} className={navClass(path==='/how')}>{c.howToPlay}</Link><Link href="/races" aria-current={current('/races')} className={navClass(path==='/races','nav-races')}>{c.browse}</Link>{!state.user&&<Link className={navClass(false,'results-stats-nav hidden')} href="/stats" aria-current={current('/stats')}>{c.stats}</Link>}{state.user&&<Link href="/stats" aria-current={current('/stats')} className={navClass(path==='/stats')}>{c.stats}</Link>}</nav><div className={ui.controls}>{state.user?<details className="account relative" ref={menu} onKeyDown={onKeyDown}><summary className={ui.summary}><AnimalAvatar className="w-32 h-32" animal={state.avatar} avatarUrl={state.avatarUrl}/> <span className="tablet:hidden">{state.name}</span></summary><div className={ui.menu}><small className="text-muted">{c.account}</small><Link href="/stats">{c.stats}</Link><button className={ui.menuButton} onClick={()=>{if(menu.current)menu.current.open=false;setModal('settings')}}>{c.settings}</button><button className={ui.menuButton} onClick={async()=>{await signOut();router.push('/')}}>{c.logout}</button></div></details>:<Link className={ui.login} href="/login" aria-current={current('/login')}>{c.login}</Link>}<button className={ui.language} onClick={()=>save('lang',fr?'en':'fr')} aria-label={c.langSwitch}><span aria-hidden="true">◎</span> {state.lang.toUpperCase()}<span aria-hidden="true">⌄</span></button><button className={ui.theme} onClick={()=>save('dark',!state.dark)} aria-label={state.dark?c.themeToLight:c.themeToDark}><svg className="w-22 h-22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{state.dark?<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>:<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>}</svg></button></div><div className={ui.branch} aria-hidden="true"/></header>}
export function Footer(){const {c,state}=useSite(),path=usePathname()||'/',current=(href:string)=>path===href?'page' as const:undefined;return <footer className={ui.footer}><div className={ui.cheetah} data-sleeping={state.dark} aria-hidden="true"/><div className={ui.row}><Link className={ui.footerBrand} href="/">GUÉPARD</Link><nav className={ui.essential} aria-label={c.usefulLinks}><Link className={ui.essentialLink} href="/" aria-current={current('/')}>{c.home}</Link><Link className={ui.essentialLink} href="/races" aria-current={current('/races')}>{c.browse}</Link><Link className={ui.essentialLink} href="/how" aria-current={current('/how')}>{c.howToPlay}</Link>{(['contact','legal','privacy'] as const).map(x=><Link className={ui.essentialLink} key={x} href={'/'+x} aria-current={current('/'+x)}>{c[x]}</Link>)}</nav></div><small className={ui.copyright}>© {new Date().getFullYear()} GUÉPARD</small></footer>}
export {default as Modal} from './AccountSettings';
