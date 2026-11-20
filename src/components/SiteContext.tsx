'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode,type Dispatch,type SetStateAction} from 'react';
import {copy} from '../i18n';
import {animalFor} from '../lib/animals';
import {authService} from '../services/auth';
import {resultService} from '../services/results';
import type {Account,SiteState,Language} from '../lib/site-types';
const defaults:SiteState={lang:'fr',dark:false,user:false,name:copy.fr.guestName,nameIsDefault:true,avatar:'cheetah',avatarUrl:undefined,results:[],privateRaces:[],summary:null};
/** The default guest name follows the language; a name the visitor typed is never touched, even if it looks like a default one. */
const defaultGuestNames=[copy.fr.guestName,copy.en.guestName];
const guestNameFor=(name:string,isDefault:boolean,lang:Language)=>isDefault?copy[lang].guestName:name;
const identityKeys=['name','nameIsDefault','avatar','results','privateRaces'];
type Save=<K extends keyof SiteState>(key:K,value:SiteState[K]|((previous:SiteState[K])=>SiteState[K]))=>void;
interface SiteContextValue {state:SiteState;save:Save;setAccount:(user:Account)=>void;signOut:()=>Promise<void>;ready:boolean;modal:string|null;setModal:Dispatch<SetStateAction<string|null>>;reset:()=>void;refreshResults:()=>Promise<void>;resultsError:string;c:typeof copy.fr;fr:boolean}
const Context=createContext<SiteContextValue|null>(null);
export function SiteProvider({children,initialLang='fr',initialDark=false}:{children:ReactNode;initialLang?:Language;initialDark?:boolean}){
 const [state,setState]=useState<SiteState>({...defaults,lang:initialLang,dark:initialDark,name:copy[initialLang].guestName}),[ready,setReady]=useState(false),[modal,setModal]=useState<string|null>(null),[resultsError,setResultsError]=useState('');
 const account=useRef<string|null>(null);
 const sessionGeneration=useRef(0);
 const refreshResults=useCallback(async()=>{
  const id=account.current,generation=sessionGeneration.current;if(!id)return;
  try{const page=await resultService.list();if(account.current===id&&sessionGeneration.current===generation){setState(previous=>({...previous,results:page.results,summary:page.summary}));setResultsError('')}}
  catch(error){if(account.current===id&&sessionGeneration.current===generation)setResultsError(error instanceof Error?error.message:copy[document.documentElement.lang==='en'?'en':'fr'].historyUnavailable)}
 },[]);
 useEffect(()=>{
  let active=true;const generation=sessionGeneration.current;
  const languageCookie=document.cookie.match(/(?:^|;\s*)guepard-lang=(fr|en)(?:;|$)/)?.[1];
  const themeCookie=document.cookie.match(/(?:^|;\s*)guepard-theme=(dark|light)(?:;|$)/)?.[1];
  const restored:SiteState={...defaults,lang:languageCookie==='fr'||languageCookie==='en'?languageCookie:navigator.language.toLowerCase().startsWith('fr')?'fr':'en',dark:themeCookie?themeCookie==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches};
  for(const key of Object.keys(defaults)){
   if(key==='user'||key==='summary'||key==='avatarUrl')continue;
   try{const storage=identityKeys.includes(key)?sessionStorage:localStorage;const value=JSON.parse(storage.getItem('guepard-'+key)||'null');if(value!==null)Object.assign(restored,{[key]:value})}catch{/* Storage can be unavailable in private browsing. */}
  }
  if(!['fr','en'].includes(restored.lang))restored.lang='fr';
  // A value stored before the flag existed counts as the default name when it equals one.
  const storedFlag=(()=>{try{return JSON.parse(sessionStorage.getItem('guepard-nameIsDefault')||'null')}catch{return null}})();
  if(typeof restored.name!=='string')restored.name=defaults.name;
  restored.nameIsDefault=typeof storedFlag==='boolean'?storedFlag:defaultGuestNames.includes(restored.name);
  restored.name=guestNameFor(restored.name,restored.nameIsDefault,restored.lang);
  restored.avatar=animalFor(restored.avatar).id;
  if(!Array.isArray(restored.results))restored.results=[];
  if(!Array.isArray(restored.privateRaces))restored.privateRaces=[];
  // Appearance preferences do not depend on the account request completing.
  setState(previous=>({...previous,lang:restored.lang,dark:restored.dark}));
  authService.current().then(async({user})=>{
   if(!active||sessionGeneration.current!==generation)return;
   if(user){account.current=user.id;setState(previous=>({...restored,lang:previous.lang,dark:previous.dark,user:true,name:user.username,avatar:animalFor(user.avatar).id,avatarUrl:user.avatarUrl,results:[],privateRaces:[]}));await refreshResults()}
   else setState(previous=>({...restored,lang:previous.lang,dark:previous.dark,name:guestNameFor(restored.name,restored.nameIsDefault,previous.lang)}));
  }).catch(()=>{if(active&&sessionGeneration.current===generation)setState(previous=>({...restored,lang:previous.lang,dark:previous.dark,name:guestNameFor(restored.name,restored.nameIsDefault,previous.lang)}))}).finally(()=>{if(active&&sessionGeneration.current===generation)setReady(true)});
  return()=>{active=false;account.current=null;sessionGeneration.current++};
 },[refreshResults]);
 useEffect(()=>{
  if(!ready)return;
  document.documentElement.lang=state.lang;document.documentElement.dataset.theme=state.dark?'dark':'light';
  document.cookie=`guepard-lang=${state.lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.cookie=`guepard-theme=${state.dark?'dark':'light'}; Path=/; Max-Age=31536000; SameSite=Lax`;
  for(const [key,value]of Object.entries(state)){
   if(key==='user'||key==='summary'||key==='avatarUrl')continue;
   try{
    if(identityKeys.includes(key)){localStorage.removeItem('guepard-'+key);if(!state.user)sessionStorage.setItem('guepard-'+key,JSON.stringify(value))}
    else localStorage.setItem('guepard-'+key,JSON.stringify(value));
   }catch{/* Storage can be unavailable in private browsing. */}
  }
 },[state,ready]);
 const save:Save=(key,value)=>{if(key==='results'&&account.current){void refreshResults();return}setState(previous=>{const next=typeof value==='function'?(value as (old:SiteState[typeof key])=>SiteState[typeof key])(previous[key]):value;return key==='lang'&&!previous.user?{...previous,lang:next as Language,name:guestNameFor(previous.name,previous.nameIsDefault,next as Language)}:key==='name'?{...previous,name:next as string,nameIsDefault:false}:key==='nameIsDefault'&&next?{...previous,nameIsDefault:true,name:copy[previous.lang].guestName}:{...previous,[key]:next}})};
 const setAccount=(user:Account)=>{sessionGeneration.current++;account.current=user.id;setReady(true);setState(previous=>({...previous,user:true,name:user.username,avatar:animalFor(user.avatar).id,avatarUrl:user.avatarUrl,results:[],privateRaces:[],summary:null}));void refreshResults()};
 const signOut=async()=>{sessionGeneration.current++;await authService.logout();account.current=null;setReady(true);setResultsError('');setState(previous=>({...previous,user:false,name:copy[previous.lang].guestName,nameIsDefault:true,avatar:'cheetah',avatarUrl:undefined,results:[],privateRaces:[],summary:null}))};
 const reset=()=>{for(const key of Object.keys(defaults)){localStorage.removeItem('guepard-'+key);sessionStorage.removeItem('guepard-'+key)}setState(previous=>previous.user?{...previous,lang:defaults.lang,dark:defaults.dark}:{...defaults})};
 return <Context.Provider value={{state,save,setAccount,signOut,ready,modal,setModal,reset,refreshResults,resultsError,c:copy[state.lang],fr:state.lang==='fr'}}>{children}</Context.Provider>
}
export function useSite(){const value=useContext(Context);if(!value)throw new Error('SiteProvider is required.');return value}
