'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {copy} from '../i18n';
import {animalFor} from '../lib/animals';
const defaults={lang:'fr',dark:false,user:false,name:'GuépardCurieux',avatar:'cheetah',results:[],privateRaces:[]};
const identityKeys=['name','avatar','results','privateRaces'];
const Context=createContext(null);
export function SiteProvider({children}){
 const [state,setState]=useState(defaults),[ready,setReady]=useState(false),[modal,setModal]=useState(null);
 useEffect(()=>{const restored={...defaults};try{restored.user=JSON.parse(localStorage.getItem('guepard-user'))===true}catch{}for(const key of Object.keys(defaults)){try{const storage=identityKeys.includes(key)&&!restored.user?sessionStorage:localStorage;const value=JSON.parse(storage.getItem('guepard-'+key));if(value!==null)restored[key]=value}catch{}}if(!['fr','en'].includes(restored.lang))restored.lang='fr';restored.avatar=restored.user?animalFor(restored.avatar).id:'cheetah';if(!Array.isArray(restored.results))restored.results=[];if(!Array.isArray(restored.privateRaces))restored.privateRaces=[];setState(restored);setReady(true)},[]);
 useEffect(()=>{document.documentElement.lang=state.lang;document.documentElement.dataset.theme=state.dark?'dark':'light';if(ready)for(const [key,value]of Object.entries(state)){try{const storage=identityKeys.includes(key)&&!state.user?sessionStorage:localStorage;storage.setItem('guepard-'+key,JSON.stringify(value));if(identityKeys.includes(key)&&!state.user)localStorage.removeItem('guepard-'+key)}catch{}}},[state,ready]);
 const save=(key,value)=>setState(previous=>key==='user'&&value===false?{...previous,user:false,name:defaults.name,avatar:'cheetah',results:[],privateRaces:[]}:{...previous,[key]:typeof value==='function'?value(previous[key]):value});
 const reset=()=>{for(const key of Object.keys(defaults)){localStorage.removeItem('guepard-'+key);sessionStorage.removeItem('guepard-'+key)}setState({...defaults})};
 return <Context.Provider value={{state,save,ready,modal,setModal,reset,c:copy[state.lang],fr:state.lang==='fr'}}>{children}</Context.Provider>
}
export const useSite=()=>useContext(Context);
