'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {copy} from '../i18n';
import {animalFor} from '../lib/animals';
import {authService} from '../services/auth';
const defaults={lang:'fr',dark:false,user:false,name:'GuépardCurieux',avatar:'cheetah',results:[],privateRaces:[]};
const identityKeys=['name','avatar','results','privateRaces'];
const Context=createContext(null);
export function SiteProvider({children}){
 const [state,setState]=useState(defaults),[ready,setReady]=useState(false),[modal,setModal]=useState(null);
 useEffect(()=>{let active=true;const restored={...defaults};for(const key of Object.keys(defaults)){if(key==='user')continue;try{const storage=identityKeys.includes(key)?sessionStorage:localStorage;const value=JSON.parse(storage.getItem('guepard-'+key));if(value!==null)restored[key]=value}catch{}}if(!['fr','en'].includes(restored.lang))restored.lang='fr';restored.avatar=animalFor(restored.avatar).id;if(!Array.isArray(restored.results))restored.results=[];if(!Array.isArray(restored.privateRaces))restored.privateRaces=[];authService.current().then(({user})=>{if(active)setState(user?{...restored,user:true,name:user.username,avatar:animalFor(user.avatar).id,results:[],privateRaces:[]}:restored)}).catch(()=>{if(active)setState(restored)}).finally(()=>{if(active)setReady(true)});return()=>{active=false}},[]);
 useEffect(()=>{document.documentElement.lang=state.lang;document.documentElement.dataset.theme=state.dark?'dark':'light';if(ready)for(const [key,value]of Object.entries(state)){if(key==='user')continue;try{const storage=identityKeys.includes(key)&&!state.user?sessionStorage:localStorage;storage.setItem('guepard-'+key,JSON.stringify(value));if(identityKeys.includes(key)&&!state.user)localStorage.removeItem('guepard-'+key)}catch{}}},[state,ready]);
 const save=(key,value)=>setState(previous=>({...previous,[key]:typeof value==='function'?value(previous[key]):value}));
 const setAccount=user=>setState(previous=>({...previous,user:true,name:user.username,avatar:animalFor(user.avatar).id,results:[],privateRaces:[]}));
 const signOut=async()=>{await authService.logout();setState(previous=>({...previous,user:false,name:defaults.name,avatar:'cheetah',results:[],privateRaces:[]}))};
 const reset=()=>{for(const key of Object.keys(defaults)){localStorage.removeItem('guepard-'+key);sessionStorage.removeItem('guepard-'+key)}setState({...defaults})};
 return <Context.Provider value={{state,save,setAccount,signOut,ready,modal,setModal,reset,c:copy[state.lang],fr:state.lang==='fr'}}>{children}</Context.Provider>
}
export const useSite=()=>useContext(Context);
