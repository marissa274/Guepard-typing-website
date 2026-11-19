import {expect,test} from '@jest/globals';
import {initialCorpus} from '../src/data/corpus';
import {defaultSettings,type Settings} from '../src/lib/room-types';
import * as generator from '../src/server/text-generator';

const {generateConfiguredText}=generator;
const story=(values:Partial<Settings>):Settings=>({...defaultSettings,textType:'story',...values});
const words=(values:Partial<Settings>):Settings=>({...defaultSettings,textType:'words',...values});
const first=()=>0;

test('C1-B5: a long coherent text chains different passages instead of looping over one',()=>{
 const settings=story({language:'FR',complexity:'medium',numbers:true});
 const passages=initialCorpus.filter(p=>p.language==='FR'&&p.complexity==='medium'&&p.kind==='story');
 expect(passages.length).toBeGreaterThanOrEqual(3);
 const available=passages.reduce((sum,p)=>sum+p.content.split(/\s+/).length,0);
 const text=generateConfiguredText({...settings,length:available},initialCorpus).split(' ');
 expect(text).toHaveLength(available);
 const windows=new Set<string>();
 for(let index=0;index+6<=text.length;index++){
  const window=text.slice(index,index+6).join(' ');
  expect(windows.has(window)).toBe(false);
  windows.add(window);
 }
 const starts=passages.filter(p=>text.join(' ').includes(p.content.split(' ').slice(0,6).join(' ')));
 expect(starts.length).toBe(passages.length);
});

test('C1-B5: past the corpus size, passages start over without repeating the same one back to back',()=>{
 const text=generateConfiguredText(story({language:'EN',complexity:'hard',length:400,punctuation:false,uppercase:false}),initialCorpus,first);
 expect(text.split(' ')).toHaveLength(400);
});

test('C1-B6: uppercase and punctuation change random word texts',()=>{
 const base=words({language:'FR',complexity:'easy',length:60});
 const plain=generateConfiguredText({...base,uppercase:false,punctuation:false},initialCorpus,first);
 const rich=generateConfiguredText({...base,uppercase:true,punctuation:true},initialCorpus,first);
 expect(plain).not.toMatch(/[A-ZÀ-Ý]/);expect(plain).not.toMatch(/[.,]/);
 expect(rich).toMatch(/^[A-ZÀ-Ý]/);expect(rich).toMatch(/\./);expect(rich).toMatch(/,/);
 expect(rich.endsWith('.')).toBe(true);
});

test('C1-B6: numbers have an effect in coherent mode by choosing passages that contain them first',()=>{
 const base=story({language:'FR',complexity:'hard',length:20});
 expect(generateConfiguredText({...base,numbers:true},initialCorpus,first)).toMatch(/\d/);
 expect(generateConfiguredText({...base,numbers:false},initialCorpus,first)).not.toMatch(/\d/);
 const accents=generateConfiguredText({...base,numbers:true,accents:true},initialCorpus,first);
 expect(accents).toMatch(/[éèàùâêîôûç]/);
 expect(generateConfiguredText({...base,numbers:true,accents:false},initialCorpus,first)).not.toMatch(/[éèàùâêîôûç]/);
});

test('CONF-05: every corpus entry has the complexity its measured criteria give',()=>{
 const criteria=generator.complexityCriteria;
 expect(criteria.longWordLetters).toBeGreaterThan(0);
 for(const passage of initialCorpus)expect([passage.id,generator.classifyComplexity(passage.content,passage.kind)]).toEqual([passage.id,passage.complexity]);
 const metrics=generator.measureComplexity('Le chat dort. Il rêve.');
 expect(metrics).toMatchObject({words:5,averageWordLength:3.2,longWordRatio:0,wordsPerSentence:2.5});
});

test('CONF-05: harder random texts receive more numbers and special characters',()=>{
 const count=(complexity:Settings['complexity'])=>[...generateConfiguredText(words({complexity,length:300,numbers:true,specials:true,punctuation:false}),initialCorpus,first)].filter(character=>/[\d@#+]/.test(character)).length;
 expect(count('hard')).toBeGreaterThan(count('medium'));
 expect(count('medium')).toBeGreaterThan(count('easy'));
});
