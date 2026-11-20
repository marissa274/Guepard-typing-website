import type {Language} from '../lib/site-types';

/** Every displayed number, percentage, duration or date goes through Intl in the active language. */
const numberFormats=new Map<string,Intl.NumberFormat>(),dateFormats=new Map<string,Intl.DateTimeFormat>();
function numberFormat(lang:Language,options:Intl.NumberFormatOptions={}){
 const key=lang+JSON.stringify(options);let format=numberFormats.get(key);
 if(!format){format=new Intl.NumberFormat(locales[lang],options);numberFormats.set(key,format)}
 return format;
}
function dateFormat(lang:Language,options:Intl.DateTimeFormatOptions){
 const key=lang+JSON.stringify(options);let format=dateFormats.get(key);
 if(!format){format=new Intl.DateTimeFormat(locales[lang],options);dateFormats.set(key,format)}
 return format;
}
const locales:Record<Language,string>={fr:'fr-FR',en:'en-US'};
export const languageOf=(fr:boolean):Language=>fr?'fr':'en';
/** Plain number (counts, WPM, ranks). One decimal at most by default. */
export function formatNumber(lang:Language,value:number,options:Intl.NumberFormatOptions={maximumFractionDigits:1}){return numberFormat(lang,options).format(value)}
/** Fixed-width integer such as « 01 » used for card indexes. */
export function formatPadded(lang:Language,value:number,digits=2){return numberFormat(lang,{minimumIntegerDigits:digits,useGrouping:false}).format(value)}
/** Percentage expressed on a 0–100 scale (accuracy, progress, error rate). */
export function formatPercent(lang:Language,value:number,maximumFractionDigits=0){return numberFormat(lang,{style:'percent',maximumFractionDigits}).format(value/100)}
/** Optional percentage: null is shown as an em dash. */
export function formatOptionalPercent(lang:Language,value:number|null|undefined){return value===null||value===undefined?'—':formatPercent(lang,value)}
/** Duration in seconds (« 12,5 s » / « 12.5 sec »). */
export function formatSeconds(lang:Language,seconds:number,maximumFractionDigits=1){return numberFormat(lang,{style:'unit',unit:'second',unitDisplay:'short',maximumFractionDigits}).format(seconds)}
/** Full date and time, equivalent to the browser default but explicit and cached. */
export function formatDateTime(lang:Language,date:number|Date){return dateFormat(lang,{year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'}).format(date)}
/** Calendar date only. */
export function formatDate(lang:Language,date:number|Date){return dateFormat(lang,{year:'numeric',month:'numeric',day:'numeric'}).format(date)}
