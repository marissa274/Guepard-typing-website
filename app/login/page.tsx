import type {Metadata} from 'next';
import Site from '../../src/components/Site';
import {copy} from '../../src/i18n';
import {pageTitle} from '../../src/lib/page-title';
import {preferences} from '../../src/lib/preferences';

/** Same title as the client sets, in the language of the request (WCAG 2.4.2). */
export async function generateMetadata():Promise<Metadata>{
 const {lang}=await preferences();
 return {title:pageTitle('/login',copy[lang])};
}
export default function Page(){return <Site/>}
