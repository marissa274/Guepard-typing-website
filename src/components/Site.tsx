'use client';
import {useEffect} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {useSite} from './SiteContext';
import {pageTitle} from '../lib/page-title';
import {Header,Footer} from './Chrome';
import Jungle from './Jungle';
import dynamic from 'next/dynamic';
// The home scene ships with the first bundle; other views load their own chunk.
const Auth=dynamic(()=>import('./Auth'));
const Races=dynamic(()=>import('./Races').then(module=>module.Races));
const CreateRoom=dynamic(()=>import('./lobby/CreateRoom'));
const Lobby=dynamic(()=>import('./lobby/Lobby'));
const PodiumDemo=dynamic(()=>import('./lobby/PodiumDemo'));
const QuickJoin=dynamic(()=>import('./lobby/QuickJoin'));
const RaceGame=dynamic(()=>import('./RaceGame'));
const HistoricalResults=dynamic(()=>import('./lobby/HistoricalResults'));
const How=dynamic(()=>import('./Pages').then(module=>module.How));
const Stats=dynamic(()=>import('./Pages').then(module=>module.Stats));
const Info=dynamic(()=>import('./Pages').then(module=>module.Info));
const Missing=dynamic(()=>import('./Pages').then(module=>module.Missing));
const Modal=dynamic(()=>import('./AccountSettings'));
const infoPages=['/about','/contact','/legal','/privacy'];
export {pageTitle};
export default function Site(){const path=usePathname()||'/',router=useRouter(),{modal,c}=useSite();useEffect(()=>{if(window.location.hash.startsWith('#/')&&!window.location.hash.startsWith('#//'))router.replace(window.location.hash.slice(1))},[router]);/* The first HTML already carries the title (generateMetadata); this keeps it in step when the language changes without a navigation. */useEffect(()=>{document.title=pageTitle(path,c)},[path,c]);let page;
 if(path==='/demo/podium')page=<PodiumDemo/>;else if(path==='/')page=<Jungle/>;else if(path==='/play')page=<QuickJoin/>;else if(path==='/login'||path==='/signup')page=<Auth key={path} mode={path.slice(1)}/>;else if(path==='/races')page=<Races/>;else if(path==='/create'||path==='/private')page=<CreateRoom/>;else if(path.startsWith('/lobby/'))page=<Lobby key={path} id={decodeURIComponent(path.slice(7))}/>;else if(path.startsWith('/history/'))page=<HistoricalResults key={path} id={decodeURIComponent(path.slice(9))}/>;else if(path.startsWith('/race/'))page=<RaceGame key={path} id={decodeURIComponent(path.slice(6))}/>;else if(path==='/how')page=<How/>;else if(path==='/stats')page=<Stats/>;else if(infoPages.includes(path))page=<Info page={path.slice(1) as 'about'|'contact'|'legal'|'privacy'}/>;else page=<Missing/>;
 return <div id="app" className="overflow-x-clip"><Header/>{page}<Footer/>{modal&&<Modal key={modal}/>}</div>
}
