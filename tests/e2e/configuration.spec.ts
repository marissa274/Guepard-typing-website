import {test,expect} from '@playwright/test';
import {createTestRoom,roomCommand,readRoom,waitForRace,closeRoom,memberHeaders} from './helpers';

test('PostgreSQL corpus, complexity and character settings are applied authoritatively',async({request})=>{
 const {room,token}=await createTestRoom(request);
 try{
  await roomCommand(request,room.id,token,{action:'bot',difficulty:'noob'});
  await roomCommand(request,room.id,token,{action:'settings',settings:{textType:'words',language:'EN',complexity:'hard',length:20,uppercase:false,accents:false,punctuation:false,numbers:false,specials:false,whitelist:'_',blacklist:'@#',timeLimit:30}});
  expect((await readRoom(request,room.id,token)).text).toBeUndefined();
  const started=(await roomCommand(request,room.id,token,{action:'start'})).room;
  expect(started.phase).toBe('countdown');expect(started.text).toContain('_');
  expect(started.text).not.toMatch(/[A-Z0-9@#]/);
  expect(started.text!.replaceAll('_','').split(' ')).toHaveLength(20);
  expect(started.text!.replaceAll('_','').split(' ').every(word=>word.length>=8)).toBe(true);
  await waitForRace(request,room.id,token);
  const jump=await request.post('/api/rooms/'+room.id,{headers:memberHeaders(token),data:{action:'progress',value:started.text,typed:started.text!.length}});
  expect(jump.status()).toBe(400);
  expect((await readRoom(request,room.id,token)).people.find(person=>person.id===room.me)!.progress).toBe(0);
 }finally{await closeRoom(request,room.id,token)}
});

test('browser language and dark preference default correctly and a selected language persists',async({browser,baseURL})=>{
 const context=await browser.newContext({baseURL,locale:'en-CA',colorScheme:'dark'}),page=await context.newPage();
 try{
  await page.goto('/how');await expect(page.getByRole('heading',{name:/A KEYBOARD/})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button',{name:'Switch to French'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','fr');await page.reload();
  await expect(page.getByRole('button',{name:'Passer en anglais'})).toBeVisible();
  expect((await context.cookies()).find(cookie=>cookie.name==='guepard-lang')?.value).toBe('fr');
  await page.setViewportSize({width:360,height:800});await page.goto('/');
  expect(await page.locator('body').evaluate(element=>element.scrollWidth)).toBe(360);
 }finally{await context.close()}
});
