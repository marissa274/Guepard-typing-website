import type {Difficulty} from '../lib/room-types';

export const botProfiles={
 noob:{wpm:18,errorRate:.12},
 beginner:{wpm:32,errorRate:.08},
 medium:{wpm:56,errorRate:.05},
 expert:{wpm:100,errorRate:.02},
 impossible:{wpm:175,errorRate:.005},
} satisfies Record<Difficulty,{wpm:number;errorRate:number}>;

function seededRandom(seed:string){
 let state=2166136261;
 for(let i=0;i<seed.length;i++)state=Math.imul(state^seed.charCodeAt(i),16777619);
 return ()=>{state=(state+0x6D2B79F5)|0;let n=Math.imul(state^(state>>>15),1|state);n^=n+Math.imul(n^(n>>>7),61|n);return ((n^(n>>>14))>>>0)/4294967296};
}

type BotInput={seed:string;level:Difficulty;text:string;blockErrors:boolean;elapsedMs:number};
type BotState={progress:number;typed:number;errors:number;finishedAfterMs?:number};

/** Replay the same character events from the seed, regardless of polling cadence. */
export function botState({seed,level,text,blockErrors,elapsedMs}:BotInput):BotState{
 const profile=botProfiles[level],random=seededRandom(seed),result:BotState={progress:0,typed:0,errors:0};
 let at=0,pending=0,wordEnd=0,wordLength=0;
 for(let i=0;i<text.length;i++){
  if(i>=wordEnd){wordEnd=text.indexOf(' ',i);if(wordEnd<0)wordEnd=text.length;wordLength=wordEnd-i}
  const variation=.75+random()*.5,error=random()<profile.errorRate,hesitation=random()<.04?80+random()*200:0,correction=100+random()*200;
  const difficulty=1+Math.min(.25,Math.max(0,wordLength-6)*.025)+(/[^\x00-\x7F]/.test(text[i])?.08:0);
  const duration=12_000/profile.wpm*variation*difficulty;
  at+=duration+hesitation;
  if(at>elapsedMs)return result;
  result.typed++;
  if(error){
   result.errors++;
   if(blockErrors){at+=correction+duration*.35;if(at>elapsedMs)return result;result.typed++;result.progress++}
   else pending++;
  }else result.progress++;
  // Free mode permits the word to continue, then corrects its missed letters.
  if(!blockErrors&&pending&&(text[i]===' '||i===text.length-1)){
   at+=pending*correction*.55;
   if(at>elapsedMs)return result;
   result.typed+=pending;result.progress+=pending;pending=0;
  }
 }
 result.finishedAfterMs=Math.ceil(at);
 return result;
}
