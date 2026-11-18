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
import {copy} from '../src/i18n';
import { SiteProvider } from '../src/components/SiteContext';
async function preferences(){
 const jar=await cookies(),requestHeaders=await headers();
 const chosen=jar.get('guepard-lang')?.value;
 const lang:Language=chosen==='fr'||chosen==='en'?chosen:(requestHeaders.get('accept-language')||'fr').toLowerCase().startsWith('fr')?'fr':'en';
 return {lang,dark:jar.get('guepard-theme')?.value==='dark'};
}
export async function generateMetadata(){const {lang}=await preferences();return {title:copy[lang].metaTitle,description:copy[lang].metaDescription}}
const initialPreferencesScript=String.raw`try{var d=JSON.parse(localStorage.getItem('guepard-dark'));var l=JSON.parse(localStorage.getItem('guepard-lang'));var t=document.cookie.match(/(?:^|;\s*)guepard-theme=(dark|light)(?:;|$)/);var c=document.cookie.match(/(?:^|;\s*)guepard-lang=(fr|en)(?:;|$)/);document.documentElement.dataset.theme=(typeof d==='boolean'?d:t?t[1]==='dark':matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';if(l==='fr'||l==='en')document.documentElement.lang=l;else if(c)document.documentElement.lang=c[1];}catch(error){}try{var r=document.documentElement;if(document.readyState!=='complete'){r.dataset.decor='pending';var ready=function(){r.dataset.decor='ready'};addEventListener('load',function(){if(!document.querySelector('.scene-background'))return ready();var timer=setTimeout(ready,1000);new PerformanceObserver(function(list){list.getEntries().forEach(function(entry){if(entry.element&&entry.element.closest('.scene-background')){clearTimeout(timer);ready()}})}).observe({type:'largest-contentful-paint',buffered:true})},{once:true})}}catch(error){r.dataset.decor='ready'}`;
export default async function RootLayout({children}:{children:ReactNode}) {const {lang,dark}=await preferences();return <html lang={lang} data-theme={dark?'dark':'light'} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:initialPreferencesScript}}/></head><body><SiteProvider initialLang={lang} initialDark={dark}>{children}</SiteProvider></body></html>}
