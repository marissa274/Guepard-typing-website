import {cookies,headers} from 'next/headers';
import type {Language} from './site-types';
/** Language and theme of the current request: cookies first, then Accept-Language. Server only. */
export async function preferences(){
 const jar=await cookies(),requestHeaders=await headers();
 const chosen=jar.get('guepard-lang')?.value;
 const lang:Language=chosen==='fr'||chosen==='en'?chosen:(requestHeaders.get('accept-language')||'fr').toLowerCase().startsWith('fr')?'fr':'en';
 return {lang,dark:jar.get('guepard-theme')?.value==='dark'};
}
