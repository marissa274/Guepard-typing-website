import type React from 'react';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative} from 'node:path';
import {render,screen} from '@testing-library/react';
import {jest,expect,test,describe,beforeEach} from '@jest/globals';
import {copy} from '../src/i18n';
import {gameCopy} from '../src/i18n/game';
import {howCopy} from '../src/i18n/how';
import {accountCopy,authCopy,authMessage} from '../src/i18n/account';
import {roomCopy} from '../src/lib/room-copy';
import {formatDate,formatDateTime,formatNumber,formatOptionalPercent,formatPadded,formatPercent,formatSeconds} from '../src/i18n/format';
import RaceResults from '../src/components/lobby/RaceResults';
import {defaultSettings,type RoomView} from '../src/lib/room-types';

const mockSite={fr:true,state:{lang:'fr',user:false,results:[]},save:jest.fn()};
jest.mock('../src/components/SiteContext',()=>({useSite:()=>mockSite}));
jest.mock('next/navigation',()=>({useRouter:()=>({push:jest.fn()}),useSearchParams:()=>new URLSearchParams('view=results')}));
jest.mock('next/link',()=>({__esModule:true,default:({children,href}:{children:React.ReactNode;href:string})=><a href={href}>{children}</a>}));
jest.mock('../src/services/results',()=>({resultService:{detail:jest.fn(()=>Promise.reject(new Error('offline')))}}));

/** Normalises the narrow and regular no-break spaces produced by Intl so assertions stay readable. */
const plain=(value:string|null|undefined)=>(value||'').replace(/[\u00a0\u202f]/g,' ');

function shape(value:unknown):unknown{
 if(Array.isArray(value))return value.map(shape);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,entry])=>[key,shape(entry)]));
 return typeof value;
}

describe('I18N-01 · centralised labels',()=>{
 test.each([
  ['site',copy.fr,copy.en],
  ['game',gameCopy.fr,gameCopy.en],
  ['how to play',howCopy.fr,howCopy.en],
  ['rooms',roomCopy(true),roomCopy(false)],
  ['account',accountCopy.fr,accountCopy.en],
  ['auth',authCopy.fr,authCopy.en],
 ])('%s catalogue has the same keys in French and English',(_name,french,english)=>{
  expect(shape(english)).toEqual(shape(french));
 });

 test('validation keys resolve to localised auth messages',()=>{
  expect(authMessage(authCopy.fr,'mismatch')).toBe('Les mots de passe ne correspondent pas.');
  expect(authMessage(authCopy.en,'mismatch')).toBe('The passwords do not match.');
  expect(authMessage(authCopy.en,'unknown-key')).toBe('unknown-key');
 });

 const root=join(__dirname,'..');
 const sources=(directory:string):string[]=>readdirSync(directory).flatMap(entry=>{const path=join(directory,entry);return statSync(path).isDirectory()?sources(path):/\.tsx?$/.test(entry)?[path]:[]});
 const files=[...sources(join(root,'src','components')),...sources(join(root,'app'))];
 // `fr?'fr':'en'` selects a catalogue and is allowed; any other quoted branch is an inline label.
 const inlineTernary=/\b(?:fr|lang\s*===?\s*(['"])fr\1)\s*\?\s*\(?\s*(['"`])(?!(?:fr|en)\2)/;
 const localCatalogue=/\bfr\s*:\s*\{|\bfr\s*:\s*['"`]/;

 test.each(files.map(file=>[relative(root,file),file]))('%s has no inline bilingual label',(_name,file)=>{
  const source=readFileSync(file,'utf8');
  expect(source).not.toMatch(inlineTernary);
  expect(source).not.toMatch(localCatalogue);
 });

 test.each(files.map(file=>[relative(root,file),file]))('%s formats dates and percentages through Intl helpers',(_name,file)=>{
  const source=readFileSync(file,'utf8');
  expect(source).not.toMatch(/toLocale(?:Date|Time)?String\(/);
  // Display percentages are written « 80 % »; CSS values such as `left:x+'%'` have no space and stay allowed.
  expect(source).not.toMatch(/\+\s*['"] %['"]|\} %<|\} %`/);
  expect(source).not.toMatch(/\+\s*['"] s['"]|\} s</);
 });
});

describe('I18N-03 · Intl formatting',()=>{
 test('numbers use the active language separators',()=>{
  expect(plain(formatNumber('fr',1234.56))).toBe('1 234,6');
  expect(formatNumber('en',1234.56)).toBe('1,234.6');
  expect(formatPadded('fr',3)).toBe('03');
  expect(formatPadded('en',12)).toBe('12');
 });
 test('percentages follow French and English typography',()=>{
  expect(plain(formatPercent('fr',95))).toBe('95 %');
  expect(formatPercent('en',95)).toBe('95%');
  expect(formatOptionalPercent('en',null)).toBe('—');
  expect(formatOptionalPercent('fr',undefined)).toBe('—');
 });
 test('durations are expressed in seconds with the language unit',()=>{
  expect(plain(formatSeconds('fr',12.5))).toBe('12,5 s');
  expect(formatSeconds('en',12.5)).toBe('12.5 sec');
  expect(plain(formatSeconds('fr',12.4,0))).toBe('12 s');
 });
 test('dates follow the language calendar conventions',()=>{
  const date=new Date(2026,0,5,14,3,9);
  expect(formatDate('fr',date)).toBe('05/01/2026');
  expect(formatDate('en',date)).toBe('1/5/2026');
  expect(plain(formatDateTime('fr',date))).toBe('05/01/2026 14:03:09');
  expect(plain(formatDateTime('en',date))).toBe('1/5/2026, 2:03:09 PM');
 });
});

describe('I18N-03 · race results use the active language',()=>{
 const start=1_700_000_000_000;
 const room={id:'intl',name:'La jungle',me:'a',hostId:'a',code:'ABCDEF',animal:'cheetah',createdAt:start,revision:1,isHost:true,players:1,startedAt:start,endedAt:start+61500,serverNow:start+61500,phase:'finished',settings:defaultSettings,text:'Le guépard suit la rivière.',people:[{id:'a',name:'Alex',role:'player',kind:'guest',animal:'cheetah',late:false,seen:start,progress:20,typed:25,errors:5,abandoned:false,finishedAt:start+61500}]} as unknown as RoomView;
 beforeEach(()=>{sessionStorage.clear()});
 test('French results show French separators and units',()=>{
  mockSite.fr=true;mockSite.state.lang='fr';
  render(<RaceResults room={room}/>);
  expect(screen.getByText('61,5 s')).toBeTruthy();
  expect(screen.getAllByText('80 %').length).toBeGreaterThan(0);
  expect(screen.getByRole('columnheader',{name:'Précision'})).toBeTruthy();
  expect(screen.getAllByRole('img',{name:'Guépard'}).length).toBeGreaterThan(0);
 });
 test('English results show English separators and units',()=>{
  mockSite.fr=false;mockSite.state.lang='en';
  render(<RaceResults room={room}/>);
  expect(screen.getByText('61.5 sec')).toBeTruthy();
  expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
  expect(screen.getByRole('columnheader',{name:'Accuracy'})).toBeTruthy();
  expect(screen.getAllByRole('img',{name:'Cheetah'}).length).toBeGreaterThan(0);
 });
});
