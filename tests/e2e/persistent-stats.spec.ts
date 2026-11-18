import {test,expect} from '@playwright/test';
import {closeRoom,configureShortRace,createTestRoom,guestContext,memberHeaders,readRoom,roomCommand,sendProgress,waitForRace} from './helpers';

test('eleven real completed races retain private measurements, paginate and reopen after logout and room closure',async({page,playwright,baseURL})=>{
 test.setTimeout(120000);
 const username='History'+Date.now().toString(36),password='HistorySecret42!';
 const signup=await page.request.post('/api/auth',{data:{action:'signup',username,password,confirmation:password,avatar:'cheetah'}});expect(signup.ok()).toBeTruthy();
 const {room,token}=await createTestRoom(page.request,{name:'Historique persistant'}),guest=await guestContext(playwright,baseURL,room.id,'Invité');
 const other=await playwright.request.newContext({baseURL});let closed=false,firstId='';
 try{
  await configureShortRace(page.request,room.id,token);
  for(let round=0;round<11;round++){
   await roomCommand(page.request,room.id,token,{action:round===0?'start':'rematch'});
   const running=await waitForRace(page.request,room.id,token);
   await roomCommand(guest.request,room.id,guest.token,{action:'abandon'});
   expect((await readRoom(page.request,room.id,token)).phase).toBe('running');
   await sendProgress(page.request,room.id,token,running.text!);
   expect((await readRoom(page.request,room.id,token)).phase).toBe('finished');
   if(round===0){
    firstId=`${room.id}-${running.startedAt}-${room.me}`;
    const firstResult=await (await page.request.get('/api/results/'+firstId)).json();expect(firstResult.room.personalBest).toBe(true);
   }
  }
  const first=await (await page.request.get('/api/results')).json();expect(first.total).toBe(11);expect(first.results).toHaveLength(10);expect(first.summary.wins).toBe(11);
  const second=await (await page.request.get('/api/results?page=2')).json();expect(second.results).toHaveLength(1);expect(second.results[0].id).toBe(firstId);
  const detail=await (await page.request.get('/api/results/'+firstId)).json();
  for(const person of detail.room.people){for(const key of ['token','userId','input','identityKey','ipHash','typingBudget','lastProgressAt'])expect(Object.hasOwn(person,key)).toBe(false)}
  const mine=detail.room.people.find((person:{id:string})=>person.id===room.me),opponent=detail.room.people.find((person:{id:string})=>person.id===guest.room.me);
  expect(mine.telemetry.length).toBeGreaterThan(1);expect(Object.keys(mine.heatmap).length).toBeGreaterThan(0);expect(opponent.heatmap).toBeUndefined();
  expect((await guest.request.get('/api/results')).status()).toBe(401);expect((await page.request.get('/api/results?page=0')).status()).toBe(400);
  const otherName='Other'+Date.now().toString(36);expect((await other.post('/api/auth',{data:{action:'signup',username:otherName,password,confirmation:password,avatar:'cheetah'}})).ok()).toBeTruthy();
  expect((await other.get('/api/results/'+firstId)).status()).toBe(404);
  await roomCommand(page.request,room.id,token,{action:'close'});closed=true;
  expect((await page.request.get('/api/rooms/'+room.id,{headers:memberHeaders(token)})).status()).toBe(404);expect((await page.request.get('/api/results/'+firstId)).ok()).toBeTruthy();
  await page.request.post('/api/auth',{data:{action:'logout'}});expect((await page.request.get('/api/results')).status()).toBe(401);
  expect((await page.request.post('/api/auth',{data:{action:'login',username,password}})).ok()).toBeTruthy();
  await page.goto('/stats');await expect(page.getByRole('heading',{name:'Historique des courses'})).toBeVisible();await expect(page.locator('.history > div')).toHaveCount(10);
  await page.getByRole('button',{name:'Suivante'}).click();await expect(page.locator('.history > div')).toHaveCount(1);
  await page.getByRole('link',{name:/Voir les résultats/}).click();await expect(page.getByRole('heading',{name:'Résultats de la course',exact:true})).toBeVisible();
  await expect(page.locator('.results-table tbody tr')).toHaveCount(2);await expect(page.locator('.race-timeline svg polyline')).toHaveCount(2);await expect(page.locator('.heat-clean').first()).toBeVisible();await expect(page.getByText('Nouveau record personnel !')).toBeVisible();
 }finally{if(!closed)await closeRoom(page.request,room.id,token);await guest.request.dispose();await other.dispose()}
});
