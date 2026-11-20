import type React from 'react';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {act,render,screen,waitFor} from '@testing-library/react';
import {jest,expect,test,describe} from '@jest/globals';
import {SiteProvider} from '../src/components/SiteContext';
import {Header,Footer} from '../src/components/Chrome';
import {authService} from '../src/services/auth';

jest.mock('../src/services/auth',()=>({...jest.requireActual<object>('../src/services/auth'),authService:{current:jest.fn(async()=>({user:null})),logout:jest.fn(async()=>({user:null}))}}));
jest.mock('../src/services/results',()=>({resultService:{list:jest.fn(async()=>({results:[],summary:null,total:0,progression:[]}))}}));
const mockNavigation={path:'/'};
jest.mock('next/navigation',()=>({usePathname:()=>mockNavigation.path,useRouter:()=>({push:jest.fn(),replace:jest.fn()}),useSearchParams:()=>new URLSearchParams()}));
jest.mock('next/link',()=>({__esModule:true,default:({children,href,...props}:{children:React.ReactNode;href:string})=><a href={href} {...props}>{children}</a>}));
jest.mock('next/image',()=>({__esModule:true,default:()=>null}));

const root=join(__dirname,'..');
const read=(file:string)=>readFileSync(join(root,file),'utf8');
const theme=read('app/globals.css');

async function mount(path:string){
 mockNavigation.path=path;
 const view=render(<SiteProvider><Header/><Footer/></SiteProvider>);
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0))});
 return view;
}

describe('DES-06 · header on narrow screens',()=>{
 test('under 450 px the language button drops its glyph so the guest controls fit in 320 px (L1)',async()=>{
  await mount('/');
  const button=screen.getByRole('button',{name:/passer en anglais/i});
  const glyphs=[...button.querySelectorAll('span[aria-hidden="true"]')];
  expect(glyphs).toHaveLength(1);
  for(const glyph of glyphs)expect(glyph.className).toContain('upto-450:hidden');
 });
 test('a long account name is truncated instead of cut in the middle of a word (L3)',async()=>{
  jest.mocked(authService.current).mockResolvedValueOnce({user:{id:'u1',username:'UnPseudoVraimentTresLong24',avatar:'cheetah'}} as never);
  await mount('/');
  const name=await waitFor(()=>screen.getByText('UnPseudoVraimentTresLong24'));
  expect(name.className).toContain('truncate');
  expect(name.getAttribute('title')).toBe('UnPseudoVraimentTresLong24');
 });
 test('the navigation compacts from 1370 px, where the French connected header overflowed (L2)',()=>{
  expect(theme).toContain('@custom-variant upto-1370 (@media (max-width:1370px))');
  expect(theme.indexOf('upto-1370')).toBeLessThan(theme.indexOf('@custom-variant upto-1250'));
  const chrome=read('src/components/Chrome.tsx');
  expect(chrome).toContain('upto-1370:px-10');
  expect(chrome).toContain('upto-1370:text-[15px]');
 });
 test('the guest identity chip on /races no longer breaks words anywhere (L3)',()=>{
  const races=read('src/components/Races.tsx');
  expect(races).not.toContain('wrap-anywhere');
  expect(races).toContain('min-w-0 truncate');
 });
});
