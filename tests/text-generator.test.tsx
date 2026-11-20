import {initialCorpus} from '../src/data/corpus';
import {defaultSettings,type Settings} from '../src/lib/room-types';
import {generateConfiguredText} from '../src/server/text-generator';

test('database corpus selection respects language, complexity and word count',()=>{
 const settings:Settings={...defaultSettings,language:'EN',complexity:'hard',textType:'words',length:20,uppercase:false,punctuation:false};
 const text=generateConfiguredText(settings,initialCorpus,()=>0);
 expect(text.split(' ')).toHaveLength(20);
 expect(text.split(' ').every(word=>word==='biodiversity')).toBe(true);
});
test('random words honor case, exclusions, mandatory included characters and accents',()=>{
 const settings:Settings={...defaultSettings,textType:'words',length:20,complexity:'easy',uppercase:false,accents:false,punctuation:false,numbers:false,specials:true,whitelist:'@é',blacklist:'x'};
 const text=generateConfiguredText(settings,initialCorpus,()=>0);
 expect(text).toContain('@');expect(text).toContain('é');expect(text).not.toMatch(/[A-Zx]/);expect(text.split(' ')).toHaveLength(20);
});
test('incompatible include/exclude settings fail instead of silently removing the requested character',()=>{
 expect(()=>generateConfiguredText({...defaultSettings,textType:'words',whitelist:'@',blacklist:'@'},initialCorpus)).toThrow();
});
test('coherent corpus ignores character inclusion and exclusion without changing its words',()=>{
 const base:Settings={...defaultSettings,textType:'story',length:20,whitelist:'@',blacklist:'e'};
 expect(generateConfiguredText(base,initialCorpus,()=>0)).toBe(generateConfiguredText({...base,whitelist:'',blacklist:''},initialCorpus,()=>0));
});
test('numbers off: coherent texts leave no hole where a number was',()=>{
 const base:Settings={...defaultSettings,language:'FR',textType:'story',complexity:'medium',length:200,numbers:false};
 const text=generateConfiguredText(base,initialCorpus,()=>0);
 expect(text).not.toMatch(/\d/);expect(text).not.toMatch(/\s[,.;:!?]|\(\s*\)|\s{2}/);
 expect(text).not.toContain('maison portant le numéro');
});
test('numbers off: a passage whose only choice contains numbers is cleaned without orphan punctuation',()=>{
 const passage={id:'t',language:'FR' as const,complexity:'medium' as const,kind:'story' as const,source:'t',content:"En l'année 1872, la maison portant le numéro 7 de Saville-row, où Sheridan mourut en 1814, était habitée."};
 const text=generateConfiguredText({...defaultSettings,language:'FR',textType:'story',complexity:'medium',length:12,numbers:false},[passage],()=>0);
 expect(text).not.toMatch(/\d/);expect(text).not.toMatch(/\s[,.;:!?]|\s{2}/);expect(text).toContain("En l'année,");
});
