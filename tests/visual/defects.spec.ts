import {test,expect} from '@playwright/test';
import {openCase,type VisualCase} from './states';

/**
 * Regression checks for the two visual defects fixed during TECH-03 lot 0 (they fail on 3049ba3).
 * - The hanging monkey of the home scene must stay behind the boards: it used to cover « Rejoindre rapidement ».
 * - A podium name must never be split inside a word (« GuepardDem / o »).
 */
const widths=[360,700,1000,1151,1440,1550,2688];
const at=(id:string,path:string,width:number):VisualCase=>({id,theme:'light',viewport:{width,height:width>2000?1680:900},scenario:{open:async page=>{await page.goto(path)},viewports:[]}});

for(const width of widths){
 test(`home monkey stays behind the first board at ${width}px`,async({page,baseURL})=>{
  await openCase(page,at('home','/',width),baseURL!);
  const result=await page.evaluate(()=>{
   const monkey=document.querySelector('.scene-monkey')!,clearing=document.querySelector('.jungle-clearing')!,board=document.querySelector('.board-action')!;
   const text=Array.from(board.childNodes).find(node=>node.nodeType===Node.TEXT_NODE)!,range=document.createRange();range.selectNodeContents(text);
   const label=range.getBoundingClientRect(),body=monkey.getBoundingClientRect();
   const overlaps=body.left<label.right&&body.right>label.left&&body.top<label.bottom&&body.bottom>label.top;
   const depth=(element:Element)=>Number.parseInt(getComputedStyle(element).zIndex,10)||0;
   return {overlaps,monkey:depth(monkey),clearing:depth(clearing),sameContext:monkey.parentElement===clearing.parentElement};
  });
  expect(result.sameContext).toBe(true);
  if(result.overlaps)expect(result.monkey,'the monkey paints over the « Rejoindre rapidement » label').toBeLessThan(result.clearing);
 });

 test(`podium names wrap only between words at ${width}px`,async({page,baseURL})=>{
  await openCase(page,at('podium','/demo/podium',width),baseURL!);
  const names=['GuepardDemo','PerroquetDemo','CrocodileDemo','Explorateur Curieux'];
  const lines=await page.evaluate(names=>Array.from(document.querySelectorAll('.results-plaque :is(h2,h3)')).map((heading,index)=>{
   heading.textContent=names[index%names.length];
   const range=document.createRange(),words:Record<string,number>={};
   let offset=0;
   for(const word of heading.textContent.split(' ')){
    range.setStart(heading.firstChild!,offset);range.setEnd(heading.firstChild!,offset+word.length);offset+=word.length+1;
    words[word]=new Set(Array.from(range.getClientRects()).filter(rect=>rect.width>0).map(rect=>Math.round(rect.top))).size;
   }
   return words;
  }),names);
  expect(lines.length).toBeGreaterThan(0);
  for(const words of lines)for(const [word,count] of Object.entries(words))expect(count,`« ${word} » is split over ${count} lines`).toBe(1);
 });
}
