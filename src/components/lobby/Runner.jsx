import { speciesLabels } from '../../lib/race-ranking';
export default function Runner({ species, motion = 'waiting' }) { return <span className={'race-runner runner-' + species} data-motion={motion} style={{ '--gait-row': (['cheetah', 'gazelle', 'hare', 'fox', 'panda', 'tortoise'].indexOf(species) * 20) + '%' }} role="img" aria-label={speciesLabels[species]}/>; }
