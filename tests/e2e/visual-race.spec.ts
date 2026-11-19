import {test,expect} from '@playwright/test';
import {closeRoom,configureShortRace,createTestRoom,guestContext,memberHeaders,openLobby,readRoom,roomCommand,sendProgress,waitForRace} from './helpers';

const trackText='La jungle offre un chemin calme et lumineux aux amis qui traversent la rivière.';

test('three racers start as cheetahs after the synchronized countdown before their ranks evolve',async({page,playwright,baseURL})=>{
 const {room,token}=await createTestRoom(page.request,{name:'Trois pistes'});
 const guests:Awaited<ReturnType<typeof guestContext>>[]=[];
 try{
  for(const nickname of ['Bastien','Camille'])guests.push(await guestContext(playwright,baseURL,room.id,nickname));
  await configureShortRace(page.request,room.id,token,trackText);
  await openLobby(page,room.id,token);
  await page.getByRole('button',{name:'Lancer la course',exact:true}).click();
  await expect(page.getByLabel('Texte de la course')).toBeDisabled();
  await expect(page.locator('.race-lane .runner-cheetah')).toHaveCount(3);
  const current=await waitForRace(page.request,room.id,token);
  await expect(page.getByLabel('Texte de la course')).toBeEnabled();
  // The sticky lanes must not cover the text to type once the race scrolls the typing area into view.
  await expect.poll(async()=>{const lanes=(await page.locator('.race-lanes').boundingBox())!,target=(await page.locator('.room-target').boundingBox())!;return target.y-(lanes.y+lanes.height)},{timeout:3000}).toBeGreaterThanOrEqual(0);
  const jump=await page.request.post('/api/rooms/'+room.id,{headers:memberHeaders(token),data:{action:'progress',value:current.text,typed:current.text!.length}});
  expect(jump.status()).toBe(400);expect((await jump.json()).error).toContain('rapide');
  expect((await readRoom(page.request,room.id,token)).people.find(person=>person.id===room.me)!.progress).toBe(0);
  const racers=[{request:page.request,token},...guests];
  for(const [index,fraction] of [.7,.5,.2].entries())await sendProgress(racers[index].request,room.id,racers[index].token,current.text!.slice(0,Math.floor(current.text!.length*fraction)));
  await expect(page.locator('.race-lane').nth(2).locator('.runner-hare')).toBeVisible();
  expect((await readRoom(page.request,room.id,token)).people.map(person=>person.progress)).toEqual([.7,.5,.2].map(fraction=>Math.floor(current.text!.length*fraction)));
 }finally{await closeRoom(page.request,room.id,token);for(const guest of guests)await guest.request.dispose()}
});

test('a bot keeps progressing during human typing and mobile recommends a physical keyboard',async({page,browser,baseURL})=>{
 const {room,token}=await createTestRoom(page.request,{name:'Bot continu'});
 try{
  await configureShortRace(page.request,room.id,token,trackText);
  await roomCommand(page.request,room.id,token,{action:'bot',difficulty:'medium'});
  await openLobby(page,room.id,token);
  await page.getByRole('button',{name:'Lancer la course',exact:true}).click();
  const current=await waitForRace(page.request,room.id,token),field=page.getByLabel('Texte de la course');
  await expect(field).toBeEnabled();
  await field.pressSequentially(current.text!.slice(0,18),{delay:100});
  const later=await readRoom(page.request,room.id,token),bot=later.people.find(person=>person.kind==='bot')!;
  expect(bot.progress).toBeGreaterThan(0);
  await expect(page.locator('.race-lane[data-player-id="'+bot.id+'"] .race-runner')).toHaveAttribute('data-motion','running');
  await expect(page.locator('.runner-tortoise[data-motion="running"]')).toBeVisible();
  expect(await page.locator('.runner-tortoise').first().evaluate(element=>getComputedStyle(element).backgroundImage)).toContain('race-gaits.webp');
  // A narrow desktop window (zoom, split screen) keeps the race playable: WCAG 1.4.10 reflow.
  await page.setViewportSize({width:390,height:844});
  await expect(field).toBeVisible();
  expect(await page.locator('body').evaluate(element=>element.scrollWidth)).toBe(390);
  // Only a touch device without a hover-capable pointer gets the physical keyboard recommendation.
  const mobile=await browser.newContext({baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
   const phone=await mobile.newPage();await openLobby(phone,room.id,token);
   await expect(phone.getByText(/Pour participer à une course, utilise un ordinateur avec un clavier physique/)).toBeVisible();
   await expect(phone.getByLabel('Texte de la course')).toBeHidden();
   expect(await phone.locator('body').evaluate(element=>element.scrollWidth)).toBe(390);
  }finally{await mobile.close()}
 }finally{await closeRoom(page.request,room.id,token)}
});

test('fixed lanes retain stable transformations, complete results and a reset rematch',async({page,playwright,baseURL})=>{
 const {room,token}=await createTestRoom(page.request,{name:'La course des animaux'});
 const guests:Awaited<ReturnType<typeof guestContext>>[]=[];
 try{
  for(const nickname of ['Mathis','Léa','Noah'])guests.push(await guestContext(playwright,baseURL,room.id,nickname));
  await configureShortRace(page.request,room.id,token,trackText);
  await openLobby(page,room.id,token);
  await page.getByRole('button',{name:'Lancer la course',exact:true}).click();
  await expect(page.locator('.race-lane .runner-cheetah')).toHaveCount(4);
  const order=await page.locator('.race-lane').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-player-id')));
  const running=await waitForRace(page.request,room.id,token),text=running.text!;
  await expect(page.getByLabel('Texte de la course')).toBeFocused();
  const members=[{request:page.request,token},...guests],sent=members.map(()=> '');
  async function progress(index:number,fraction:number){const next=text.slice(0,Math.floor(text.length*fraction));await sendProgress(members[index].request,room.id,members[index].token,next,sent[index]);sent[index]=next}
  for(const [index,fraction]of [.7,.6,.45,.3].entries())await progress(index,fraction);
  await expect(page.locator('.race-lane').nth(1).locator('.runner-gazelle')).toBeVisible();
  await expect(page.locator('.race-lane').nth(3).locator('.runner-tortoise')).toBeVisible();
  await progress(3,.45);
  await expect(page.locator('.race-lane').nth(3).locator('.runner-tortoise')).toBeVisible();
  await progress(3,.5);
  await expect(page.locator('.race-lane').nth(3).locator('.runner-hare')).toBeVisible();
  expect(await page.locator('.race-lane').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-player-id')))).toEqual(order);
  await progress(0,.75);
  const runner=page.locator('.race-lane').first().locator('.race-runner');
  await expect(runner).toHaveAttribute('data-motion','running');
  const poses=await runner.evaluate(element=>{const animation=element.getAnimations().find(item=>(item as CSSAnimation).animationName==='cheetah-gait');if(!animation)throw new Error('Running gait missing');animation.pause();animation.currentTime=10;const first=getComputedStyle(element).backgroundPositionX;animation.currentTime=350;const second=getComputedStyle(element).backgroundPositionX;animation.play();return [first,second]});
  expect(poses[0]).not.toBe(poses[1]);
  for(let index=0;index<members.length;index++)await progress(index,1);
  await expect(page.getByRole('heading',{name:'Bravo à tous !'})).toBeVisible();
  await expect(page.locator('.podium-place')).toHaveCount(3);
  await page.getByRole('button',{name:'Voir mes statistiques'}).click();
  await expect(page.locator('.results-table tbody tr')).toHaveCount(4);
  await expect(page.locator('.race-timeline svg polyline')).toHaveCount(4);
  await expect(page.getByRole('columnheader',{name:'Bonus reçus'})).toBeVisible();
  await page.getByRole('button',{name:'Lancer une revanche'}).click();
  await expect(page.locator('.race-lane .runner-cheetah')).toHaveCount(4);
  await expect(page.getByLabel('Texte de la course')).toBeDisabled();
  expect((await readRoom(page.request,room.id,token)).people.every(person=>person.progress===0&&person.typed===0)).toBe(true);
 }finally{await closeRoom(page.request,room.id,token);for(const guest of guests)await guest.request.dispose()}
});
