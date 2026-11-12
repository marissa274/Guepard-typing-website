import {expect,test} from '@jest/globals';
import {botState,botProfiles} from '../src/server/bot-engine';

const text='La petite jungle cache une extraordinaire rivière. '.repeat(100);
const race={seed:'classroom-42',level:'medium' as const,text,blockErrors:false};

test('the same seed replays exactly, independently of update frequency',()=>{
 const direct=botState({...race,elapsedMs:60_000});
 for(let elapsedMs=250;elapsedMs<60_000;elapsedMs+=250)botState({...race,elapsedMs});
 expect(botState({...race,elapsedMs:60_000})).toEqual(direct);
 expect(botState({...race,seed:'classroom-43',elapsedMs:60_000})).not.toEqual(direct);
});
test('five levels make increasing progress and actually produce errors',()=>{
 const levels=Object.keys(botProfiles) as (keyof typeof botProfiles)[];
 expect(levels).toEqual(['noob','beginner','medium','expert','impossible']);
 const states=levels.map(level=>botState({...race,level,elapsedMs:120_000}));
 expect(states.every((state,i)=>i===0||state.progress>states[i-1].progress)).toBe(true);
 expect(states.every(state=>state.errors>0&&state.typed===state.progress+state.errors)).toBe(true);
});
test('speed varies over time while progress remains monotonic',()=>{
 const states=Array.from({length:31},(_,i)=>botState({...race,elapsedMs:i*1000}));
 const increments=states.slice(1).map((state,i)=>state.progress-states[i].progress);
 expect(increments.every(value=>value>=0)).toBe(true);
 expect(new Set(increments).size).toBeGreaterThan(2);
});
test('blocking errors incur correction time and a completed bot has an exact arrival time',()=>{
 const short='Une extraordinaire rivière traverse la jungle. '.repeat(5);
 const blocking=botState({...race,level:'noob',text:short,blockErrors:true,elapsedMs:600_000});
 const free=botState({...race,level:'noob',text:short,blockErrors:false,elapsedMs:600_000});
 expect(blocking.progress).toBe(short.length);expect(free.progress).toBe(short.length);
 expect(blocking.errors).toBeGreaterThan(0);expect(blocking.finishedAfterMs).toBeGreaterThan(free.finishedAfterMs);
 expect(botState({...race,level:'noob',text:short,blockErrors:true,elapsedMs:blocking.finishedAfterMs!-1}).progress).toBeLessThan(short.length);
 expect(botState({...race,level:'noob',text:short,blockErrors:true,elapsedMs:blocking.finishedAfterMs!}).progress).toBe(short.length);
});
