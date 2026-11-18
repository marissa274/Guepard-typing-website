import type {Heatmap,Person,Room} from '../lib/room-types';
import {typingEdit} from '../lib/typing-edits';

export const typingLimits={charactersPerSecond:25,initialCredit:8,maximumCredit:40};

export function typingAllowance(person:Person,startedAt:number,now:number){
 const elapsed=Math.max(0,now-(person.lastProgressAt??startedAt));
 return Math.min(typingLimits.maximumCredit,(person.typingBudget??typingLimits.initialCredit)+elapsed*typingLimits.charactersPerSecond/1000);
}

export function keyboardAggregate(value:unknown,previous:Heatmap,typed:number,maximumErrors=typed):Heatmap|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const entries=Object.entries(value);if(entries.length>256)return null;
 const heat:Heatmap=Object.create(null);let total=0,totalErrors=0;
 for(const [key,entry]of entries){
  if(key.length!==1||!entry||typeof entry!=='object')return null;
  const {hits,errors}=entry as {hits:unknown;errors:unknown};
  if(typeof hits!=='number'||typeof errors!=='number'||!Number.isSafeInteger(hits)||!Number.isSafeInteger(errors)||errors<0||hits<errors||hits<0)return null;
  if(hits<(previous[key]?.hits||0)||errors<(previous[key]?.errors||0))return null;
  heat[key]={hits,errors};total+=hits;totalErrors+=errors;
 }
 if(!Number.isSafeInteger(total)||total>typed||totalErrors>maximumErrors||Object.keys(previous).some(key=>!Object.hasOwn(heat,key)))return null;
 return heat;
}

export function recordKeyboard(previous:Heatmap,oldInput:string,input:string,target:string):Heatmap{
 const heat:Heatmap=Object.fromEntries(Object.entries(previous).map(([key,entry])=>[key,{...entry}]));
 const edit=typingEdit(oldInput,input);
 for(let i=edit.start;i<edit.start+edit.inserted.length;i++){
  const key=(target[i]||input[i]).toLowerCase(),entry=heat[key]??={hits:0,errors:0};
  entry.hits++;if(input[i]!==target[i])entry.errors++;
 }
 return heat;
}

export function recordTelemetry(room:Room,at:number,force=false){
 if(!room.startedAt||at<room.startedAt)return;
 for(const person of room.people){
  if(person.role!=='player')continue;
  const end=person.finishedAt??person.abandonedAt??at;
  const sampleAt=Math.min(at,end),series=person.telemetry??=[];
  const last=series.at(-1);
  const terminal=person.finishedAt!==undefined||person.abandonedAt!==undefined;
  if(last&&sampleAt<last.at||!force&&last&&sampleAt-last.at<1000&&(!terminal||last.at===end))continue;
  const seconds=Math.max(1,(sampleAt-room.startedAt)/1000),length=(person.targetText??room.text??'').length;
  const sample={at:sampleAt,wpm:Math.round(person.progress*12/seconds),grossWpm:Math.round(person.typed*12/seconds),progress:person.progress/Math.max(1,length)};
  if(last?.at===sampleAt){series[series.length-1]=sample;continue}
  series.push(sample);
 }
}
