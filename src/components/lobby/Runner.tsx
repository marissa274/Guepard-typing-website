import type {CSSProperties} from 'react';
import {speciesLabels,type RunnerSpecies} from '../../lib/race-ranking';
export default function Runner({species,motion='waiting'}:{species:RunnerSpecies;motion?:'waiting'|'running'|'stopped'|'arrived'}){return <span className={'race-runner runner-'+species} data-motion={motion} style={{'--gait-row':(['cheetah','gazelle','hare','fox','panda','tortoise'].indexOf(species)*20)+'%'} as CSSProperties} role="img" aria-label={speciesLabels[species]}/>}
