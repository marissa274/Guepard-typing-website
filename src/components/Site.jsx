'use client';
import {useEffect} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {useSite} from './SiteContext';
import {Header,Footer,Modal} from './Chrome';
import Jungle from './Jungle';
import {Races,PrivateRace} from './Races';
import RaceGame from './RaceGame';
import {How,Stats,Info,Missing} from './Pages';
export default function Site(){const path=usePathname()||'/',router=useRouter(),{modal}=useSite();useEffect(()=>{if(window.location.hash.startsWith('#/')&&!window.location.hash.startsWith('#//'))router.replace(window.location.hash.slice(1))},[router]);let page;
 if(path==='/')page=<Jungle/>;else if(path==='/races')page=<Races/>;else if(path==='/private')page=<PrivateRace/>;else if(path.startsWith('/race/'))page=<RaceGame key={path} id={decodeURIComponent(path.slice(6))}/>;else if(path==='/how')page=<How/>;else if(path==='/stats')page=<Stats/>;else if(['/about','/contact','/legal','/privacy'].includes(path))page=<Info page={path.slice(1)}/>;else page=<Missing/>;
 return <div id="app"><Header/>{page}<Footer/>{modal&&<Modal key={modal}/>}</div>
}
