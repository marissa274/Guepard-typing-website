'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {copy} from '../i18n';
import {animalFor} from '../lib/animals';
import {authService} from '../services/auth';
import {resultService} from '../services/results';
const defaults={lang:'fr',dark:false,user:false,name:'GuépardCurieux',avatar:'cheetah',results:[],privateRaces:[],summary:null};
const identityKeys=['name','avatar','results','privateRaces'];
const Context=createContext(null);
export function SiteProvider({children}){
 const [state,setState]=useState(defaults),[ready,setReady]=useState(false),[modal,setModal]=useState(null),[resultsError,setResultsError]=useState('');
 const account=useRef<string|null>(null);
 const sessionGeneration=useRef(0);
 const refreshResults=useCallback(async()=>{
  const id=account.current,generation=sessionGeneration.current;if(!id)return;
  try{const page=await resultService.list();if(account.current===id&&sessionGeneration.current===generation){setState(previous=>({...previous,results:page.results,summary:page.summary}));setResultsError('')}}
  catch(error){if(account.current===id&&sessionGeneration.current===generation)setResultsError(error instanceof Error?error.message:'Historique indisponible.')}
 },[]);
 useEffect(()=>{
  let active=true;const generation=sessionGeneration.current;
  const restored={...defaults};
  for(const key of Object.keys(defaults)){
   if(key==='user'||key==='summary')continue;
   try{const storage=identityKeys.includes(key)?sessionStorage:localStorage;const value=JSON.parse(storage.getItem('guepard-'+key));if(value!==null)restored[key]=value}catch{}
  }
  if(!['fr','en'].includes(restored.lang))restored.lang='fr';
  restored.avatar=animalFor(restored.avatar).id;
  if(!Array.isArray(restored.results))restored.results=[];
  if(!Array.isArray(restored.privateRaces))restored.privateRaces=[];
  authService.current().then(async({user})=>{
   if(!active||sessionGeneration.current!==generation)return;
   if(user){account.current=user.id;setState({...restored,user:true,name:user.username,avatar:animalFor(user.avatar).id,results:[],privateRaces:[]});await refreshResults()}
   else setState(restored);
  }).catch(()=>{if(active&&sessionGeneration.current===generation)setState(restored)}).finally(()=>{if(active&&sessionGeneration.current===generation)setReady(true)});
  return()=>{active=false;account.current=null;sessionGeneration.current++};
 },[refreshResults]);
 useEffect(()=>{
  document.documentElement.lang=state.lang;document.documentElement.dataset.theme=state.dark?'dark':'light';
  if(!ready)return;
  for(const [key,value]of Object.entries(state)){
   if(key==='user'||key==='summary')continue;
   try{
    if(identityKeys.includes(key)){localStorage.removeItem('guepard-'+key);if(!state.user)sessionStorage.setItem('guepard-'+key,JSON.stringify(value))}
    else localStorage.setItem('guepard-'+key,JSON.stringify(value));
   }catch{}
  }
 },[state,ready]);
 const save=(key,value)=>{if(key==='results'&&account.current){void refreshResults();return}setState(previous=>({...previous,[key]:typeof value==='function'?value(previous[key]):value}))};
 const setAccount=user=>{sessionGeneration.current++;account.current=user.id;setReady(true);setState(previous=>({...previous,user:true,name:user.username,avatar:animalFor(user.avatar).id,results:[],privateRaces:[],summary:null}));void refreshResults()};
 const signOut=async()=>{sessionGeneration.current++;await authService.logout();account.current=null;setReady(true);setResultsError('');setState(previous=>({...previous,user:false,name:defaults.name,avatar:'cheetah',results:[],privateRaces:[],summary:null}))};
 const reset=()=>{for(const key of Object.keys(defaults)){localStorage.removeItem('guepard-'+key);sessionStorage.removeItem('guepard-'+key)}setState(previous=>previous.user?{...previous,lang:defaults.lang,dark:defaults.dark}:{...defaults})};
 return <Context.Provider value={{state,save,setAccount,signOut,ready,modal,setModal,reset,refreshResults,resultsError,c:copy[state.lang],fr:state.lang==='fr'}}>{children}</Context.Provider>
}
export const useSite=()=>useContext(Context);
