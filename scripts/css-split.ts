/**
 * TECH-03, lot 0: mechanical split of the legacy stylesheets into `src/styles/` (see docs/architecture/migration-tailwind.md).
 *
 * The 11 legacy sheets were imported unlayered, in a fixed order. The new entry point imports `base.css` in `@layer base`
 * and the other files, in a fixed order, in `@layer components`. The split therefore has to keep the cascade:
 * - inside `components`, rules keep their original relative order inside each file; when two rules swap order because they
 *   land in different files, and they may compete (same property, same specificity, same pseudo-element, possibly the
 *   same element), the later rule follows the earlier one into its file;
 * - `base` only receives element-level rules (reset, `:root`, dark variables) that no component rule used to lose to;
 * - `!important` declarations never go to `base` (their priority is reversed between layers).
 *
 * Usage: node scripts/css-split.ts [--ref <git ref>] [--out <dir>] [--check]
 * The sources are read from git (default: 3049ba3, the commit before the split), so the script can be re-run after the
 * legacy sheets are deleted. `--check` prints the classification and the cascade moves without writing.
 * The output is the starting point of lot 0 only: chrome.css and kit.css were then edited by hand when Chrome, Site,
 * AnimalAvatar and Runner moved to utilities, and lots A-C edit their own files. Re-running into src/styles would undo
 * that work; use `--out` to compare.
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import postcss,{type AtRule,type ChildNode,type Comment,type Declaration,type Rule} from 'postcss';

const root=process.cwd();
const args=process.argv.slice(2),ref=args.includes('--ref')?args[args.indexOf('--ref')+1]:'3049ba3',check=args.includes('--check');
const out=args.includes('--out')?args[args.indexOf('--out')+1]:'src/styles';
const sources=['src/style.css','src/jungle.css','src/auth.css','src/expeditions.css','src/woodland.css','src/race-tracks.css','src/lobby-compact.css','src/play-experience.css','src/results.css','src/results-reference.css','app/globals.css'];
export const groups=['base','kit','chrome','home','how','account','expeditions','lobby','race','results'] as const;
type Group=typeof groups[number];
const rank=(group:Group)=>groups.indexOf(group);

/** Components rendered by each group (lots 0, A, B, C). */
const owners:Record<Exclude<Group,'base'>,string[]>={
 kit:['AnimalAvatar.tsx','lobby/Runner.tsx'],
 chrome:['Chrome.tsx','Site.tsx','SiteContext.tsx'],
 home:['Jungle.tsx','SignBoard.tsx','JoinByCode.tsx'],
 how:['HowToPlay.tsx','Pages.tsx'],
 account:['Auth.tsx','AccountSettings.tsx','StatsPage.tsx'],
 expeditions:['Races.tsx'],
 lobby:['lobby/Lobby.tsx','lobby/CreateRoom.tsx','lobby/QuickJoin.tsx','lobby/RoomSettings.tsx','lobby/MembershipConflict.tsx'],
 race:['lobby/VisualRace.tsx','RaceGame.tsx'],
 results:['lobby/RaceResults.tsx','lobby/RaceTimeline.tsx','lobby/PodiumDemo.tsx','lobby/HistoricalResults.tsx'],
};
/** Shared by several groups of components (plan, « kit »). */
const kitClasses=new Set(['button','primary','inner','eyebrow','scoreboard','animal','selected','wood-primary','wood-small-button','woodland-back','woodland-page','woodland-scenery','woodland-shell','lobby-page','lobby-active','lobby-results','animal-cutout','leaves-cutout']);

// ---------- class usage in the components ----------
interface Usage {exact:Map<string,Set<Group>>;prefixes:[string,Group][];together:Set<string>[];tags:Map<string,Set<string>>}
const jsxTags:Record<string,string>={Link:'a',Image:'img'};
function componentFiles(dir:string):string[]{return readdirSync(dir).flatMap(name=>{const path=join(dir,name);return statSync(path).isDirectory()?componentFiles(path):/\.tsx?$/.test(name)?[path]:[]})}
function usage():Usage{
 const exact=new Map<string,Set<Group>>(),prefixes:[string,Group][]=[],together:Set<string>[]=[],tags=new Map<string,Set<string>>();
 const tagged=(token:string,tag:string)=>{if(!tags.has(token))tags.set(token,new Set());tags.get(token)!.add(tag)};
 const folder=join(root,'src/components');
 for(const path of componentFiles(folder)){
  const name=relative(folder,path),group=(Object.entries(owners).find(([,files])=>files.includes(name))?.[0]) as Group|undefined;
  if(!group)throw new Error('No group for component '+name);
  const source=execFileSync('git',['show',`${ref}:${relative(root,path)}`],{encoding:'utf8'});
  // String and template literals; `${…}` becomes a marker so that `scene-${name}` is read as the prefix `scene-`.
  for(const match of source.matchAll(/'([^'\\\n]*)'|"([^"\\\n]*)"|`([^`]*)`/g)){
   const text=(match[1]??match[2]??match[3]).replace(/\$\{[^}]*\}/g,'@@');
   const tokens=new Set<string>();
   // Element of a className literal: the nearest `<Tag` before the nearest `className=` (unknown otherwise).
   const before=source.slice(Math.max(0,match.index-900),match.index),attribute=before.lastIndexOf('className=');
   const inside=attribute>=0&&!/\s[\w-]+=[{"']/.test(before.slice(attribute+10));
   const opening=inside?/<([A-Za-z][\w.]*)[^<]*$/.exec(before.slice(0,attribute)):null;
   const element=!inside?'':!opening?'?':/^[a-z]/.test(opening[1])?opening[1]:jsxTags[opening[1]]||'?';
   // tabIndex anywhere in the opening tag makes the element focusable.
   const start=opening?match.index-(before.length-before.lastIndexOf('<'+opening[1])):match.index,end=source.slice(start).search(/\/>|>\s*[<{]/);
   const tag=element&&element!=='?'&&source.slice(start,start+(end<0?400:end)).includes('tabIndex')?element+'!':element;
   for(const token of text.split(/\s+/)){
    if(/^-?[A-Za-z_][\w-]*@@$/.test(token)){prefixes.push([token.slice(0,-2),group]);tokens.add(token.slice(0,-2)+'*')}
    else if(/^-?[A-Za-z_][\w-]*-$/.test(token)){prefixes.push([token,group]);tokens.add(token+'*')}
    else if(/^-?[A-Za-z_][\w-]*$/.test(token)){if(!exact.has(token))exact.set(token,new Set());exact.get(token)!.add(group);tokens.add(token)}
   }
   if(tag)for(const token of tokens)tagged(token,tag);
   if(tokens.size>1)together.push(tokens);
  }
 }
 return {exact,prefixes,together,tags};
}
const used=usage();
/** Group A may contain elements of group B (component imports, transitively). Site.tsx only renders `#app`. */
const contains=new Map<Group,Set<Group>>(groups.map(group=>[group,new Set([group,'kit'] as Group[])]));
{
 const folder=join(root,'src/components'),groupOf=(name:string)=>(Object.entries(owners).find(([,files])=>files.includes(name))?.[0]) as Group;
 for(const path of componentFiles(folder)){
  const name=relative(folder,path);if(['Site.tsx','SiteContext.tsx'].includes(name))continue;
  const source=execFileSync('git',['show',`${ref}:${relative(root,path)}`],{encoding:'utf8'});
  for(const match of source.matchAll(/^import [^;]*? from '(\.{1,2}\/[\w/]+)'/gm)){const target=relative(folder,join(dirname(path),match[1]))+'.tsx';if(owners.kit.includes(target)||Object.values(owners).some(files=>files.includes(target)))contains.get(groupOf(name))!.add(groupOf(target))}
 }
 for(let changed=true;changed;){changed=false;for(const set of contains.values())for(const inner of [...set])for(const deeper of contains.get(inner)!)if(!set.has(deeper)){set.add(deeper);changed=true}}
}
/** Generated classes whose suffix comes from a closed list (Jungle: `scene-${name}`, `animal-${name}`). */
const sceneAnimals=['giraffe','elephant','toucan','crocodile','parrot','monkey'];
const prefixValues:Record<string,string[]>={'scene-':sceneAnimals,'animal-':sceneAnimals};
const prefixMatches=(name:string,prefix:string)=>name.startsWith(prefix)&&name.length>prefix.length&&(!prefixValues[prefix]||prefixValues[prefix].includes(name.slice(prefix.length)));
const groupCache=new Map<string,Set<Group>>();
function classGroups(name:string):Set<Group>{if(!groupCache.has(name))groupCache.set(name,computeGroups(name));return groupCache.get(name)!}
function computeGroups(name:string):Set<Group>{
 if(kitClasses.has(name))return new Set(['kit']);
 const found=new Set(used.exact.get(name)||[]);
 for(const [prefix,group] of used.prefixes)if(prefixMatches(name,prefix))found.add(group);
 return found;
}

// ---------- selectors ----------
/** Splits at top level (outside parentheses and brackets). */
function splitTop(text:string,separator:RegExp){const parts:string[]=[];let depth=0,current='';for(let index=0;index<text.length;index++){const character=text[index];if('(['.includes(character))depth++;if(')]'.includes(character))depth--;if(depth===0&&separator.test(character)){parts.push(current);current='';continue}current+=character}parts.push(current);return parts}
const selectorList=(text:string)=>splitTop(text,/,/).map(part=>part.trim()).filter(Boolean);
/** Compounds of a complex selector, from left to right. */
const compoundCache=new Map<string,string[]>();
function compounds(selector:string){if(!compoundCache.has(selector))compoundCache.set(selector,splitCompounds(selector));return compoundCache.get(selector)!}
function splitCompounds(selector:string){
 const parts:string[]=[];let depth=0,current='';
 for(let index=0;index<selector.length;index++){
  const character=selector[index];
  if('(['.includes(character))depth++;if(')]'.includes(character))depth--;
  if(depth===0&&/[\s>+~]/.test(character)){if(current.trim())parts.push(current.trim());current='';continue}
  current+=character;
 }
 if(current.trim())parts.push(current.trim());
 return parts;
}
interface Simple {ids:string[];classes:string[];attributes:string[];tag:string|null;pseudoClasses:string[];pseudoElement:string|null;args:string[]}
const simpleCache=new Map<string,Simple>();
function simple(compound:string):Simple{if(!simpleCache.has(compound))simpleCache.set(compound,parseSimple(compound));return simpleCache.get(compound)!}
function parseSimple(compound:string):Simple{
 const result:Simple={ids:[],classes:[],attributes:[],tag:null,pseudoClasses:[],pseudoElement:null,args:[]};
 let index=0;
 const tag=/^(\*|[a-zA-Z][\w-]*)/.exec(compound);if(tag){result.tag=tag[1]==='*'?null:tag[1].toLowerCase();index=tag[0].length}
 while(index<compound.length){
  const rest=compound.slice(index);let match:RegExpExecArray|null;
  if((match=/^#([\w-]+)/.exec(rest))){result.ids.push(match[1]);index+=match[0].length;continue}
  if((match=/^\.((?:\\.|[\w-])+)/.exec(rest))){result.classes.push(match[1].replace(/\\/g,''));index+=match[0].length;continue}
  if(rest[0]==='['){const close=matchClose(rest,0,'[',']');result.attributes.push(rest.slice(1,close));index+=close+1;continue}
  if((match=/^::?([\w-]+)/.exec(rest))){
   const name=match[1],elementLike=match[0].startsWith('::')||['before','after','first-line','first-letter'].includes(name);
   index+=match[0].length;let argument='';
   if(compound[index]==='('){const close=matchClose(compound,index,'(',')');argument=compound.slice(index+1,close);index=close+1}
   if(elementLike)result.pseudoElement=name+(argument?`(${argument})`:'');
   else{result.pseudoClasses.push(name);if(argument)result.args.push(...(['is','not','where','has','matches'].includes(name)?[`${name}|${argument}`]:[]))}
   continue;
  }
  throw new Error(`Cannot parse compound "${compound}"`);
 }
 return result;
}
function matchClose(text:string,start:number,open:string,close:string){let depth=0;for(let index=start;index<text.length;index++){if(text[index]===open)depth++;else if(text[index]===close&&--depth===0)return index}throw new Error('Unbalanced '+text)}
type Specificity=[number,number,number];
function specificity(selector:string):Specificity{
 const total:Specificity=[0,0,0];
 for(const compound of compounds(selector)){
  const s=simple(compound);
  total[0]+=s.ids.length;total[1]+=s.classes.length+s.attributes.length;total[2]+=(s.tag?1:0)+(s.pseudoElement?1:0);
  for(const name of s.pseudoClasses)if(!['is','not','where','has','matches'].includes(name))total[1]++;
  for(const argument of s.args){const [name,inner]=[argument.slice(0,argument.indexOf('|')),argument.slice(argument.indexOf('|')+1)];if(name==='where')continue;const best=selectorList(inner).map(specificity).sort(compare).at(-1)!;total[0]+=best[0];total[1]+=best[1];total[2]+=best[2]}
 }
 return total;
}
const compare=(a:Specificity,b:Specificity)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
const subject=(selector:string)=>simple(compounds(selector).at(-1)!);
/** Header, navigation and footer elements are styled by the chrome even through type selectors. */
const chromeTags=new Set(['header','nav','footer']);
/** Element-level rule: types, `*`, pseudo-classes without arguments, optionally under the root theme attribute. */
function elementLevel(selector:string){
 const parts=compounds(selector);
 return parts.every((compound,index)=>{
  if(index===0&&/^(:root|html)?\[data-theme=["']?dark["']?\]$/.test(compound))return true;
  const s=simple(compound);
  return !s.ids.length&&!s.classes.length&&!s.attributes.length&&!s.args.length&&!chromeTags.has(s.tag||'')&&(compound===':root'||!s.pseudoClasses.includes('root')||parts.length===1);
 });
}
/** Group of a selector: the right-most class that only one group of components writes (a kit element styled in a page
 * context belongs to that page); otherwise the kit. Ids (`#app`, `#main`) belong to the chrome. */
function selectorGroup(selector:string):Group{
 const parts=compounds(selector).map(simple);
 let sawClass=false;
 for(let index=parts.length-1;index>=0;index--){
  for(const name of parts[index].classes){sawClass=true;const set=classGroups(name);if(set.size===1&&!set.has('kit'))return [...set][0]}
 }
 if(!sawClass&&parts.some(part=>part.ids.length||chromeTags.has(part.tag||'')))return 'chrome';
 if(!sawClass){
  // Only classes nested in :has()/:is(): use them.
  const nested=[...selector.matchAll(/\.((?:\\.|[\w-])+)/g)].map(match=>classGroups(match[1])).filter(set=>set.size);
  const all=[...new Set(nested.flatMap(set=>[...set]))];if(all.length===1)return all[0];
 }
 return 'kit';
}

// ---------- units ----------
interface Unit {index:number;source:string;media:string|null;node:Rule|AtRule;comments:Comment[];group:Group;reason:string}
const units:Unit[]=[];
for(const source of sources){
 const css=execFileSync('git',['show',`${ref}:${source}`],{encoding:'utf8'});
 const tree=postcss.parse(css,{from:source});let pending:Comment[]=[];
 const push=(node:Rule|AtRule,media:string|null)=>{units.push({index:units.length,source,media,node,comments:pending,group:'kit',reason:''});pending=[]};
 tree.each(node=>{
  if(node.type==='comment'){pending.push(node);return}
  if(node.type==='atrule'&&['layer','import','source'].includes(node.name))return;
  if(node.type==='atrule'&&node.name==='media'){
   const params=node.params.trim();
   node.each(child=>{if(child.type==='comment'){pending.push(child);return}if(child.type!=='rule')throw new Error('Unexpected '+child.type+' in @media');push(child,params)});
   return;
  }
  if(node.type==='rule'||node.type==='atrule'){push(node as Rule|AtRule,null);return}
  throw new Error('Unexpected node '+node.type);
 });
}

const isRule=(unit:Unit):unit is Unit&{node:Rule}=>unit.node.type==='rule';
const declarations=(unit:Unit)=>isRule(unit)?unit.node.nodes.filter((node):node is Declaration=>node.type==='decl'):[];
/** Two declarations compete when they set a common longhand (shorthands, logical and physical properties). */
const logical:Record<string,string>={'inline-size':'width','block-size':'height','min-inline-size':'min-width','min-block-size':'min-height','max-inline-size':'max-width','max-block-size':'max-height'};
const notReset:Record<string,string[]>={border:['border-radius','border-collapse','border-spacing'],outline:['outline-offset'],flex:['flex-direction','flex-wrap','flex-flow'],font:['font-feature-settings','font-synthesis','font-display'],background:['background-blend-mode'],text:[],grid:['grid-gap','grid-row-gap','grid-column-gap'],mask:[]};
const special:Record<string,string[]>={inset:['top','right','bottom','left'],gap:['row-gap','column-gap','grid-gap','grid-row-gap','grid-column-gap'],'place-items':['align-items','justify-items'],'place-content':['align-content','justify-content'],'place-self':['align-self','justify-self'],columns:['column-count','column-width'],'flex-flow':['flex-direction','flex-wrap'],'grid-gap':['row-gap','column-gap']};
function normal(property:string){const bare=property.replace(/^-webkit-|^-moz-/,'');return logical[bare]||bare}
function covers(shorthand:string,longhand:string){
 if(special[shorthand]?.includes(longhand))return true;
 if(!longhand.startsWith(shorthand+'-'))return false;
 return !(notReset[shorthand]||[]).some(name=>longhand===name||longhand.startsWith(name+'-'));
}
const box=/^(margin|padding|inset|border|scroll-margin|scroll-padding)(-|$)/;
function competes(a:string,b:string){
 if(a.startsWith('--')||b.startsWith('--'))return a===b;
 if(a==='all'||b==='all')return true;
 const x=normal(a),y=normal(b);
 if(x===y||covers(x,y)||covers(y,x))return true;
 // Logical box sides map to physical ones depending on the writing mode: treat them as competing.
 const bx=box.exec(x)?.[1],by=box.exec(y)?.[1];
 if(bx&&bx===by&&(/inline|block/.test(x)||/inline|block/.test(y))&&!/radius/.test(x+y))return true;
 if(/^(top|right|bottom|left)$/.test(x)&&/^inset-/.test(y)||/^(top|right|bottom|left)$/.test(y)&&/^inset-/.test(x))return true;
 return false;
}
// Classification.
for(const unit of units){
 if(!isRule(unit)){
  if(unit.node.type==='atrule'&&(unit.node as AtRule).name==='keyframes'){unit.reason='keyframes';continue}
  unit.group='kit';unit.reason='at-rule';continue;
 }
 const selectors=selectorList(unit.node.selector);
 if(selectors.every(elementLevel)&&!declarations(unit).some(decl=>decl.important)){unit.group='base';unit.reason='element-level';continue}
 const found=new Set(selectors.map(selectorGroup));
 unit.group=found.size===1?[...found][0]:'kit';unit.reason=found.size===1?'selector':'mixed:'+[...found].join('+');
}
// Keyframes follow the rules that use them.
for(const unit of units.filter(unit=>unit.reason==='keyframes')){
 const name=(unit.node as AtRule).params.trim();
 const users=new Set(units.filter(other=>declarations(other).some(decl=>/^(-webkit-)?animation(-name)?$/.test(decl.prop)&&new RegExp(`(^|[\\s,])${name}([\\s,]|$)`).test(decl.value))).map(other=>other.group==='base'?'kit':other.group));
 unit.group=users.size===1?[...users][0] as Group:'kit';
}

// ---------- cascade guards ----------
interface Facts {selectors:{text:string;specificity:Specificity;subject:Simple;contexts:Group[]}[];properties:Map<string,boolean>}
const facts=new Map<Unit,Facts>();
const single=(name:string)=>{const set=classGroups(name);return set.size===1&&!set.has('kit')?[...set][0]:null};
/** Groups of the ancestor compounds that pin the element to one component group. */
const contexts=(selector:string)=>compounds(selector).slice(0,-1).flatMap(compound=>simple(compound).classes.map(single).filter((group):group is Group=>Boolean(group)));
for(const unit of units.filter(isRule))facts.set(unit,{selectors:selectorList(unit.node.selector).map(text=>({text,specificity:specificity(text),subject:subject(text),contexts:contexts(text)})),properties:new Map(declarations(unit).map(decl=>[decl.prop,decl.important]))});
const together=used.together;
function classMatches(name:string,token:string){return token.endsWith('*')?prefixMatches(name,token.slice(0,-1)):name===token}
/** Tags an element carrying this class can have ('?' when unknown). */
const tagCache=new Map<string,Set<string>>();
function tagsOf(name:string){if(!tagCache.has(name))tagCache.set(name,computeTags(name));return tagCache.get(name)!}
function computeTags(name:string){const found=new Set<string>();for(const [token,set] of used.tags)if(classMatches(name,token))for(const tag of set)found.add(tag);return found}
const isRoot=(s:Simple)=>s.pseudoClasses.includes('root')||s.tag==='html';
const focusable=new Set(['a','button','input','select','textarea','summary','details','dialog','iframe','?']);
const canFocus=(tag:string)=>tag.endsWith('!')||focusable.has(tag);
function maySameElement(a:Simple,b:Simple){
 if((a.pseudoElement||'')!==(b.pseudoElement||''))return false;
 if(isRoot(a)||isRoot(b))return (isRoot(a)||(!a.classes.length&&!a.tag))&&(isRoot(b)||(!b.classes.length&&!b.tag));
 if(a.tag&&b.tag&&a.tag!==b.tag)return false;
 if(a.ids.length&&b.ids.length&&a.ids.join()!==b.ids.join())return false;
 // A class never written by a component (dead rule) matches nothing.
 const known=(name:string)=>classGroups(name).size>0;
 if(![...a.classes,...b.classes].every(known))return false;
 for(const [tagged,other] of [[a,b],[b,a]] as const)if(tagged.tag&&other.classes.length&&other.classes.every(name=>{const tags=tagsOf(name);return !tags.has('?')&&![...tags].some(tag=>tag.replace('!','')===tagged.tag)}))return false;
 // :focus / :focus-visible only match focusable elements.
 for(const [focused,other] of [[a,b],[b,a]] as const)if(focused.pseudoClasses.some(name=>name==='focus'||name==='focus-visible')&&other.classes.some(name=>{const tags=tagsOf(name);return tags.size>0&&![...tags].some(canFocus)}))return false;
 if(!a.classes.length||!b.classes.length)return true;
 if(a.classes.some(name=>b.classes.includes(name)))return true;
 return together.some(tokens=>a.classes.every(name=>[...tokens].some(token=>classMatches(name,token)))&&b.classes.every(name=>[...tokens].some(token=>classMatches(name,token))));
}
/** Families declared by both rules with the same importance (otherwise importance alone decides, in both cascades). */
type Selector=Facts['selectors'][number];
const nests=(outer:Group,inner:Group)=>contains.get(outer)!.has(inner);
/** Both selectors may match one element: compatible subjects and ancestor contexts that can be nested. */
const pageRoot=(name:string)=>{const tags=tagsOf(name);return tags.size>0&&[...tags].every(tag=>tag.replace('!','')==='main')};
const allClasses=(selector:string)=>compounds(selector).flatMap(compound=>simple(compound).classes);
/** The header and the footer (chrome) are never inside a page's <main>. */
function chromeInsideMain(a:Selector,b:Selector){
 const roots=compounds(a.text).slice(0,-1).flatMap(compound=>simple(compound).classes).filter(pageRoot);
 return roots.length>0&&allClasses(b.text).some(name=>single(name)==='chrome');
}
function compatible(a:Selector,b:Selector){
 if(!maySameElement(a.subject,b.subject))return false;
 if(chromeInsideMain(a,b)||chromeInsideMain(b,a))return false;
 for(const ga of a.contexts)for(const gb of b.contexts)if(!nests(ga,gb)&&!nests(gb,ga))return false;
 for(const [x,y] of [[a,b],[b,a]] as const){const own=x.subject.classes.map(single).filter((group):group is Group=>Boolean(group));for(const context of y.contexts)for(const group of own)if(!nests(context,group))return false}
 return true;
}
function sharedFamilies(a:Unit,b:Unit){const pa=facts.get(a)!.properties,pb=facts.get(b)!.properties;return [...pa].filter(([name,important])=>[...pb].some(([other,otherImportant])=>important===otherImportant&&competes(name,other))).map(([name])=>name)}
/** Could `later` (in original order) and `earlier` compete where only their order decides? */
/** A rule naming a class that no component writes cannot match (dead rule kept as is, see the plan). */
const deadCache=new Map<Unit,boolean>();
const dead=(unit:Unit)=>{if(!deadCache.has(unit))deadCache.set(unit,isDead(unit));return deadCache.get(unit)!};
const isDead=(unit:Unit)=>facts.get(unit)!.selectors.every(selector=>compounds(selector.text).some(compound=>simple(compound).classes.some(name=>!classGroups(name).size)));
function orderMatters(earlier:Unit,later:Unit){
 if(dead(earlier)||dead(later))return false;
 if(!sharedFamilies(earlier,later).length)return false;
 for(const a of facts.get(earlier)!.selectors)for(const b of facts.get(later)!.selectors)if(compare(a.specificity,b.specificity)===0&&compatible(a,b))return true;
 return false;
}
/** A base rule used to beat this component rule (higher specificity on a shared property); in a lower layer it would lose. */
function baseUsedToWin(base:Unit,component:Unit){
 if(dead(component))return false;
 if(!sharedFamilies(base,component).length)return false;
 for(const a of facts.get(base)!.selectors)for(const b of facts.get(component)!.selectors){const order=compare(a.specificity,b.specificity);if((order>0||(order===0&&base.index>component.index))&&compatible(a,b))return true}
 return false;
}
const ruleUnits=units.filter(isRule),moves:string[]=[];
for(let changed=true;changed;){
 changed=false;
 for(const unit of ruleUnits.filter(unit=>unit.group==='base')){
  const rival=ruleUnits.find(other=>other.group!=='base'&&baseUsedToWin(unit,other));
  if(rival){unit.group='kit';unit.reason='base-conflict with '+rival.node.selector.slice(0,60);moves.push(`${unit.node.selector} -> kit (beats ${rival.node.selector})`);changed=true}
 }
 for(let i=0;i<ruleUnits.length;i++){
  const earlier=ruleUnits[i];if(earlier.group==='base')continue;
  for(let j=i+1;j<ruleUnits.length;j++){
   const later=ruleUnits[j];if(later.group==='base'||rank(later.group)>=rank(earlier.group))continue;
   if(orderMatters(earlier,later)){moves.push(`${later.node.selector} : ${later.group} -> ${earlier.group} (after ${earlier.node.selector})`);later.group=earlier.group;later.reason='follows '+earlier.node.selector.slice(0,60);changed=true}
  }
 }
}

// ---------- output ----------
const summary=groups.map(group=>`${group}: ${units.filter(unit=>unit.group===group).length}`).join(', ');
console.log(`${units.length} units (${summary}); ${moves.length} cascade moves`);
if(check){for(const move of moves)console.log('  '+move);for(const unit of units)console.log(`${unit.group.padEnd(12)} ${unit.reason.padEnd(14).slice(0,40)} ${unit.media?'@media'+unit.media+' ':''}${isRule(unit)?unit.node.selector:'@'+(unit.node as AtRule).name+' '+(unit.node as AtRule).params}`);process.exit(0)}
const headers:Record<Group,string>={
 base:'Reset, :root and dark variables. Imported in @layer base.',
 kit:'Shared kit (buttons, panels, woodland frame, avatars, runners). Imported in @layer components.',
 chrome:'Header, navigation, account menu and footer. Imported in @layer components.',
 home:'Home scene (lot A). Imported in @layer components.',
 how:'How to play and information pages (lot A). Imported in @layer components.',
 account:'Sign in, sign up, account settings and statistics (lot A). Imported in @layer components.',
 expeditions:'Race browser (lot A). Imported in @layer components.',
 lobby:'Lobby, room creation and quick join (lot B). Imported in @layer components.',
 race:'Race track and typing area (lot C). Imported in @layer components.',
 results:'Podium, results and history (lot C). Imported in @layer components.',
};
mkdirSync(resolve(root,out),{recursive:true});
const clean=(node:ChildNode)=>{const copy=node.clone();copy.raws.before='';if(copy.type==='rule'||copy.type==='atrule')copy.raws.after='';return copy};
for(const group of groups){
 const lines=[`/* ${headers[group]} Generated by scripts/css-split.ts from the legacy sheets; rule order is the original order. */`];
 let media:string|null=null;
 for(const unit of units.filter(unit=>unit.group===group)){
  if(unit.media!==media&&media!==null){lines.push('}');media=null}
  for(const comment of unit.comments)lines.push(clean(comment).toString());
  if(unit.reason.startsWith('follows ')||unit.reason.startsWith('base-conflict'))lines.push(`${media?' ':''}/* split: ${unit.reason.startsWith('follows ')?'kept after '+unit.reason.slice(8)+' (same specificity, original order)':'not in base: '+unit.reason.slice(14)} */`);
  if(unit.media!==media){lines.push(`@media ${unit.media}{`);media=unit.media}
  lines.push((media?' ':'')+clean(unit.node).toString());
 }
 if(media!==null)lines.push('}');
 writeFileSync(join(resolve(root,out),group+'.css'),lines.join('\n')+'\n');
}
