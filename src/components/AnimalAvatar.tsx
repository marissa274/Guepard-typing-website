'use client';
import {useId,useRef,type Ref} from 'react';
import {animals,profileAnimals,animalFor,type AnimalId} from '../lib/animals';
import {accountCopy} from '../i18n/account';
/** Portrait: frame and colours are utilities; size, display and the sprite stay in kit.css because pages resize the avatar in context. */
const avatarFrame='flex-none rounded-[50%] border-2 bg-cream bg-no-repeat align-middle [box-shadow:0_2px_0_#967447,0_4px_8px_#3a2c1930] dark:bg-[#163451]';
export function AnimalAvatar({animal='cheetah',className='',avatarUrl}:{animal?:string;className?:string;avatarUrl?:string}){return <span className={`animal-avatar ${avatarFrame} ${className.includes('race-lane-avatar')?'':'border-cream'} ${avatarUrl?'':'avatar-'+animalFor(animal).id} ${className}`} aria-hidden="true">{avatarUrl&&<img className="w-full h-full object-cover rounded-[50%]" src={avatarUrl} alt="" width={64} height={64}/>}</span>}
/** Choice of an animal. No native `required`: the radios are visually hidden, so the browser would block the submission without any visible message. The form shows its own `message` here and focuses the group through `fieldRef`. */
/* Layout and type of the picker. Its colours, the option cards, the scroll strip and the landscape veil stay in src/styles (kit.css, account.css, lobby.css). */
const pick={
 legend:'text-[14px] font-extrabold mb-12',
 top:'animal-picker-top flex items-center justify-between gap-12 mb-10',
 note:'text-[13px] leading-[1.3] text-muted upto-620:text-[12px]',
 noteLandscape:' dark:text-field-ink',
 arrows:'animal-picker-arrows flex gap-7 shrink-0',
 optionsLandscape:' auto-cols-[248px] upto-620:auto-cols-[min(72vw,240px)]',
 labelLandscape:' min-h-230',
 name:'text-[14px]',
 avatar:'upto-450:size-43',
 avatarLandscape:'upto-450:size-43 size-52',
};
const pickerMessage='animal-picker-message mt-12 mx-0 mb-0 py-8 px-13 border border-[#cc9e73] bg-[#fff0dc] text-[#953e29] text-[13px] leading-[1.6] rounded-[10px]';
export function AnimalPicker({value,onChange,landscape=false,fr=true,className='',message,fieldRef}:{value:string;onChange:(id:AnimalId)=>void;landscape?:boolean;fr?:boolean;className?:string;message?:string;fieldRef?:Ref<HTMLFieldSetElement>}){const track=useRef<HTMLDivElement>(null),messageId=useId(),labels=accountCopy[fr?'fr':'en'];const scroll=(direction:number)=>track.current?.scrollBy({left:direction*(landscape?250:130),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return <fieldset ref={fieldRef} className={`animal-picker ${landscape?'animal-picker-landscape':''} ${className}`}><legend className={pick.legend}>{landscape?labels.chooseLandscape:labels.yourAnimal}</legend><div className={pick.top}><small className={pick.note+(landscape?pick.noteLandscape:'')}>{labels.scrollAnimals}</small><div className={pick.arrows}><button type="button" onClick={()=>scroll(-1)} aria-label={labels.previousAnimals}>←</button><button type="button" onClick={()=>scroll(1)} aria-label={labels.nextAnimals}>→</button></div></div><div className={'animal-options'+(landscape?pick.optionsLandscape:'')} ref={track} role="group" aria-label={labels.animalChoices} aria-describedby={message?messageId:undefined}>{(landscape?animals:profileAnimals).map(a=><label key={a.id} className={(value===a.id?'selected':'')+(landscape?pick.labelLandscape:'')}>{landscape&&<img className="animal-option-landscape" src={`/assets/race-${a.landscape}.webp`} alt="" loading="lazy" decoding="async"/>}<input type="radio" name={landscape?'race-animal':'profile-animal'} value={a.id} checked={value===a.id} onChange={()=>onChange(a.id)}/><AnimalAvatar animal={a.id} className={landscape?pick.avatarLandscape:pick.avatar}/><span><strong className={pick.name}>{fr?a.fr:a.en}</strong>{landscape&&<small>{fr?a.themeFr:a.themeEn}</small>}</span></label>)}</div>{message&&<p id={messageId} className={pickerMessage} role="alert">{message}</p>}</fieldset>}
