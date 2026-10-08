'use client';
import {useEffect} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {useSite} from './SiteContext';
import {Header,Footer,Modal} from './Chrome';
import Jungle from './Jungle';
import Auth from './Auth';
import {Races} from './Races';
import CreateRoom from './lobby/CreateRoom';
import Lobby from './lobby/Lobby';
import PodiumDemo from './lobby/PodiumDemo';
import QuickJoin from './lobby/QuickJoin';
import RaceGame from './RaceGame';
import {How,Stats,Info,Missing} from './Pages';
export default function Site(){const path=usePathname()||'/',router=useRouter(),{modal}=useSite();useEffect(()=>{if(window.location.hash.startsWith('#/')&&!window.location.hash.startsWith('#//'))router.replace(window.location.hash.slice(1))},[router]);let page;
 if(path==='/demo/podium')page=<PodiumDemo/>;else if(path==='/')page=<Jungle/>;else if(path==='/play')page=<QuickJoin/>;else if(path==='/login'||path==='/signup')page=<Auth key={path} mode={path.slice(1)}/>;else if(path==='/races')page=<Races/>;else if(path==='/create'||path==='/private')page=<CreateRoom/>;else if(path.startsWith('/lobby/'))page=<Lobby key={path} id={decodeURIComponent(path.slice(7))}/>;else if(path.startsWith('/race/'))page=<RaceGame key={path} id={decodeURIComponent(path.slice(6))}/>;else if(path==='/how')page=<How/>;else if(path==='/stats')page=<Stats/>;else if(['/about','/contact','/legal','/privacy'].includes(path))page=<Info page={path.slice(1)}/>;else page=<Missing/>;
 return <div id="app"><Header/>{page}<Footer/>{modal&&<Modal key={modal}/>}</div>
}
