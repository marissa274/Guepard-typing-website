import {test,expect,type Page} from '@playwright/test';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {gunzipSync,gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {cases,openCase} from './states';

/** References are gzipped JSON (`zcat file.json.gz` to read them). */
/** Computed style of every rendered element and pseudo-element, keyed by its DOM path (tag + element index). */
type Styles=Record<string,Record<string,string>>;
interface Snapshot {props:string[];common:Record<string,string>;elements:Record<string,Record<string,string>>}
const folder=join(dirname(fileURLToPath(import.meta.url)),'__screenshots__','styles');

async function collect(page:Page,masks:string[]):Promise<Styles>{
 return page.evaluate(masks=>{
  // Animations and transitions frozen at t=0 so the serialised value does not depend on timing.
  for(const animation of document.getAnimations()){animation.pause();animation.currentTime=0}
  const skipped=new Set(['HEAD','SCRIPT','STYLE','LINK','META','TITLE','NOSCRIPT','TEMPLATE']);
  const masked=masks.length?Array.from(document.querySelectorAll(masks.join(','))):[];
  const result:Record<string,Record<string,string>>={};
  const read=(style:CSSStyleDeclaration)=>{const values:Record<string,string>={};for(let index=0;index<style.length;index++){const name=style[index];if(!name.startsWith('--'))values[name]=style.getPropertyValue(name)}return values};
  const visit=(element:Element,key:string)=>{
   if(skipped.has(element.tagName)||masked.some(mask=>mask.contains(element)))return;
   result[key]=read(getComputedStyle(element));
   for(const pseudo of ['::before','::after']){const style=getComputedStyle(element,pseudo);if(style.content!=='none'&&style.content!=='normal')result[key+pseudo]=read(style)}
   if(getComputedStyle(element).display.includes('list-item'))result[key+'::marker']=read(getComputedStyle(element,'::marker'));
   if((element instanceof HTMLInputElement||element instanceof HTMLTextAreaElement)&&element.placeholder)result[key+'::placeholder']=read(getComputedStyle(element,'::placeholder'));
   if(element instanceof HTMLDialogElement&&element.open)result[key+'::backdrop']=read(getComputedStyle(element,'::backdrop'));
   Array.from(element.children).forEach((child,index)=>visit(child,`${key}>${child.tagName.toLowerCase()}:${index}`));
  };
  visit(document.documentElement,'html');
  return result;
 },masks);
}

/** Stores the most frequent value of each property once, then only the differences per element. */
function compress(styles:Styles):Snapshot{
 const counts:Record<string,Map<string,number>>={};
 for(const values of Object.values(styles))for(const [name,value] of Object.entries(values))(counts[name]??=new Map()).set(value,(counts[name].get(value)||0)+1);
 const props=Object.keys(counts).sort(),common:Record<string,string>={};
 for(const name of props)common[name]=[...counts[name]].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0];
 const elements:Snapshot['elements']={};
 for(const [key,values] of Object.entries(styles)){const own:Record<string,string>={};for(const name of props)if(name in values&&values[name]!==common[name])own[name]=values[name];elements[key]=own}
 return {props,common,elements};
}
function expand(snapshot:Snapshot):Styles{
 const styles:Styles={};
 for(const [key,own] of Object.entries(snapshot.elements))styles[key]={...snapshot.common,...own};
 return styles;
}
function differences(reference:Styles,current:Styles){
 const lines:string[]=[];
 for(const key of new Set([...Object.keys(reference),...Object.keys(current)])){
  if(!(key in current)){lines.push(`- ${key}`);continue}
  if(!(key in reference)){lines.push(`+ ${key}`);continue}
  for(const name of new Set([...Object.keys(reference[key]),...Object.keys(current[key])]))if(reference[key][name]!==current[key][name])lines.push(`~ ${key} ${name}: ${reference[key][name]} -> ${current[key][name]}`);
 }
 return lines;
}

for(const visual of cases){
 test(`computed styles ${visual.id}`,async({page,baseURL},testInfo)=>{
  const cleanup=await openCase(page,visual,baseURL!);
  try{
   const current=await collect(page,visual.scenario.masks||[]),file=join(folder,`${visual.id}.json.gz`),mode=testInfo.config.updateSnapshots;
   const write=()=>{mkdirSync(folder,{recursive:true});writeFileSync(file,gzipSync(JSON.stringify(compress(current),null,1)+'\n',{level:9}))};
   if(!existsSync(file)){if(mode==='none')throw new Error('Missing reference '+file);write();return}
   const lines=differences(expand(JSON.parse(gunzipSync(readFileSync(file)).toString('utf8')) as Snapshot),expand(compress(current)));
   if(lines.length&&(mode==='all'||mode==='changed')){write();return}
   expect(lines.slice(0,80).join('\n')+(lines.length>80?`\n… ${lines.length-80} more`:''),`${lines.length} computed-style differences`).toBe('');
  }finally{await cleanup?.()}
 });
}
