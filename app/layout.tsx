import '../src/fonts.css';
import '../src/style.css';
import '../src/jungle.css';
import '../src/auth.css';
import '../src/expeditions.css';
import '../src/woodland.css';
import '../src/race-tracks.css';
import '../src/lobby-compact.css';
import '../src/play-experience.css';
import '../src/results.css';
import '../src/results-reference.css';
import './globals.css';
import type {ReactNode} from 'react';
import {cookies,headers} from 'next/headers';
import type {Language} from '../src/lib/site-types';
import { SiteProvider } from '../src/components/SiteContext';
async function preferences(){
 const jar=await cookies(),requestHeaders=await headers();
 const chosen=jar.get('guepard-lang')?.value;
 const lang:Language=chosen==='fr'||chosen==='en'?chosen:(requestHeaders.get('accept-language')||'fr').toLowerCase().startsWith('fr')?'fr':'en';
 return {lang,dark:jar.get('guepard-theme')?.value==='dark'};
}
export async function generateMetadata(){const {lang}=await preferences();return {title:lang==='fr'?'GUÉPARD — Courses de frappe':'GUÉPARD — Typing races',description:lang==='fr'?'Pratique la frappe au clavier dans des courses multijoueurs. Rejoins un salon et retrouve tes progrès.':'Practice typing in multiplayer races. Join a lobby and follow your progress.'}}
const initialPreferencesScript=String.raw`try{var d=JSON.parse(localStorage.getItem('guepard-dark'));var l=JSON.parse(localStorage.getItem('guepard-lang'));var t=document.cookie.match(/(?:^|;\s*)guepard-theme=(dark|light)(?:;|$)/);var c=document.cookie.match(/(?:^|;\s*)guepard-lang=(fr|en)(?:;|$)/);document.documentElement.dataset.theme=(typeof d==='boolean'?d:t?t[1]==='dark':matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';if(l==='fr'||l==='en')document.documentElement.lang=l;else if(c)document.documentElement.lang=c[1];}catch(error){}`;
export default async function RootLayout({children}:{children:ReactNode}) {const {lang,dark}=await preferences();return <html lang={lang} data-theme={dark?'dark':'light'} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:initialPreferencesScript}}/></head><body><SiteProvider initialLang={lang} initialDark={dark}>{children}</SiteProvider></body></html>}
