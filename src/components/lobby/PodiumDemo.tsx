'use client';
import RaceResults from './RaceResults';
import {defaultSettings,type RoomView} from '../../lib/room-types';
import {gameCopy} from '../../i18n/game';
import {roomLabel} from '../../lib/room-copy';
import {formatNumber} from '../../i18n/format';
import {useSite} from '../SiteContext';
const people=['Marissa','Mathis','Léa','Noah'].map((name,i)=>({id:'demo-'+i,name,animal:'cheetah' as const,kind:'demo' as const,role:'player' as const,late:false,seen:61000,progress:350,typed:350+i*5,errors:i*5,finishedAt:51000+i*3000,abandoned:false}));
const room:RoomView={id:'podium-demo',name:'La clairière des rapides',animal:'cheetah',code:'DEMO',hostId:'demo-0',people,settings:defaultSettings,phase:'finished',createdAt:1000,revision:1,startedAt:1000,endedAt:61000,text:'',me:'demo-0',isHost:true,players:4,serverNow:61000};
/** Isolated visual fixture: never creates a room or writes a participant/result. */
export default function PodiumDemo(){const {fr}=useSite(),lang=fr?'fr':'en';return <main id="main" tabIndex={-1} className="woodland-page lobby-page lobby-active lobby-results podium-demo"><div className="woodland-scenery" aria-hidden="true"/><p className="podium-demo-label">{roomLabel(gameCopy[lang].podiumDemo,{count:formatNumber(lang,people.length)})}</p><div className="woodland-shell"><RaceResults room={room} basePath="/demo/podium"/></div></main>}
