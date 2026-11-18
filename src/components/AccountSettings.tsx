'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {AnimalAvatar,AnimalPicker} from './AnimalAvatar';
import {useSite} from './SiteContext';
import {authService} from '../services/auth';
import {accountCopy} from '../i18n/account';

export default function AccountSettings(){
 const {setModal,state,save,c,fr}=useSite(),labels=accountCopy[fr?'fr':'en'],dialog=useRef<HTMLDialogElement>(null);
 const [username,setUsername]=useState(state.name),[avatar,setAvatar]=useState(state.avatar);
 const [passwords,setPasswords]=useState({currentPassword:'',password:'',confirmation:''});
 const [photo,setPhoto]=useState<File|null>(null),photoInput=useRef<HTMLInputElement>(null);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState<{error:boolean;message:string}|null>(null);
 useEffect(()=>{const previous=document.activeElement;dialog.current?.showModal();return()=>{if(previous instanceof HTMLElement)previous.focus()}},[]);
 async function profile(event:FormEvent){
  event.preventDefault();if(busy)return;setBusy(true);setNotice(null);
  try{const {user}=await authService.updateProfile({username,avatar});save('name',user.username);save('avatar',user.avatar);setUsername(user.username);setNotice({error:false,message:labels.profileSaved})}
  catch(error){setNotice({error:true,message:error instanceof Error?error.message:labels.saveFailed})}
  finally{setBusy(false)}
 }
 async function password(event:FormEvent){
  event.preventDefault();if(busy)return;setBusy(true);setNotice(null);
  try{await authService.changePassword(passwords);setPasswords({currentPassword:'',password:'',confirmation:''});setNotice({error:false,message:labels.passwordChanged})}
  catch(error){setNotice({error:true,message:error instanceof Error?error.message:labels.saveFailed})}
  finally{setBusy(false)}
 }
 async function upload(event:FormEvent){
  event.preventDefault();if(!photo||busy)return;setBusy(true);setNotice(null);
  try{const {user}=await authService.uploadPhoto(photo);save('avatarUrl',user.avatarUrl);setPhoto(null);if(photoInput.current)photoInput.current.value='';setNotice({error:false,message:labels.photoSaved})}
  catch(error){setNotice({error:true,message:error instanceof Error?error.message:labels.uploadFailed})}
  finally{setBusy(false)}
 }
 async function removePhoto(){
  if(busy)return;setBusy(true);setNotice(null);
  try{await authService.removePhoto();save('avatarUrl',undefined);photoInput.current?.focus();setNotice({error:false,message:labels.photoRemoved})}
  catch(error){setNotice({error:true,message:error instanceof Error?error.message:labels.saveFailed})}
  finally{setBusy(false)}
 }
 return <dialog ref={dialog} onClose={()=>setModal(null)} aria-labelledby="modal-title">
  <button className="close" aria-label={c.close} onClick={()=>dialog.current?.close()}>×</button>
  <AnimalAvatar animal={state.avatar} avatarUrl={state.avatarUrl}/><h2 id="modal-title">{c.settings}</h2>
  {notice?.error&&<p role="alert">{notice.message}</p>}<div role="status">{notice&&!notice.error&&<p>{notice.message}</p>}</div>
  <form onSubmit={profile} aria-busy={busy}><fieldset><legend>{c.account}</legend>
   <label htmlFor="setting-name">{c.nickname}</label><input id="setting-name" autoComplete="username" minLength={3} maxLength={24} required value={username} onChange={event=>setUsername(event.target.value)}/>
   <AnimalPicker value={avatar} onChange={setAvatar} fr={fr}/>
   <button className="button primary" aria-disabled={busy||undefined}>{labels.saveProfile}</button>
  </fieldset></form>
  <form onSubmit={upload} aria-busy={busy}><fieldset><legend>{labels.profilePhoto}</legend>
   <label htmlFor="setting-photo">{labels.profilePhoto}</label><input ref={photoInput} id="setting-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>setPhoto(event.target.files?.[0]||null)}/>
   <p>{labels.photoHint}</p>
   <button className="button primary" disabled={!photo} aria-disabled={busy||undefined}>{labels.uploadPhoto}</button>
   {state.avatarUrl&&<button type="button" className="button" aria-disabled={busy||undefined} onClick={removePhoto}>{labels.removePhoto}</button>}
  </fieldset></form>
  <form onSubmit={password} aria-busy={busy}><fieldset><legend>{labels.changePassword}</legend>
   <label htmlFor="setting-current-password">{labels.currentPassword}</label><input id="setting-current-password" type="password" autoComplete="current-password" maxLength={128} required value={passwords.currentPassword} onChange={event=>setPasswords(old=>({...old,currentPassword:event.target.value}))}/>
   <label htmlFor="setting-password">{labels.newPassword}</label><input id="setting-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={passwords.password} onChange={event=>setPasswords(old=>({...old,password:event.target.value}))}/>
   <label htmlFor="setting-confirmation">{labels.confirmPassword}</label><input id="setting-confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={passwords.confirmation} onChange={event=>setPasswords(old=>({...old,confirmation:event.target.value}))}/>
   <button className="button primary" aria-disabled={busy||undefined}>{labels.changePassword}</button>
  </fieldset></form>
 </dialog>
}
