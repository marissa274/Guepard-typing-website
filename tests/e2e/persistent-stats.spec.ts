import {test,expect} from '@playwright/test';

test('account history survives logout and closed rooms, paginates, and stays private',async({page,playwright,baseURL})=>{
 const username='History'+Date.now().toString(36),password='HistorySecret42!';
 const signup=await page.request.post('/api/auth',{data:{action:'signup',username,password,confirmation:password,avatar:'cheetah'}});
 expect(signup.ok()).toBeTruthy();
 const anonymous=await playwright.request.newContext({baseURL});
 const other=await playwright.request.newContext({baseURL});
 let roomId='',token='';
 try{
  const created=await (await page.request.post('/api/rooms',{data:{name:'Historique persistant',animal:'cheetah',visibility:'public'}})).json();
  roomId=created.room.id;token=created.token;
  const headers={Authorization:'Bearer '+token};
  const guest=await (await anonymous.post('/api/rooms/'+roomId,{data:{action:'join',nickname:'Invité'}})).json();
  for(let n=0;n<11;n++){
   expect((await page.request.post('/api/rooms/'+roomId,{headers,data:{action:n===0?'start':'rematch'}})).ok()).toBeTruthy();
   expect((await anonymous.post('/api/rooms/'+roomId,{headers:{Authorization:'Bearer '+guest.token},data:{action:'abandon'}})).ok()).toBeTruthy();
  }
  const first=await (await page.request.get('/api/results')).json();
  expect(first.total).toBe(11);expect(first.results).toHaveLength(10);expect(first.summary.wins).toBe(11);
  const second=await (await page.request.get('/api/results?page=2')).json();expect(second.results).toHaveLength(1);
  const id=first.results[0].id;
  const detail=await (await page.request.get('/api/results/'+id)).json();
  expect(detail.room.people.every(person=>!person.token&&!person.userId&&!person.input)).toBeTruthy();
  expect((await anonymous.get('/api/results')).status()).toBe(401);
  const otherName='Other'+Date.now().toString(36);
  await other.post('/api/auth',{data:{action:'signup',username:otherName,password,confirmation:password,avatar:'cheetah'}});
  expect((await other.get('/api/results/'+id)).status()).toBe(404);
  await page.request.post('/api/rooms/'+roomId,{headers,data:{action:'leave'}});roomId='';
  await page.request.post('/api/auth',{data:{action:'logout'}});
  expect((await page.request.get('/api/results')).status()).toBe(401);
  await page.request.post('/api/auth',{data:{action:'login',username,password}});
  await page.goto('/stats');
  await expect(page.getByRole('heading',{name:'Historique des courses'})).toBeVisible();
  await expect(page.locator('.history > div')).toHaveCount(10);
  await page.getByRole('button',{name:'Suivante'}).click();
  await expect(page.locator('.history > div')).toHaveCount(1);
  await page.getByRole('link',{name:/Voir les résultats/}).click();
  await expect(page.getByRole('heading',{name:'Résultats de la course',exact:true})).toBeVisible();
  await expect(page.locator('.results-table tbody tr')).toHaveCount(2);
 }finally{
  if(roomId)await page.request.post('/api/rooms/'+roomId,{headers:{Authorization:'Bearer '+token},data:{action:'leave'}});
  await anonymous.dispose();await other.dispose();
 }
});
