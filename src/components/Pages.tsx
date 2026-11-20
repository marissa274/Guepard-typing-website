'use client';
import Link from 'next/link';
import {useSite} from './SiteContext';
export {default as How} from './HowToPlay';
export {default as Stats} from './StatsPage';
export function Info({page}:{page:'about'|'contact'|'legal'|'privacy'}){const {c,reset}=useSite();return <main id="main" tabIndex={-1} className="inner info min-h-[65vh] phone:min-h-[60vh]"><div className="eyebrow">GUÉPARD</div><h1>{c[page]}</h1><p className="max-w-740 mb-30">{c[`${page}Text`]}</p>{page==='privacy'&&<button className="button" onClick={reset}>{c.reset}</button>}</main>}
export function Missing(){const {c}=useSite();return <main id="main" tabIndex={-1} className="inner"><h1>{c.missing}</h1><Link className="button primary mt-24" href="/">{c.home} →</Link></main>}
