'use client';
import {useEffect,useRef,type KeyboardEvent} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname,useRouter} from 'next/navigation';
import {useSite} from './SiteContext';
import {AnimalAvatar} from './AnimalAvatar';
import {roomLabel} from '../lib/room-copy';
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
export function Header(){const {state,save,signOut,c,fr,setModal}=useSite(),path=usePathname()||'/',router=useRouter(),{menu,onKeyDown}=useDisclosure(path),current=(href:string)=>path===href?'page' as const:undefined;return <header className="canopy-header"><a className="skip-link" href="#main">{c.skipToContent}</a><Link className="brand" href="/"><Image src="/assets/guepard-logo.webp" width={106} height={78} sizes="106px" alt="" preload/><span>GUÉPARD</span></Link><nav className="main-navigation" aria-label="Navigation"><Link href="/" aria-current={current('/')} className={path==='/'?'active':''}>{c.home}</Link><Link href="/how" aria-current={current('/how')} className={path==='/how'?'active':''}>{c.howToPlay}</Link><Link href="/races" aria-current={current('/races')} className={`nav-races ${path==='/races'?'active':''}`}>{c.browse}</Link>{!state.user&&<Link className="results-stats-nav" href="/stats" aria-current={current('/stats')}>{c.stats}</Link>}{state.user&&<Link href="/stats" aria-current={current('/stats')} className={path==='/stats'?'active':''}>{c.stats}</Link>}</nav><div className="controls">{state.user?<details className="account" ref={menu} onKeyDown={onKeyDown}><summary><AnimalAvatar animal={state.avatar} avatarUrl={state.avatarUrl}/> <span>{state.name}</span></summary><div><small>{c.account}</small><Link href="/stats">{c.stats}</Link><button onClick={()=>{if(menu.current)menu.current.open=false;setModal('settings')}}>{c.settings}</button><button onClick={async()=>{await signOut();router.push('/')}}>{c.logout}</button></div></details>:<Link className="login" href="/login" aria-current={current('/login')}>{c.login}</Link>}<button className="language" onClick={()=>save('lang',fr?'en':'fr')} aria-label={roomLabel(c.langCurrent,{lang:state.lang.toUpperCase()})}><span aria-hidden="true">◎</span> {state.lang.toUpperCase()}<span aria-hidden="true">⌄</span></button><button className="theme" onClick={()=>save('dark',!state.dark)} aria-label={state.dark?c.themeToLight:c.themeToDark}><span aria-hidden="true">{state.dark?'☀':'☾'}</span></button></div><div className="header-branch" aria-hidden="true"/></header>}
export function Footer(){const {c,state}=useSite(),path=usePathname()||'/',current=(href:string)=>path===href?'page' as const:undefined;return <footer className="compact-footer"><div className="footer-cheetah" data-sleeping={state.dark} aria-hidden="true"/><div className="compact-footer-row"><Link className="brand" href="/">GUÉPARD</Link><nav className="essential-links" aria-label={c.usefulLinks}><Link href="/" aria-current={current('/')}>{c.home}</Link><Link href="/races" aria-current={current('/races')}>{c.browse}</Link><Link href="/how" aria-current={current('/how')}>{c.howToPlay}</Link>{(['contact','legal','privacy'] as const).map(x=><Link key={x} href={'/'+x} aria-current={current('/'+x)}>{c[x]}</Link>)}</nav></div><small className="compact-copyright">© {new Date().getFullYear()} GUÉPARD</small></footer>}
export {default as Modal} from './AccountSettings';
