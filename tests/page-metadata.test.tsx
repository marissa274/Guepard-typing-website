import {jest,expect,test,describe} from '@jest/globals';
import {copy} from '../src/i18n';
import {pageTitle} from '../src/lib/page-title';

const mockPreferences=jest.fn<()=>Promise<{lang:'fr'|'en';dark:boolean}>>();
jest.mock('../src/lib/preferences',()=>({preferences:()=>mockPreferences()}));
jest.mock('../src/components/Site',()=>({__esModule:true,default:()=>null}));
jest.mock('next/navigation',()=>({notFound:jest.fn()}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {generateMetadata}=require('../app/[[...path]]/page') as typeof import('../app/[[...path]]/page');

const metadata=(path?:string[])=>generateMetadata({params:Promise.resolve({path})});

describe('A11Y-02 · the server renders the document title of each view in the request language',()=>{
 test('direct loads get the localised title of their page',async()=>{
  mockPreferences.mockResolvedValue({lang:'fr',dark:false});
  expect((await metadata(['how'])).title).toBe('Comment jouer · GUÉPARD');
  expect((await metadata(['races'])).title).toBe(pageTitle('/races',copy.fr));
  expect((await metadata(['lobby','ABC123'])).title).toBe('Salon de course · GUÉPARD');
  expect((await metadata(undefined)).title).toBe(copy.fr.metaTitle);
 });
 test('the language of the cookie decides, not French by default',async()=>{
  mockPreferences.mockResolvedValue({lang:'en',dark:false});
  expect((await metadata(['how'])).title).toBe('How to play · GUÉPARD');
  expect((await metadata(['privacy'])).title).toBe('Privacy policy · GUÉPARD');
  expect((await metadata(['nowhere'])).title).toBe(pageTitle('/nowhere',copy.en));
 });
 test('login and signup titles follow the request language and match the client title',async()=>{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const login=require('../app/login/page') as typeof import('../app/login/page');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const signup=require('../app/signup/page') as typeof import('../app/signup/page');
  mockPreferences.mockResolvedValue({lang:'en',dark:false});
  expect((await login.generateMetadata()).title).toBe(pageTitle('/login',copy.en));
  expect((await signup.generateMetadata()).title).toBe(pageTitle('/signup',copy.en));
  expect((await login.generateMetadata()).title).not.toMatch(/Connexion/);
  mockPreferences.mockResolvedValue({lang:'fr',dark:false});
  expect((await login.generateMetadata()).title).toBe(pageTitle('/login',copy.fr));
  expect((await signup.generateMetadata()).title).toBe(pageTitle('/signup',copy.fr));
 });
});
