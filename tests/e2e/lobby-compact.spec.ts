import {test,expect} from '@playwright/test';
import {createTestRoom,memberHeaders} from './helpers';

test('a class of thirty racers remains scrollable with host controls available',async({page})=>{
 const {room,token}=await createTestRoom(page.request,{name:'La clairière des rapides',visibility:'semi',capacity:30}),headers=memberHeaders(token);
 try{
  for(let i=0;i<29;i++){const response=await page.request.post('/api/rooms/'+room.id,{headers,data:{action:'bot'}});expect(response.ok()).toBeTruthy()}
  await page.goto('/');await page.evaluate(({id,token})=>sessionStorage.setItem('guepard-room-'+id,token),{id:room.id,token});await page.goto('/lobby/'+room.id);
  await expect(page.locator('.room-roster>li')).toHaveCount(30);
  expect(await page.locator('.participants-scroll').evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  await page.locator('.room-roster>li').last().scrollIntoViewIfNeeded();await expect(page.locator('.room-roster>li').last()).toBeVisible();
  await expect(page.getByRole('button',{name:'Lancer la course',exact:true})).toBeEnabled();
  await expect(page.getByLabel('Capacité maximale')).toHaveValue('30');
  const overflow=await page.request.post('/api/rooms/'+room.id,{headers,data:{action:'bot'}});expect(overflow.status()).toBe(409);
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){await page.setViewportSize(viewport);expect(await page.locator('body').evaluate(el=>el.scrollWidth)).toBe(viewport.width);await expect(page.locator('header')).toBeVisible();await expect(page.locator('footer')).toHaveCount(1)}
 }finally{await page.request.post('/api/rooms/'+room.id,{headers,data:{action:'close'}})}
});
