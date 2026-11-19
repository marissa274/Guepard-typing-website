import type {Person} from './room-types';
export type RunnerSpecies='cheetah'|'gazelle'|'hare'|'fox'|'panda'|'tortoise';
export function compareRacers(a:Person,b:Person){
 if(a.abandoned!==b.abandoned)return a.abandoned?1:-1;
 if(!!a.finishedAt!==!!b.finishedAt)return a.finishedAt?-1:1;
 if(a.finishedAt&&b.finishedAt)return a.finishedAt-b.finishedAt;
 return b.progress*Math.max(1,a.targetText?.length||1)-a.progress*Math.max(1,b.targetText?.length||1);
}
export function rankRacers(people:Person[]){const sorted=people.filter(p=>p.role==='player').slice().sort(compareRacers);return sorted.map(person=>({person,rank:sorted.findIndex(p=>compareRacers(p,person)===0)+1,tied:sorted.some(p=>p.id!==person.id&&compareRacers(p,person)===0)}))}
export function speciesForRank(rank:number,total:number):RunnerSpecies{
 if(rank===1)return 'cheetah';if(total===2&&rank===2)return 'tortoise';if(total===3&&rank===3)return 'hare';if(rank===total)return 'tortoise';if(rank===2)return 'gazelle';if(rank===3)return 'hare';
 return (rank-4)/Math.max(1,total-4)<.5?'fox':'panda';
}
export type Appearance={species:RunnerSpecies;candidate?:RunnerSpecies;since?:number};
export function evolveAppearances(people:Person[],previous:Record<string,Appearance>,now:number,final=false){const ranks=rankRacers(people),allAtStart=ranks.every(r=>r.person.progress===0&&!r.person.finishedAt);const result:Record<string,Appearance>={};for(const r of ranks){const old=previous[r.person.id]||{species:'cheetah' as RunnerSpecies};if(allAtStart){result[r.person.id]={species:'cheetah'};continue}if(r.tied&&!final){result[r.person.id]={species:old.species};continue}const target=speciesForRank(r.rank,ranks.length);if(final||target===old.species)result[r.person.id]={species:target};else if(old.candidate===target&&now-(old.since??now)>=900)result[r.person.id]={species:target};else result[r.person.id]={species:old.species,candidate:target,since:old.candidate===target?old.since:now}}return result}
// Eight clearly distinct hues, each at least 3:1 against the cream track and chart backgrounds.
const racerPalette=['#2F6B3D','#C75B25','#287899','#935A92','#9A7417','#B03A5B','#4B4FA0','#6B4A2B'] as const;
/** Colour of a racer. Pass the race's player order so that lanes, chart lines and legend never share a colour within one race (up to eight racers). */
export function racerColour(id:string,order:readonly string[]=[]){const index=order.indexOf(id);if(index>=0)return racerPalette[index%racerPalette.length];let n=0;for(const c of id)n=(n*31+c.charCodeAt(0))>>>0;return racerPalette[n%racerPalette.length]}
