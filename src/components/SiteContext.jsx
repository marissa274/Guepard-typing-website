'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {copy} from '../i18n';
const defaults={lang:'fr',dark:false,user:false,name:'GuépardCurieux',avatar:'🐆',results:[],privateRaces:[]};
const Context=createContext(null);
export function SiteProvider({children}){
 const [state,setState]=useState(defaults),[ready,setReady]=useState(false),[modal,setModal]=useState(null);
 useEffect(()=>{const restored={...defaults};for(const key of Object.keys(defaults)){try{const value=JSON.parse(localStorage.getItem('guepard-'+key));if(value!==null)restored[key]=value}catch{}}if(!['fr','en'].includes(restored.lang))restored.lang='fr';if(!Array.isArray(restored.results))restored.results=[];if(!Array.isArray(restored.privateRaces))restored.privateRaces=[];setState(restored);setReady(true)},[]);
 useEffect(()=>{document.documentElement.lang=state.lang;document.documentElement.dataset.theme=state.dark?'dark':'light';if(ready)for(const [key,value]of Object.entries(state)){try{localStorage.setItem('guepard-'+key,JSON.stringify(value))}catch{}}},[state,ready]);
 const save=(key,value)=>setState(previous=>({...previous,[key]:typeof value==='function'?value(previous[key]):value}));
 const reset=()=>{for(const key of Object.keys(defaults))localStorage.removeItem('guepard-'+key);setState({...defaults})};
 return <Context.Provider value={{state,save,ready,modal,setModal,reset,c:copy[state.lang],fr:state.lang==='fr'}}>{children}</Context.Provider>
}
export const useSite=()=>useContext(Context);
