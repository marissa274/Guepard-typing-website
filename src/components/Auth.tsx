'use client';
import {useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useSite} from './SiteContext';
import {AnimalPicker} from './AnimalAvatar';
import {authService,validateCredentials} from '../services/auth';
import {authCopy,authMessage} from '../i18n/account';
type AuthErrors=Partial<Record<'username'|'password'|'confirmation',string>>;
type Notice={kind:'error';message:string}|{kind:'provider-unavailable';provider:string};
/* Utilities (TECH-03, lot A). Legacy class names stay as hooks (tests). Kept in src/styles/account.css: the sprites, masks and clip
   of the decorative animals, the card texture and the scenery veil (url(), gradients). */
const friend='auth-friend absolute w-200 h-200 pointer-events-none upto-850:w-165 upto-850:h-165 compact:w-104 compact:h-104';
const friendPlace:Record<string,string>={
 monkey:'auth-monkey -left-164 top-[21%] upto-850:-left-135 compact:-left-85 compact:top-[24%]',
 crocodile:'auth-crocodile -left-164 bottom-[12%] upto-850:-left-135 compact:-left-85',
 parrot:'auth-parrot -right-108 top-[22%] [clip-path:inset(0_0_5%_0)] upto-850:-right-89 compact:-right-56 compact:top-[24%]',
 elephant:'auth-elephant -right-174 bottom-[11%] [transform:scaleX(-1)] upto-850:-right-143 compact:-right-90',
};
const cheetah='auth-top-cheetah absolute w-245 h-245 -top-170 left-1/2 [transform:translateX(-50%)] pointer-events-none compact:w-195 compact:h-195 compact:-top-133';
const tab='flex-1 text-center rounded-[23px] p-10 text-[14px] font-bold compact:text-[13px]';
const ui={
 page:'auth-page relative isolate min-h-[calc(100svh_-_132px)] pt-155 pb-175 px-24 overflow-hidden bg-paper compact:pt-138 compact:pb-130 compact:px-32 tiny:px-27',
 scenery:'auth-scenery absolute inset-0 -z-2 pointer-events-none',
 sceneryImage:'w-full h-full object-cover opacity-32 dark:opacity-60',
 back:'auth-back absolute top-42 left-[5%] text-[14px] font-semibold text-leaf py-10 px-14 bg-paper border border-line rounded-[24px] compact:top-31 compact:text-[12px]',
 stage:'auth-stage relative max-w-490 mx-auto upto-850:max-w-450',
 cheetah:cheetah+' z-0 [filter:drop-shadow(0_5px_3px_#17362320)]',
 cheetahPaws:cheetah+' auth-cheetah-paws z-2 [clip-path:polygon(22%_68%,85%_68%,85%_99%,22%_99%)]',
 card:'auth-card relative z-1 bg-card border-2 border-[#8c9d62] rounded-[29px_33px_26px_31px] pt-65 pb-27 px-42 [box-shadow:0_9px_0_#66794335,0_24px_60px_#1b392324] dark:border-[#769660] compact:pt-58 compact:pb-24 compact:px-25 compact:rounded-[25px] tiny:px-20 [&_.animal-picker]:max-w-full [&_.animal-options]:[grid-auto-columns:104px] [&_.animal-picker_legend]:text-[15px]',
 tabs:'auth-tabs flex w-full p-5 rounded-[30px] bg-[#e3e7cc] border border-[#c8ceac] gap-5 mb-27 dark:bg-[#1a3024] dark:border-[#52664b] compact:mb-23',
 tabIdle:tab+' text-[#365331] dark:text-[#d5e4bf]',
 tabSelected:tab+' selected bg-jungle text-[#fff8e8] [box-shadow:0_2px_3px_#1a3d2520] dark:bg-[#b5d595] dark:text-[#203b27]',
 heading:'auth-heading text-center mb-26',
 title:'text-[34px] leading-[1.12] tracking-[-1.2px] text-balance compact:text-[29px] tiny:text-[26px]',
 intro:'text-[13px] text-muted leading-[1.7] mt-10 compact:text-[12px]',
 provider:'auth-provider flex items-center justify-center gap-13 min-h-49 rounded-[12px] text-[14px] font-bold border-[1.5px] compact:text-[13px] compact:gap-9 tiny:text-[12px]',
 discord:'discord bg-[#e2ecde] text-[#2e5737] border-[#b1c4a5] dark:bg-[#304c36] dark:text-[#eff5e4] dark:border-[#536d49]',
 github:'github bg-[#384837] text-[#fff8e8] border-[#273527]',
 icon:'w-21 h-21 shrink-0',
 divider:"auth-divider flex items-center gap-15 my-22 text-[12px] text-muted before:content-[''] before:flex-1 before:[border-top:1px_dashed_var(--line)] after:content-[''] after:flex-1 after:[border-top:1px_dashed_var(--line)]",
 form:'auth-form grid gap-20 [&_input]:text-[14px]',
 label:'mb-8 text-ink',
 input:'min-h-50 aria-invalid:border-[#b54d31]',
 password:'auth-password relative',
 reveal:'absolute right-3 top-3 bottom-3 w-43 grid place-items-center text-muted rounded-[7px]',
 eye:'w-21 h-21',
 error:'auth-error text-[12px] text-[#a83625] mt-7 leading-[1.5] dark:text-[#ffae96]',
 hint:'auth-hint text-[12px] mt-6 text-muted',
 submit:'auth-submit w-full justify-between py-14 px-20',
 notice:'auth-notice bg-paper p-15 border border-line rounded-[12px] text-[12px] leading-[1.7] mt-22',
 guest:'auth-guest flex justify-center gap-13 text-[14px] text-leaf font-bold p-14 mt-18 compact:text-[13px]',
 privacy:'auth-privacy py-10 px-0 min-h-24 text-[13px] text-muted block text-center underline underline-offset-3 mt-4',
};
function ProviderIcon({type}:{type:string}){return type==='discord'?<svg className={ui.icon} viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.7 5.4a18 18 0 0 0-4.4-1.3l-.6 1.2a16 16 0 0 0-5.4 0l-.6-1.2a18 18 0 0 0-4.4 1.3C1.5 9.4.7 13.3 1.1 17a18 18 0 0 0 5.4 2.7l1.1-1.8-1.7-.8.4-.3a12.7 12.7 0 0 0 11.4 0l.4.3-1.7.8 1.1 1.8a18 18 0 0 0 5.4-2.7c.5-4.3-.8-8.2-3.2-11.6ZM8.4 14.8c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></svg>:<svg className={ui.icon} viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .8a11.2 11.2 0 0 0-3.5 21.8c.6.1.8-.2.8-.5v-2.1c-3.4.7-4.1-1.4-4.1-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.9 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.4-5.5-6.1 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11 11 0 0 1 6 0C17.5 4.1 18.5 4.4 18.5 4.4c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.8-5.5 6.1.5.4.8 1.1.8 2.2v3.1c0 .3.2.6.8.5A11.2 11.2 0 0 0 12 .8Z"/></svg>}
function Eye({open}:{open:boolean}){return <svg className={ui.eye} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{!open&&<path d="m3 3 18 18"/>}</svg>}
export default function Auth({mode='login'}){
 const {state,setAccount,fr}=useSite(),router=useRouter(),l=authCopy[fr?'fr':'en'],signup=mode==='signup';
 const [animal,setAnimal]=useState('cheetah');
 const [form,setForm]=useState({username:'',password:'',confirmation:''}),[errors,setErrors]=useState<AuthErrors>({}),[visible,setVisible]=useState(false),[confirmVisible,setConfirmVisible]=useState(false),[notice,setNotice]=useState<Notice|null>(null),[busy,setBusy]=useState(false);
 function change(key:'username'|'password'|'confirmation',value:string){setForm(f=>({...f,[key]:value}));setErrors(e=>({...e,[key]:undefined}));setNotice(null)}
 async function submit(e:FormEvent){e.preventDefault();const next=validateCredentials(form,mode);setErrors(next);if(Object.keys(next).length){document.getElementById('auth-'+Object.keys(next)[0])?.focus();return}setBusy(true);setNotice(null);try{const {user}=await authService.submit({...form,avatar:animal},mode);setForm(f=>({...f,password:'',confirmation:''}));setAccount(user);router.push('/races')}catch(error){setNotice({kind:'error',message:error instanceof Error?error.message:l.loginFailed})}finally{setBusy(false)}}
 async function provider(name:'github'|'discord'){setBusy(true);setNotice(null);try{const result=await authService.provider(name);if(result.kind==='redirect'){window.location.assign(result.url);return}setNotice(result)}catch(error){setNotice({kind:'error',message:error instanceof Error?error.message:l.loginFailed})}finally{setBusy(false)}}
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('oauth')==='error')setNotice({kind:'error',message:l.providerFailed})},[fr]);
 return <main id="main" tabIndex={-1} className={ui.page}><div className={ui.scenery} aria-hidden="true"><img className={ui.sceneryImage} src={state.dark?'/assets/jungle-blue-night.webp':'/assets/relief-background.webp'} alt=""/></div><Link className={ui.back} href="/">← {l.back}</Link><div className={ui.stage}><div className={ui.cheetah} aria-hidden="true"/><div className={`${friend} ${friendPlace.monkey} z-0`} aria-hidden="true"/><div className={`${friend} ${friendPlace.crocodile} z-0`} aria-hidden="true"/><div className={`${friend} ${friendPlace.parrot} z-0`} aria-hidden="true"/><div className={`${friend} ${friendPlace.elephant} z-0`} aria-hidden="true"/>{['monkey','crocodile','parrot','elephant'].map(animal=><div key={animal} className={`${friend} ${friendPlace[animal]} auth-paws z-2`} aria-hidden="true"/>)}<div className={ui.cheetahPaws} aria-hidden="true"/>
 <section className={ui.card} aria-labelledby="auth-title"><nav className={ui.tabs} aria-label={l.accountAccess}><Link href="/login" className={!signup?ui.tabSelected:ui.tabIdle} aria-current={!signup?'page':undefined}>{l.login}</Link><Link href="/signup" className={signup?ui.tabSelected:ui.tabIdle} aria-current={signup?'page':undefined}>{l.signup}</Link></nav><div className={ui.heading}><h1 className={ui.title} id="auth-title">{signup?l.join:l.welcome}</h1><p className={ui.intro}>{signup?l.signupIntro:l.intro}</p></div>
 <div className="auth-providers grid gap-12"><button type="button" className={`${ui.provider} ${ui.discord}`} onClick={()=>provider('discord')} disabled={busy}><ProviderIcon type="discord"/>{l.discord}</button><button type="button" className={`${ui.provider} ${ui.github}`} onClick={()=>provider('github')} disabled={busy}><ProviderIcon type="github"/>{l.github}</button></div><div className={ui.divider}><span>{l.or}</span></div>
 <form onSubmit={submit} noValidate className={ui.form}><div><label className={ui.label} htmlFor="auth-username">{l.username}</label><input className={ui.input} id="auth-username" autoComplete="username" maxLength={24} value={form.username} onChange={e=>change('username',e.target.value)} placeholder="GuépardCurieux" aria-required="true" aria-invalid={!!errors.username} aria-describedby={errors.username?'username-error':signup?'username-hint':undefined}/>{errors.username?<p id="username-error" className={ui.error}>{authMessage(l,errors.username)}</p>:signup&&<p id="username-hint" className={ui.hint}>{l.usernameHint}</p>}</div>
 <div><label className={ui.label} htmlFor="auth-password">{l.password}</label><div className={ui.password}><input className={`${ui.input} pr-49`} id="auth-password" type={visible?'text':'password'} autoComplete={signup?'new-password':'current-password'} value={form.password} onChange={e=>change('password',e.target.value)} aria-required="true" aria-invalid={!!errors.password} aria-describedby={errors.password?'password-error':signup?'password-hint':undefined}/><button className={ui.reveal} type="button" aria-label={l.show} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}><Eye open={visible}/></button></div>{errors.password?<p id="password-error" className={ui.error}>{authMessage(l,errors.password)}</p>:signup&&<p id="password-hint" className={ui.hint}>{l.passwordHint}</p>}</div>
 {signup&&<div><label className={ui.label} htmlFor="auth-confirmation">{l.confirm}</label><div className={ui.password}><input className={`${ui.input} pr-49`} id="auth-confirmation" type={confirmVisible?'text':'password'} autoComplete="new-password" value={form.confirmation} onChange={e=>change('confirmation',e.target.value)} aria-required="true" aria-invalid={!!errors.confirmation} aria-describedby={errors.confirmation?'confirmation-error':undefined}/><button className={ui.reveal} type="button" aria-label={l.showConfirm} aria-pressed={confirmVisible} onClick={()=>setConfirmVisible(v=>!v)}><Eye open={confirmVisible}/></button></div>{errors.confirmation&&<p id="confirmation-error" className={ui.error}>{authMessage(l,errors.confirmation)}</p>}</div>}
 {signup&&<AnimalPicker value={animal} onChange={setAnimal} fr={fr}/>}<button className={`button primary ${ui.submit}`} disabled={busy}>{busy?l.loading:signup?l.create:l.submit}<span aria-hidden="true">→</span></button></form>
 {notice&&<div className={ui.notice} role={notice.kind==='error'?'alert':'status'}><p>{notice.kind==='error'?notice.message:l.provider.replace('{provider}',notice.provider==='discord'?'Discord':'GitHub')}</p></div>}
 <Link className={ui.guest} href="/races">{l.guest} <span aria-hidden="true">→</span></Link><Link className={ui.privacy} href="/privacy">{l.privacy}</Link></section></div></main>
}
