import {expect,request,type Page} from '@playwright/test';
import {closeRoom,configureShortRace,createTestRoom,openLobby,roomCommand,sendProgress,waitForRace} from '../e2e/helpers';
import type {RoomView} from '../../src/lib/room-types';

/**
 * Visual non-regression states shared by the screenshot and computed-style specs (TECH-03, lot 0).
 * Every state runs against a production build (`npm run build`). Pages that do not need the database are
 * visited directly; the signed-in chrome is answered by the browser; the lobby and the race are seen by a
 * guest who joined a room opened by a fixed host account (PostgreSQL required, see playwright.visual.config.ts).
 */
export type Theme='light'|'dark';
export interface Viewport {width:number;height:number}
interface Scenario {
 /** Navigates and prepares the page; returns a cleanup callback when server state was created. */
 open:(page:Page)=>Promise<(()=>Promise<void>)|void>;
 /** Elements whose content is generated at run time (codes, clocks, positions). */
 masks?:string[];
 viewports:Viewport[];
 /** Screenshot of this element only (interaction states), to keep the references small. */
 shot?:string;
}
export interface VisualCase {id:string;theme:Theme;viewport:Viewport;scenario:Scenario}

const base:Viewport[]=[{width:360,height:780},{width:1440,height:1050}];
const boundaries:Viewport[]=[...[380,650,700,701,1000,1100,1101,1150,1151,1550].map(width=>({width,height:900})),{width:2688,height:1680}];
const everywhere=[...base,...boundaries].sort((a,b)=>a.width-b.width);
const masks=['.room-code','.race-clock','.typing-metrics'];
const hostMasks=[...masks,'.person-copy>strong','.room-invitation li'];

const visit=(path:string)=>async(page:Page)=>{await page.goto(path)};
const fakeUser={id:'visual-user',username:'Explorateur',avatar:'cheetah'};
/** Signed-in chrome without a database: the account endpoints are answered by the browser. */
async function signedIn(page:Page){
 await page.route('**/api/auth',route=>route.request().method()==='GET'?route.fulfill({json:{user:fakeUser}}):route.continue());
 await page.route('**/api/results?**',route=>route.fulfill({json:{results:[],summary:null,page:1,pages:1,total:0}}));
}
/** Below 1000 px the summary content is hidden (existing behaviour): the menu is opened like a keyboard user would. */
async function openAccountMenu(page:Page){
 const menu=page.locator('details.account');
 await expect(menu).toHaveCount(1);
 await menu.evaluate(element=>{(element as HTMLDetailsElement).open=true});
 await expect(menu).toHaveAttribute('open','');
}
/** A fixed host account (created on first use), not in any room. */
async function hostAccount(origin:string){
 const host=await request.newContext({baseURL:origin}),credentials={username:'VisuelHote',password:'GuepardVisuel42!'};
 const login=await host.post('/api/auth',{data:{action:'login',...credentials}});
 if(!login.ok())expect((await host.post('/api/auth',{data:{action:'signup',...credentials,confirmation:credentials.password,avatar:'cheetah'}})).ok()).toBeTruthy();
 // A previous interrupted run may have left the host in a room.
 await host.post('/api/rooms',{data:{action:'leave-current'}});
 return host;
}
/** The fixed host opens the room; the page joins it as a guest. */
async function guestRoom(page:Page){
 const host=await hostAccount(new URL(page.url()).origin);
 const {room,token}=await createTestRoom(host,{name:'Clairière visuelle'});
 const joined=await page.request.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Explorateur'}});
 expect(joined.ok(),await joined.text()).toBeTruthy();
 const guest=await joined.json() as {room:RoomView;token:string};
 return {room,host,token,guest:guest.token,cleanup:async()=>{await closeRoom(host,room.id,token);await host.dispose()}};
}
/** The room code is random and its width moves the invitation grid: a fixed text keeps the layout stable. */
async function fixCode(page:Page){
 await expect(page.locator('.room-code')).toBeVisible();
 await page.locator('.room-code').evaluate(element=>{element.textContent='K7M2QX'});
}
/** The host's own view of a waiting room: a bot, a spectator and two invitations. */
async function hostRoom(page:Page,patch:Record<string,unknown>={}){
 const origin=new URL(page.url()).origin,host=await hostAccount(origin);
 const {room,token}=await createTestRoom(host,{name:'Clairière visuelle',visibility:'semi',...patch});
 // An invitation seats the spectator without a room code (code attempts are rate limited).
 const invited=await roomCommand(host,room.id,token,{action:'invite',count:2});
 const spectator=await request.newContext({baseURL:origin});
 const seat=await spectator.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Observateur',role:'spectator',invite:invited.room.invitations![0].token}});
 expect(seat.ok(),await seat.text()).toBeTruthy();
 await roomCommand(host,room.id,token,{action:'bot'});
 return {room,host,token,cleanup:async()=>{await closeRoom(host,room.id,token);await host.dispose();await spectator.dispose()}};
}
const privateRace={id:'private-visual',name:{fr:'Course privée visuelle',en:'Visual private race'},language:'FR',players:1,max:6,animal:'🐆',color:'green',state:'waiting',private:true,code:'VISUAL42'};

export const scenarios:Record<string,Scenario>={
 home:{open:visit('/'),viewports:everywhere},
 'home-plank-hover':{open:async page=>{await page.goto('/');await settle(page);await page.locator('.board-action').nth(1).hover()},viewports:base,shot:'.jungle-clearing'},
 'home-focus-visible':{open:async page=>{await page.goto('/');await settle(page);await page.keyboard.press('Tab');await page.keyboard.press('Tab')},viewports:base,shot:'header'},
 'home-account-menu':{open:async page=>{await signedIn(page);await page.goto('/');await openAccountMenu(page)},viewports:base,shot:'.controls'},
 'account-settings':{open:async page=>{await signedIn(page);await page.goto('/how');await openAccountMenu(page);await page.locator('details.account button').first().click();await expect(page.locator('dialog[open]')).toBeVisible()},viewports:base,shot:'dialog[open]'},
 how:{open:visit('/how'),viewports:base},
 races:{open:visit('/races'),viewports:base},
 create:{open:visit('/create'),viewports:base},
 play:{open:visit('/play'),viewports:base},
 login:{open:visit('/login'),viewports:base},
 'login-error':{open:async page=>{await page.goto('/login');await page.locator('form.auth-form .auth-submit').click();await expect(page.locator('#auth-username')).toBeFocused()},viewports:base,shot:'.auth-card'},
 signup:{open:visit('/signup'),viewports:base},
 stats:{open:visit('/stats'),viewports:base},
 about:{open:visit('/about'),viewports:base},
 contact:{open:visit('/contact'),viewports:base},
 legal:{open:visit('/legal'),viewports:base},
 privacy:{open:visit('/privacy'),viewports:base},
 missing:{open:visit('/introuvable'),viewports:base},
 'legacy-race':{open:visit('/race/canopy'),viewports:base},
 'legacy-private-race':{open:async page=>{await page.addInitScript(race=>{sessionStorage.setItem('guepard-privateRaces',JSON.stringify([race]));localStorage.setItem('guepard-privateRaces',JSON.stringify([race]))},privateRace);await page.goto('/race/'+privateRace.id)},viewports:base},
 podium:{open:visit('/demo/podium'),viewports:everywhere},
 'podium-details':{open:async page=>{await page.goto('/demo/podium');await page.getByRole('button',{name:'Voir mes statistiques'}).click();await expect(page.locator('.results-table')).toBeVisible()},viewports:base},
 lobby:{open:async page=>{await page.goto('/');const {room,guest,cleanup}=await guestRoom(page);await openLobby(page,room.id,guest);await expect(page.locator('.room-code')).toBeVisible();return cleanup},masks,viewports:everywhere},
 'lobby-settings':{open:async page=>{await page.goto('/');const {room,guest,cleanup}=await guestRoom(page);await openLobby(page,room.id,guest);await page.locator('details.wood-disclosure summary').first().click();return cleanup},masks,viewports:base},
 'create-room':{open:async page=>{await signedIn(page);await page.goto('/create')},viewports:base},
 'lobby-host':{open:async page=>{await page.goto('/');const {room,token,cleanup}=await hostRoom(page);await openLobby(page,room.id,token);await fixCode(page);await expect(page.locator('.room-roster li')).toHaveCount(3);return cleanup},masks:hostMasks,viewports:base},
 'lobby-host-menu':{open:async page=>{await page.goto('/');const {room,token,cleanup}=await hostRoom(page);await openLobby(page,room.id,token);await fixCode(page);await page.locator('.room-invitation details summary').click();await page.locator('details.person-menu summary').first().click();await expect(page.locator('details.person-menu[open]')).toHaveCount(1);return cleanup},masks:hostMasks,viewports:base},
 'lobby-entry':{open:async page=>{await page.goto('/');const host=await hostAccount(new URL(page.url()).origin),{room,token}=await createTestRoom(host,{name:'Clairière visuelle'});await page.goto('/lobby/'+room.id);await expect(page.locator('#join-name')).toBeVisible();return async()=>{await closeRoom(host,room.id,token);await host.dispose()}},viewports:base},
 'lobby-closed':{open:async page=>{await page.goto('/');const {room,host,token,guest,cleanup}=await guestRoom(page);await openLobby(page,room.id,guest);await expect(page.locator('.room-code')).toBeVisible();await closeRoom(host,room.id,token);await expect(page.locator('main#main').getByRole('link',{name:'Parcourir les courses'})).toBeVisible();return cleanup},viewports:base},
 'lobby-finished':{open:async page=>{
  await page.goto('/');const {room,host,token,guest,cleanup}=await guestRoom(page);
  await configureShortRace(host,room.id,token);await roomCommand(host,room.id,token,{action:'start'});const running=await waitForRace(host,room.id,token);
  await roomCommand(page.request,room.id,guest,{action:'abandon'});await sendProgress(host,room.id,token,running.text!);
  await openLobby(page,room.id,guest);await expect(page.locator('main.lobby-results')).toBeVisible();
  return cleanup;
 },masks:[...masks,'.race-board'],viewports:base},
 'lobby-finished-details':{open:async page=>{
  await page.goto('/');const {room,host,token,guest,cleanup}=await guestRoom(page);
  await configureShortRace(host,room.id,token);await roomCommand(host,room.id,token,{action:'start'});const running=await waitForRace(host,room.id,token);
  await roomCommand(page.request,room.id,guest,{action:'abandon'});await sendProgress(host,room.id,token,running.text!);
  await openLobby(page,room.id,guest);await page.getByRole('button',{name:'Voir mes statistiques'}).click();await expect(page.locator('.room-launch')).toBeVisible();
  return cleanup;
 },masks:[...masks,'.race-board'],viewports:base},
 'lobby-finished-host':{open:async page=>{
  await page.goto('/');const {room,host,token,guest,cleanup}=await guestRoom(page);
  await configureShortRace(host,room.id,token);await roomCommand(host,room.id,token,{action:'start'});const running=await waitForRace(host,room.id,token);
  await roomCommand(page.request,room.id,guest,{action:'abandon'});await sendProgress(host,room.id,token,running.text!);
  await openLobby(page,room.id,token);await expect(page.locator('main.lobby-results')).toBeVisible();
  return cleanup;
 },masks:[...masks,'.race-board'],viewports:base},
 'lobby-finished-host-details':{open:async page=>{
  await page.goto('/');const {room,host,token,guest,cleanup}=await guestRoom(page);
  await configureShortRace(host,room.id,token);await roomCommand(host,room.id,token,{action:'start'});const running=await waitForRace(host,room.id,token);
  await roomCommand(page.request,room.id,guest,{action:'abandon'});await sendProgress(host,room.id,token,running.text!);
  await openLobby(page,room.id,token);await page.getByRole('button',{name:'Voir mes statistiques'}).click();await expect(page.locator('.room-launch')).toBeVisible();
  return cleanup;
 },masks:[...masks,'.race-board'],viewports:base},
 race:{open:async page=>{
  await page.goto('/');const {room,host,token,guest,cleanup}=await guestRoom(page);
  await configureShortRace(host,room.id,token);await roomCommand(host,room.id,token,{action:'start'});await waitForRace(host,room.id,token);
  await openLobby(page,room.id,guest);await expect(page.getByLabel('Texte de la course')).toBeEnabled();
  return cleanup;
 },masks,viewports:base},
};

/** Computed styles: every scenario × theme × viewport. */
export const cases:VisualCase[]=Object.entries(scenarios).flatMap(([name,scenario])=>(['light','dark'] as const).flatMap(theme=>scenario.viewports.map(viewport=>({id:`${name}-${theme}-${viewport.width}`,theme,viewport,scenario}))));
/** Screenshots: both themes at 360 and 1440 px, the intermediate boundaries in the light theme only (their dark variant is covered by the computed styles). */
export const screenshotCases=cases.filter(visual=>visual.theme==='light'||base.some(viewport=>viewport.width===visual.viewport.width));

/** Applies theme and language before the first paint. */
export async function prepare(page:Page,visual:VisualCase,baseURL:string){
 const url=new URL(baseURL);
 await page.context().addCookies([{name:'guepard-theme',value:visual.theme,domain:url.hostname,path:'/'},{name:'guepard-lang',value:'fr',domain:url.hostname,path:'/'}]);
 await page.setViewportSize(visual.viewport);
}

/** Waits for fonts, decorative images and the client state, then removes caret and scroll noise. */
export async function settle(page:Page){
 await page.waitForLoadState('load');
 await page.waitForFunction(()=>document.documentElement.dataset.decor!=='pending');
 await page.evaluate(async()=>{
  await document.fonts.ready;
  for(const image of Array.from(document.images)){image.loading='eager';if(!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})})}
  await Promise.all(Array.from(document.images).map(image=>image.decode().catch(()=>undefined)));
 });
 // The lobby keeps an event stream open: no `networkidle`, a short quiet period instead.
 await page.waitForTimeout(400);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

export async function openCase(page:Page,visual:VisualCase,baseURL:string){
 await prepare(page,visual,baseURL);
 const cleanup=await visual.scenario.open(page);
 await settle(page);
 return cleanup||undefined;
}
