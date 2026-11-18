import type React from 'react';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {jest,expect,test,afterEach,describe} from '@jest/globals';
import {SiteProvider} from '../src/components/SiteContext';
import Site,{pageTitle} from '../src/components/Site';
import {copy} from '../src/i18n';
import {authService} from '../src/services/auth';

jest.mock('../src/services/auth',()=>({...jest.requireActual<object>('../src/services/auth'),authService:{current:jest.fn(async()=>({user:null})),logout:jest.fn(async()=>({user:null}))}}));
jest.mock('../src/services/results',()=>({resultService:{list:jest.fn(async()=>({results:[],summary:null,total:0,progression:[]}))}}));
const mockNavigation={path:'/'};
jest.mock('next/navigation',()=>({usePathname:()=>mockNavigation.path,useRouter:()=>({push:jest.fn(),replace:jest.fn()}),useSearchParams:()=>new URLSearchParams()}));
jest.mock('next/link',()=>({__esModule:true,default:({children,href,...props}:{children:React.ReactNode;href:string})=><a href={href} {...props}>{children}</a>}));
afterEach(()=>{document.cookie='guepard-lang=; Max-Age=0; Path=/';document.documentElement.lang='fr'});
/** Renders the site and waits for the lazily loaded view and the account request to settle. */
async function mount(path='/'){mockNavigation.path=path;const view=render(<SiteProvider><Site/></SiteProvider>);await waitFor(()=>expect(view.container.querySelector('main')).not.toBeNull());await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0))});return view}

describe('A11Y-02 · page structure',()=>{
 test('a skip link is the first focusable element and targets the focusable main region',async()=>{
  const {container}=await mount('/how');
  const skip=container.querySelector('a');
  expect(skip?.textContent).toBe('Aller au contenu principal');expect(skip?.getAttribute('href')).toBe('#main');
  const main=container.querySelector('main#main') as HTMLElement;
  expect(main).not.toBeNull();expect(main.tabIndex).toBe(-1);
  expect([...container.querySelector('#app')!.children].map(element=>element.tagName)).toEqual(['HEADER','MAIN','FOOTER']);
 });
 test('the current page is exposed with aria-current in the navigation',async()=>{
  await mount('/how');
  const nav=screen.getByRole('navigation',{name:'Navigation'});
  expect(within(nav).getByRole('link',{name:'Comment jouer'}).getAttribute('aria-current')).toBe('page');
  expect(within(nav).getByRole('link',{name:'Accueil'}).hasAttribute('aria-current')).toBe(false);
  expect(within(nav).getByRole('link',{name:'Parcourir les courses'}).hasAttribute('aria-current')).toBe(false);
 });
 test('the home page has exactly one h1',async()=>{
  await mount('/');
  expect(screen.getAllByRole('heading',{level:1})).toHaveLength(1);
 });
 test('each view sets a localised document title',async()=>{
  await mount('/how');
  await waitFor(()=>expect(document.title).toBe('Comment jouer · GUÉPARD'));
  fireEvent.click(screen.getByRole('button',{name:'Choisir la langue : FR'}));
  await waitFor(()=>expect(document.title).toBe('How to play · GUÉPARD'));
  expect(pageTitle('/',copy.fr)).toBe(copy.fr.metaTitle);
  expect(pageTitle('/lobby/abc',copy.en)).toBe('Race lobby · GUÉPARD');
  expect(pageTitle('/privacy',copy.fr)).toBe('Politique de confidentialité · GUÉPARD');
  expect(pageTitle('/nowhere',copy.en)).toBe('This trail does not exist. · GUÉPARD');
 });
});

describe('A11Y-03 · control names',()=>{
 test('language and theme buttons describe their current state',async()=>{
  await mount('/how');
  const theme=screen.getByRole('button',{name:'Passer au thème sombre'});
  fireEvent.click(theme);
  expect(screen.getByRole('button',{name:'Passer au thème clair'})).toBe(theme);
  expect(screen.getByRole('button',{name:'Choisir la langue : FR'}).textContent).toContain('FR');
 });
});

describe('A11Y-04 · account menu',()=>{
 test('Escape closes the account menu and returns focus to its summary; an outside click closes it too',async()=>{
  jest.mocked(authService.current).mockResolvedValueOnce({user:{id:'u1',username:'Jungle',avatar:'cheetah'}} as never);
  const {container}=await mount('/how');
  const summary=await screen.findByText('Jungle');
  const menu=container.querySelector('details.account') as HTMLDetailsElement;
  menu.open=true;const settings=within(menu).getByRole('button',{name:'Paramètres'});act(()=>settings.focus());
  fireEvent.keyDown(settings,{key:'Escape'});
  expect(menu.open).toBe(false);expect(document.activeElement).toBe(summary.closest('summary'));
  menu.open=true;fireEvent.pointerDown(container.querySelector('main')!);
  expect(menu.open).toBe(false);
 });
});
