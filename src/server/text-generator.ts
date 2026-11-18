import {randomInt} from 'node:crypto';
import type {CorpusPassage} from '../data/corpus';
import {initialCorpus} from '../data/corpus';
import type {Settings} from '../lib/room-types';

export class TextGenerationError extends Error {readonly status=400}
function transform(text:string,settings:Settings){
 let result=text;
 if(!settings.accents)result=result.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(!settings.uppercase)result=result.toLocaleLowerCase(settings.language==='FR'?'fr':'en');
 if(!settings.punctuation)result=result.replace(/[.,;:!?’'"…()-]/g,'');
 if(!settings.numbers)result=result.replace(/\d/g,'');
 if(!settings.specials)result=result.replace(/[@#$%&*+=<>_~^|/\\{}[\]]/g,'');
 return result.replace(/\s+/g,' ').trim();
}

export function generateConfiguredText(settings:Settings,corpus:CorpusPassage[]=initialCorpus,pick:(max:number)=>number=randomInt):string{
 if(settings.textType==='custom'){
  const custom=transform(settings.customText,settings);
  if(custom.length<10)throw new TextGenerationError('Le texte personnalisé doit contenir au moins 10 caractères après application des options.');
  return custom;
 }
 const passages=corpus.filter(p=>p.language===settings.language&&p.complexity===settings.complexity&&p.kind===settings.textType);
 if(!passages.length)throw new TextGenerationError('Aucun texte ne correspond à cette langue et cette complexité.');
 const random=settings.textType==='words';
 let pool=(random?passages:[passages[pick(passages.length)]]).flatMap(p=>transform(p.content,settings).split(' ')).filter(Boolean);
 if(random)pool=pool.filter(word=>![...word].some(character=>settings.blacklist.includes(character)));
 if(!pool.length)throw new TextGenerationError('Ces exclusions ne laissent aucun mot disponible.');
 const words=Array.from({length:settings.length},(_,index)=>pool[random?pick(pool.length):index%pool.length]);
 if(random){
  if(settings.numbers)for(let index=8;index<words.length;index+=11)words[index]+=`${pick(100)}`;
  if(settings.specials)for(let index=7;index<words.length;index+=13)words[index]+=['@','#','+'][index%3];
  for(let index=0;index<words.length;index++)words[index]=[...words[index]].filter(character=>!settings.blacklist.includes(character)).join('');
  const required=[...new Set([...settings.whitelist].filter(character=>!(/\s/u.test(character))))];
  if(required.some(character=>settings.blacklist.includes(character)))throw new TextGenerationError('Un caractère ne peut pas être inclus et exclu en même temps.');
  required.forEach((character,index)=>{if(!words.some(word=>word.includes(character)))words[index%words.length]+=character});
 }
 const result=words.filter(Boolean).join(' ');
 if(result.length<10)throw new TextGenerationError('Ces réglages ne laissent pas assez de texte.');
 return result;
}
