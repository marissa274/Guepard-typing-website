'use client';
import Link from 'next/link';
import {useSite} from './SiteContext';
export {default as How} from './HowToPlay';
export {default as Stats} from './StatsPage';
export function Info({page}){const {c,reset}=useSite();return <main className="inner info"><div className="eyebrow">GUÉPARD</div><h1>{c[page]}</h1><p>{c[page+'Text']}</p>{page==='privacy'&&<button className="button" onClick={reset}>{c.reset}</button>}</main>}
export function Missing(){const {fr,c}=useSite();return <main className="inner"><h1>{fr?'Cette piste n’existe pas.':'This trail does not exist.'}</h1><Link className="button primary mt-6" href="/">{c.home} →</Link></main>}
