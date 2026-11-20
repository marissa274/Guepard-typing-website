import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import Site from '../../src/components/Site';
import {isKnownPath} from '../../src/lib/known-paths';
import {copy} from '../../src/i18n';
import {pageTitle} from '../../src/lib/page-title';
import {preferences} from '../../src/lib/preferences';

/** The document title is right in the first HTML (WCAG 2.4.2), in the language of the request. */
export async function generateMetadata({params}:{params:Promise<{path?:string[]}>}):Promise<Metadata>{
 const {path}=await params,{lang}=await preferences();
 return {title:pageTitle('/'+(path||[]).join('/'),copy[lang])};
}
export default async function Page({params}:{params:Promise<{path?:string[]}>}){
 const {path}=await params;
 if(!isKnownPath(path))notFound();
 return <Site/>;
}
