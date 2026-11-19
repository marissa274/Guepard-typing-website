import {randomInt} from 'node:crypto';
import type {CorpusPassage,TextComplexity} from '../data/corpus';
import {initialCorpus} from '../data/corpus';
import type {Settings} from '../lib/room-types';

export class TextGenerationError extends Error {readonly status=400}

/**
 * CONF-05 — measurable complexity criteria (documented in docs/fonctionnalites/complexite-des-textes.md).
 * score = average letters per word × 1 + share of words of `longWordLetters` letters or more × 10
 *       + words per sentence × 0.1 (coherent passages only; a dictionary has no sentences).
 * A passage is `easy` below `thresholds[kind].easy`, `medium` below `thresholds[kind].medium`, `hard` otherwise.
 * Random texts also receive more digits, special characters and punctuation as complexity rises (`randomText`).
 */
export const complexityCriteria={
 longWordLetters:9,
 weights:{averageWordLength:1,longWordRatio:10,wordsPerSentence:.1},
 thresholds:{story:{easy:7,medium:9},words:{easy:7,medium:11}},
 randomText:{
  easy:{numberEvery:15,specialEvery:17,commaEvery:9,sentenceWords:8},
  medium:{numberEvery:11,specialEvery:13,commaEvery:7,sentenceWords:10},
  hard:{numberEvery:7,specialEvery:9,commaEvery:5,sentenceWords:12},
 },
} as const;

const sentenceEnd=/[.!?;:]/g,punctuationCharacters=/[.,;:!?’'"…()«»—–-]/g,specialCharacters=/[@#$%&*+=<>_~^|/\\{}[\]]/g;

export function measureComplexity(text:string){
 const words=text.split(/\s+/).map(word=>word.replace(/[^\p{L}\p{N}]/gu,'')).filter(Boolean),count=Math.max(1,words.length);
 const sentences=Math.max(1,(text.match(sentenceEnd)||[]).length);
 return {
  words:words.length,
  averageWordLength:words.reduce((sum,word)=>sum+[...word].length,0)/count,
  longWordRatio:words.filter(word=>[...word].length>=complexityCriteria.longWordLetters).length/count,
  wordsPerSentence:words.length/sentences,
 };
}

export function complexityScore(text:string,kind:CorpusPassage['kind']){
 const metrics=measureComplexity(text),weights=complexityCriteria.weights;
 return metrics.averageWordLength*weights.averageWordLength+metrics.longWordRatio*weights.longWordRatio+(kind==='story'?metrics.wordsPerSentence*weights.wordsPerSentence:0);
}

export function classifyComplexity(text:string,kind:CorpusPassage['kind']):TextComplexity{
 const score=complexityScore(text,kind),limits=complexityCriteria.thresholds[kind];
 return score<limits.easy?'easy':score<limits.medium?'medium':'hard';
}

function transform(text:string,settings:Settings){
 let result=text;
 if(!settings.accents)result=result.normalize('NFD').replace(/[̀-ͯ]/g,'');
 if(!settings.uppercase)result=result.toLocaleLowerCase(settings.language==='FR'?'fr':'en');
 if(!settings.punctuation)result=result.replace(punctuationCharacters,'');
 if(!settings.numbers)result=result.replace(/\d/g,'');
 if(!settings.specials)result=result.replace(specialCharacters,'');
 return result.replace(/\s+/g,' ').trim();
}

function shuffle(values:number[],pick:(max:number)=>number){
 for(let index=values.length-1;index>0;index--){const other=pick(index+1);[values[index],values[other]]=[values[other],values[index]]}
 return values;
}

/**
 * Coherent mode (CONF-03): passages are chained in a shuffled order, each one from its beginning.
 * No passage is used twice before every matching passage has been used; when the requested length
 * exceeds the whole matching corpus, a new shuffled round starts, never with the passage just typed.
 * CONF-06: with numbers (or special characters) enabled, passages that contain them come first in the
 * first round; real passages are never altered by invented digits or symbols.
 */
function chainPassages(passages:CorpusPassage[],settings:Settings,pick:(max:number)=>number){
 const featured=(content:string)=>settings.numbers&&/\d/.test(content)||settings.specials&&new RegExp(specialCharacters.source).test(content);
 const prepared=passages.map(passage=>({words:transform(passage.content,settings).split(' ').filter(Boolean),featured:featured(passage.content)})).filter(passage=>passage.words.length);
 if(!prepared.length)return [];
 const words:string[]=[];let last=-1;
 for(let round=0;words.length<settings.length;round++){
  const order=shuffle(prepared.map((_,index)=>index),pick);
  if(round===0)order.sort((a,b)=>Number(prepared[b].featured)-Number(prepared[a].featured));
  if(order.length>1&&order[0]===last)[order[0],order[1]]=[order[1],order[0]];
  for(const index of order){if(words.length>=settings.length)break;words.push(...prepared[index].words);last=index}
 }
 return words.slice(0,settings.length);
}

/** Random mode: digits, symbols, punctuation and sentence capitals are added at the cadence of the complexity. */
function decorateRandomWords(words:string[],settings:Settings,pick:(max:number)=>number){
 const cadence=complexityCriteria.randomText[settings.complexity];
 if(settings.numbers)for(let index=cadence.numberEvery-1;index<words.length;index+=cadence.numberEvery)words[index]+=`${pick(100)}`;
 if(settings.specials)for(let index=cadence.specialEvery-1;index<words.length;index+=cadence.specialEvery)words[index]+=['@','#','+'][index%3];
 for(let index=0;index<words.length;index++){
  const sentenceStart=index%cadence.sentenceWords===0,sentenceLast=index%cadence.sentenceWords===cadence.sentenceWords-1||index===words.length-1;
  if(settings.uppercase&&sentenceStart)words[index]=words[index].charAt(0).toLocaleUpperCase(settings.language==='FR'?'fr':'en')+words[index].slice(1);
  if(settings.punctuation)words[index]+=sentenceLast?'.':index%cadence.commaEvery===cadence.commaEvery-1?',':'';
 }
}

export function generateConfiguredText(settings:Settings,corpus:CorpusPassage[]=initialCorpus,pick:(max:number)=>number=randomInt):string{
 if(settings.textType==='custom'){
  const custom=transform(settings.customText,settings);
  if(custom.length<10)throw new TextGenerationError('Le texte personnalisé doit contenir au moins 10 caractères après application des options.');
  return custom;
 }
 const passages=corpus.filter(p=>p.language===settings.language&&p.complexity===settings.complexity&&p.kind===settings.textType);
 if(!passages.length)throw new TextGenerationError('Aucun texte ne correspond à cette langue et cette complexité.');
 let words:string[];
 if(settings.textType==='story')words=chainPassages(passages,settings,pick);
 else{
  // Dictionary words are lower case: uppercase is applied to sentence starts by decorateRandomWords.
  const pool=passages.flatMap(p=>transform(p.content,{...settings,uppercase:false}).split(' ')).filter(word=>word&&![...word].some(character=>settings.blacklist.includes(character)));
  if(!pool.length)throw new TextGenerationError('Ces exclusions ne laissent aucun mot disponible.');
  words=Array.from({length:settings.length},()=>pool[pick(pool.length)]);
  decorateRandomWords(words,settings,pick);
  for(let index=0;index<words.length;index++)words[index]=[...words[index]].filter(character=>!settings.blacklist.includes(character)).join('');
  const required=[...new Set([...settings.whitelist].filter(character=>!(/\s/u.test(character))))];
  if(required.some(character=>settings.blacklist.includes(character)))throw new TextGenerationError('Un caractère ne peut pas être inclus et exclu en même temps.');
  required.forEach((character,index)=>{if(!words.some(word=>word.includes(character)))words[index%words.length]+=character});
 }
 if(!words.length)throw new TextGenerationError('Ces exclusions ne laissent aucun mot disponible.');
 const result=words.filter(Boolean).join(' ');
 if(result.length<10)throw new TextGenerationError('Ces réglages ne laissent pas assez de texte.');
 return result;
}
