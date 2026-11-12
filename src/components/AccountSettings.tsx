'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {AnimalAvatar,AnimalPicker} from './AnimalAvatar';
import {useSite} from './SiteContext';
import {authService} from '../services/auth';

export default function AccountSettings(){
 const {setModal,state,save,c,fr}=useSite(),dialog=useRef<HTMLDialogElement>(null);
 const [username,setUsername]=useState(state.name),[avatar,setAvatar]=useState(state.avatar);
 const [passwords,setPasswords]=useState({currentPassword:'',password:'',confirmation:''});
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState<{error:boolean;message:string}|null>(null);
 useEffect(()=>{const previous=document.activeElement;dialog.current?.showModal();return()=>{if(previous instanceof HTMLElement)previous.focus()}},[]);
 async function profile(event:FormEvent){
  event.preventDefault();setBusy(true);setNotice(null);
  try{const {user}=await authService.updateProfile({username,avatar});save('name',user.username);save('avatar',user.avatar);setUsername(user.username);setNotice({error:false,message:fr?'Profil enregistré.':'Profile saved.'})}
  catch(error){setNotice({error:true,message:error.message})}
  finally{setBusy(false)}
 }
 async function password(event:FormEvent){
  event.preventDefault();setBusy(true);setNotice(null);
  try{await authService.changePassword(passwords);setPasswords({currentPassword:'',password:'',confirmation:''});setNotice({error:false,message:fr?'Mot de passe modifié. Les autres sessions ont été déconnectées.':'Password changed. Other sessions have been signed out.'})}
  catch(error){setNotice({error:true,message:error.message})}
  finally{setBusy(false)}
 }
 return <dialog ref={dialog} onClose={()=>setModal(null)} aria-labelledby="modal-title">
  <button className="close" aria-label={c.close} onClick={()=>dialog.current?.close()}>×</button>
  <AnimalAvatar animal={state.avatar}/><h2 id="modal-title">{c.settings}</h2>
  {notice&&<p role={notice.error?'alert':'status'}>{notice.message}</p>}
  <form onSubmit={profile}><fieldset disabled={busy}><legend>{c.account}</legend>
   <label htmlFor="setting-name">{c.nickname}</label><input id="setting-name" autoComplete="username" minLength={3} maxLength={24} required value={username} onChange={event=>setUsername(event.target.value)}/>
   <AnimalPicker value={avatar} onChange={setAvatar} fr={fr}/>
   <button className="button primary" disabled={busy}>{fr?'Enregistrer le profil':'Save profile'}</button>
  </fieldset></form>
  <form onSubmit={password}><fieldset disabled={busy}><legend>{fr?'Modifier le mot de passe':'Change password'}</legend>
   <label htmlFor="setting-current-password">{fr?'Mot de passe actuel':'Current password'}</label><input id="setting-current-password" type="password" autoComplete="current-password" maxLength={128} required value={passwords.currentPassword} onChange={event=>setPasswords(old=>({...old,currentPassword:event.target.value}))}/>
   <label htmlFor="setting-password">{fr?'Nouveau mot de passe':'New password'}</label><input id="setting-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={passwords.password} onChange={event=>setPasswords(old=>({...old,password:event.target.value}))}/>
   <label htmlFor="setting-confirmation">{fr?'Confirmer le nouveau mot de passe':'Confirm new password'}</label><input id="setting-confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={passwords.confirmation} onChange={event=>setPasswords(old=>({...old,confirmation:event.target.value}))}/>
   <button className="button primary" disabled={busy}>{fr?'Modifier le mot de passe':'Change password'}</button>
  </fieldset></form>
 </dialog>
}
