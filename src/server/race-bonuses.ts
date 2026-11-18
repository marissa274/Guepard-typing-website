import type {BonusType,Person,Room} from '../lib/room-types';

export function participantProgress(person:Person){return person.progress/Math.max(1,person.targetText?.length||1)}

function shorten(person:Person){
 const text=person.targetText||'',typedLength=person.input?.length||person.progress;
 const words=[...text.matchAll(/\S+/g)];
 let end=text.length;
 for(let removed=0;removed<3&&words.length>1;removed++){
  const word=words.pop()!;
  const candidate=text.slice(0,word.index).trimEnd().length;
  if(candidate<=typedLength)break;
  end=candidate;
 }
 person.targetText=text.slice(0,end);
}

function applyEffect(room:Room,type:BonusType,recipient:Person,leader:Person,at:number){
 if(type==='shortcut'){shorten(recipient);return recipient}
 if(type==='detour'){
  const words=(room.text||'').trim().split(/\s+/).slice(0,3).join(' ');
  leader.targetText=(leader.targetText||room.text||'')+' '+words;
  return leader;
 }
 leader.pausedUntil=Math.max(leader.pausedUntil||0,at+2000);
 const pauses=leader.pauses??=[];
 if(!pauses.some(pause=>pause.start===at&&pause.end===at+2000))pauses.push({start:at,end:at+2000});
 return leader;
}

/** Checkpoints are persisted so replaying any request cannot award a bonus twice. */
export function applyBonuses(room:Room,at:number){
 if(!room.settings.bonuses||room.phase!=='running')return false;
 let changed=false;
 for(const [index,checkpoint]of ([25,50,75] as const).entries()){
  if(room.bonusCheckpoints?.includes(checkpoint))continue;
  const racers=room.people.filter(person=>person.role==='player'&&!person.abandoned).sort((a,b)=>participantProgress(b)-participantProgress(a)||a.id.localeCompare(b.id));
  const leader=racers[0];if(!leader||participantProgress(leader)<checkpoint/100)break;
  (room.bonusCheckpoints??=[]).push(checkpoint);changed=true;
  const lastProgress=Math.min(...racers.map(participantProgress)),leadProgress=participantProgress(leader);
  const recipients=racers.filter(person=>person.id!==leader.id&&!person.finishedAt&&(person.bonusReceived||0)<3&&(participantProgress(person)===lastProgress||leadProgress-participantProgress(person)>.25));
  const type:BonusType=(['shortcut','detour','pause'] as const)[index];
  let sharedTarget:Person|undefined;
  for(const recipient of recipients){
   if(type!=='shortcut'&&leader.finishedAt)continue;
   const target=type==='shortcut'||!sharedTarget?applyEffect(room,type,recipient,leader,at):sharedTarget;
   if(type!=='shortcut')sharedTarget=target;
   recipient.bonusReceived=(recipient.bonusReceived||0)+1;
   (room.bonusEvents??=[]).push({checkpoint,type,recipientId:recipient.id,targetId:target.id,at});
  }
 }
 return changed;
}
