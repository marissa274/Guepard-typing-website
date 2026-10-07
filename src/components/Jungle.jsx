'use client';
import {useRef} from 'react';
import Link from 'next/link';
import {useSite} from './SiteContext';
import {useParallax} from '../hooks/useParallax';
import SignBoard from './SignBoard';
function Animal({name}){const {state}=useSite();return <div className={`scene-animal scene-${name}`} data-sleeping={state.dark} aria-hidden="true">{name==='giraffe'?<img className="giraffe-full" src={state.dark?'/assets/giraffe-night.png':'/assets/giraffe-full.png'} alt=""/>:<div className={`animal-cutout animal-${name}`}/>}</div>}
export default function Jungle(){const {c,fr,state}=useSite(),ref=useRef(null);useParallax(ref);return <main className="home-main"><section ref={ref} className="jungle-scene" aria-label={fr?'Jungle immersive':'Immersive jungle'}>
 <div className="scene-background" aria-hidden="true"><img src={state.dark?'/assets/jungle-blue-night.png':'/assets/relief-background.png'} alt="" fetchPriority="high"/></div>
 <div className="scene-depth depth-far" aria-hidden="true"><Animal name="giraffe"/><Animal name="elephant"/><Animal name="toucan"/></div>
 <div className="scene-depth depth-middle" aria-hidden="true"><Animal name="crocodile"/></div>
 <div className="jungle-clearing"><div className="jungle-menu hanging-boards"><div className="board-ropes" aria-hidden="true"/><div className="board-planks flex flex-col"><Link className="board-action" href="/play"><SignBoard/>{fr?'Rejoindre rapidement':'Play now'}<span aria-hidden="true">➜</span></Link><Link className="board-action" href="/private"><SignBoard/>{fr?'Créer une course privée':'Create a private race'}<span aria-hidden="true">＋</span></Link><Link className="board-action" href="/races"><SignBoard/>{fr?'Parcourir les courses publiques':'Browse public races'}<span aria-hidden="true">↗</span></Link></div></div></div>
 <div className="scene-depth depth-near" aria-hidden="true"><div className="scene-leaves leaves-left"><div className="leaves-cutout"/></div><div className="scene-leaves leaves-right"><div className="leaves-cutout"/></div><Animal name="parrot"/></div>
 <Animal name="monkey"/><div className="jungle-mascot sleeping-cheetah" role="img" aria-label={fr?'Guépard endormi':'Sleeping cheetah'}/>
 </section></main>}
