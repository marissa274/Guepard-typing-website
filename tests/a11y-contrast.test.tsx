import type React from 'react';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {act,render} from '@testing-library/react';
import {jest,expect,test,describe} from '@jest/globals';
import {SiteProvider} from '../src/components/SiteContext';
import {Header,Footer} from '../src/components/Chrome';

jest.mock('../src/services/auth',()=>({...jest.requireActual<object>('../src/services/auth'),authService:{current:jest.fn(async()=>({user:null})),logout:jest.fn(async()=>({user:null}))}}));
jest.mock('../src/services/results',()=>({resultService:{list:jest.fn(async()=>({results:[],summary:null,total:0,progression:[]}))}}));
const mockNavigation={path:'/'};
jest.mock('next/navigation',()=>({usePathname:()=>mockNavigation.path,useRouter:()=>({push:jest.fn(),replace:jest.fn()}),useSearchParams:()=>new URLSearchParams()}));
jest.mock('next/link',()=>({__esModule:true,default:({children,href,...props}:{children:React.ReactNode;href:string})=><a href={href} {...props}>{children}</a>}));
jest.mock('next/image',()=>({__esModule:true,default:()=>null}));

const root=join(__dirname,'..');
const read=(file:string)=>readFileSync(join(root,file),'utf8');
const theme=read('app/globals.css');
const token=(name:string)=>{const match=theme.match(new RegExp('--color-'+name+':(#[0-9a-fA-F]{6,8})'));if(!match)throw new Error('missing token '+name);return match[1]};
const channel=(hex:string,index:number)=>{const value=parseInt(hex.slice(1+index*2,3+index*2),16)/255;return value<=.03928?value/12.92:Math.pow((value+.055)/1.055,2.4)};
const luminance=(hex:string)=>.2126*channel(hex,0)+.7152*channel(hex,1)+.0722*channel(hex,2);
/** Contrast of a colour against a background known by its relative luminance (worst pixel measured on the built page). */
const ratioOnLuminance=(foreground:string,background:number)=>{const own=luminance(foreground);return (Math.max(own,background)+.05)/(Math.min(own,background)+.05)};

describe('A11Y-01 · new colour tokens reach 4.5:1 on the surfaces measured in the audit',()=>{
 // Luminance of the worst background pixel measured on the built pages (page sampler and element sampler of the audit).
 test.each([
  ['entry-title',.55],['woodland-back',.55],['woodland-back',.49],
  ['settings-access',.67],['launch-note',.85],['lane-label',.8],
 ] as const)('token %s on a background of luminance %s',(name,background)=>{
  expect(ratioOnLuminance(token(name),background)).toBeGreaterThanOrEqual(4.5);
 });
 test('the dark podium plaque is dark enough for the cream title',()=>{
  expect(ratioOnLuminance('#fff1cf',luminance(token('results-veil').slice(0,7)))).toBeGreaterThanOrEqual(7);
 });
 test('the old low-contrast greens are gone from the components',()=>{
  const sources=['src/components/lobby/Lobby.tsx','src/components/lobby/VisualRace.tsx','src/components/AnimalAvatar.tsx'].map(read).join('\n');
  for(const hex of ['#746b49','#6c7753','#657344','#526b45'])expect(sources).not.toContain(hex);
 });
 test('every new colour is a theme token, not a raw hex in a component',()=>{
  const entry=read('src/components/lobby/room-styles.ts');
  expect(entry).toContain('text-entry-title');
  expect(read('src/components/lobby/Lobby.tsx')).toContain('text-settings-access');
  expect(read('src/components/lobby/VisualRace.tsx')).toContain('text-lane-label');
 });
 test('light fields in the dark theme use the light-field placeholder colour',()=>{
  expect(read('src/components/JoinByCode.tsx')).toContain('dark:[&_input::placeholder]:text-placeholder');
 });
});

async function mount(path:string){
 mockNavigation.path=path;
 const view=render(<SiteProvider><Header/><Footer/></SiteProvider>);
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0))});
 return view;
}

describe('A11Y-01 · footer and header',()=>{
 test('the current footer link is cream (the yellow measured 3.9:1 on the green)',async()=>{
  const {container}=await mount('/how');
  const current=container.querySelector('footer a[aria-current="page"]') as HTMLElement;
  expect(current.className).toContain('aria-[current=page]:text-cream');
  expect(current.className).not.toContain('text-sun');
 });
});
