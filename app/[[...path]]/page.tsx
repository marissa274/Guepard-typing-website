import {notFound} from 'next/navigation';
import Site from '../../src/components/Site';
import {isKnownPath} from '../../src/lib/known-paths';

export default async function Page({params}:{params:Promise<{path?:string[]}>}){
 const {path}=await params;
 if(!isKnownPath(path))notFound();
 return <Site/>;
}
