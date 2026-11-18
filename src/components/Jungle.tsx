'use client';
import {useRef} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {useSite} from './SiteContext';
import {useParallax} from '../hooks/useParallax';
import SignBoard from './SignBoard';
import JoinByCode from './JoinByCode';
import {roomCopy} from '../lib/room-copy';
function Animal({name}:{name:string}){const {state}=useSite();return <div className={`scene-animal scene-${name}`} data-sleeping={state.dark} aria-hidden="true">{name==='giraffe'?<Image width={1024} height={1536} sizes="(max-width: 700px) 30vw, 17vw" className="giraffe-full" src={state.dark?'/assets/giraffe-night.webp':'/assets/giraffe-full.webp'} alt=""/>:<div className={`animal-cutout animal-${name}`}/>}</div>}
export default function Jungle(){const {fr}=useSite(),copy=roomCopy(fr),ref=useRef<HTMLElement|null>(null);useParallax(ref);return <main className="home-main"><section ref={ref} className="jungle-scene" aria-label={copy.scene}>
 <div className="scene-background" aria-hidden="true"><Image className="scene-sky-light" fill sizes="100vw" src="/assets/relief-background.webp" alt="" fetchPriority="high"/><Image className="scene-sky-dark" fill sizes="100vw" src="/assets/jungle-blue-night.webp" alt="" fetchPriority="high"/></div>
 <div className="scene-depth depth-far" aria-hidden="true"><Animal name="giraffe"/><Animal name="elephant"/><Animal name="toucan"/></div>
 <div className="scene-depth depth-middle" aria-hidden="true"><Animal name="crocodile"/></div>
 <div className="jungle-clearing"><div className="jungle-menu hanging-boards"><div className="board-ropes" aria-hidden="true"/><div className="board-planks flex flex-col"><Link className="board-action" href="/play"><SignBoard/>{copy.quick}<span aria-hidden="true">➜</span></Link><Link className="board-action" href="/create"><SignBoard/>{copy.create}<span aria-hidden="true">＋</span></Link><Link className="board-action" href="/races"><SignBoard/>{copy.browse}<span aria-hidden="true">↗</span></Link></div></div><JoinByCode home/></div>
 <div className="scene-depth depth-near" aria-hidden="true"><div className="scene-leaves leaves-left"><div className="leaves-cutout"/></div><div className="scene-leaves leaves-right"><div className="leaves-cutout"/></div><Animal name="parrot"/></div>
 <Animal name="monkey"/><div className="jungle-mascot sleeping-cheetah" role="img" aria-label={copy.sleeping}/>
 </section></main>}
