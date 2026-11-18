'use client';
import type {CSSProperties} from 'react';
import type {RunnerSpecies} from '../../lib/race-ranking';
import {gameCopy} from '../../i18n/game';
import {useSite} from '../SiteContext';
/** `decorative` hides the sprite from assistive technology where the species is already written next to it. */
export default function Runner({species,motion='waiting',decorative=false}:{species:RunnerSpecies;motion?:'waiting'|'running'|'stopped'|'arrived';decorative?:boolean}){const {fr}=useSite();return <span className={'race-runner runner-'+species} data-motion={motion} style={{'--gait-row':(['cheetah','gazelle','hare','fox','panda','tortoise'].indexOf(species)*20)+'%'} as CSSProperties} {...decorative?{'aria-hidden':true}:{role:'img','aria-label':gameCopy[fr?'fr':'en'].species[species]}}/>}
