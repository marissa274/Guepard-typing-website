import {test,expect} from '@playwright/test';
import {closeRoom,configureShortRace,createTestRoom,guestContext,memberHeaders,openLobby,readRoom,roomCommand,sendProgress,waitForRace} from './helpers';

function idOfResult(id:string,startedAt:number,personId:string){return `${id}-${startedAt}-${personId}`}

test('real finishers retain private keyboard data, time series, record and spectator results',async({page,browser,playwright,baseURL})=>{
 const {room,token}=await createTestRoom(page.request,{name:'Les deux explorateurs'}),guest=await guestContext(playwright,baseURL,room.id,'Ami');
 const spectator=await browser.newContext({baseURL,locale:'fr-CA'}),late=await playwright.request.newContext({baseURL});
 try{
  const joined=await spectator.request.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Observatrice',role:'spectator'}});expect(joined.ok()).toBeTruthy();
  const watch=await joined.json(),view=await spectator.newPage();
  await configureShortRace(page.request,room.id,token);
  await openLobby(page,room.id,token);await openLobby(view,room.id,watch.token);
  await page.getByRole('button',{name:'Lancer la course',exact:true}).click();
  expect((await late.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Retardataire'}})).status()).toBe(409);
  const running=await waitForRace(page.request,room.id,token);
  await expect(page.getByLabel('Texte de la course')).toBeEnabled();
  await expect(view.getByLabel('Texte de la course')).toHaveCount(0);
  await page.getByLabel('Texte de la course').pressSequentially(running.text!,{delay:65});
  await expect(page.getByText('Terminé ! Tu peux suivre les autres pistes.')).toBeVisible();
  await sendProgress(guest.request,room.id,guest.token,running.text!);
  await expect(page.getByRole('heading',{name:'Bravo à tous !'})).toBeVisible();
  await expect(page.locator('.results-place')).toHaveCount(2);
  await page.getByRole('button',{name:'Voir mes statistiques'}).click();
  await expect(page.locator('.results-table tbody tr')).toHaveCount(2);
  await expect(page.locator('.race-timeline svg polyline')).toHaveCount(2);
  await expect(page.locator('.heat-clean').first()).toBeVisible();
  await expect(page.getByText('Nouveau record personnel !')).toBeVisible();
  await page.getByLabel('Disposition').selectOption('QWERTY');
  await page.locator('.heat-key').first().focus();await expect(page.locator('.heat-detail')).toContainText('1 :');
  await view.getByRole('button',{name:'Voir mes statistiques'}).click();
  await expect(view.getByText('Tu as suivi cette course')).toBeVisible();
  await expect(view.locator('.personal-metrics')).toHaveCount(0);
  await expect(view.getByRole('button',{name:'Lancer une revanche'})).toHaveCount(0);
  expect((await spectator.request.post('/api/rooms/'+room.id,{headers:memberHeaders(watch.token),data:{action:'rematch'}})).status()).toBe(403);
  const archive=await page.request.get('/api/results/'+idOfResult(room.id,running.startedAt!,room.me));expect(archive.ok()).toBeTruthy();
  const archived=(await archive.json()).room;
  expect(archived.personalBest).toBe(true);
  expect(archived.people.find((person:{id:string})=>person.id===room.me).heatmap).toBeTruthy();
  expect(archived.people.find((person:{id:string})=>person.id===guest.room.me).heatmap).toBeUndefined();
  await page.setViewportSize({width:390,height:844});expect(await page.locator('body').evaluate(element=>element.scrollWidth)).toBe(390);
  await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.results-place .race-runner').first().evaluate(element=>getComputedStyle(element).animationName)).toBe('none');
 }finally{await closeRoom(page.request,room.id,token);await guest.request.dispose();await spectator.close();await late.dispose()}
});

test('one abandonment does not end the race and a later finisher keeps the compact podium',async({page,playwright,baseURL})=>{
 const {room,token}=await createTestRoom(page.request,{name:'Un seul finaliste'}),guest=await guestContext(playwright,baseURL,room.id,'Ami');
 try{
  await configureShortRace(page.request,room.id,token);await roomCommand(page.request,room.id,token,{action:'start'});
  const running=await waitForRace(page.request,room.id,token);
  await roomCommand(guest.request,room.id,guest.token,{action:'abandon'});
  const afterAbandon=await readRoom(page.request,room.id,token);expect(afterAbandon.phase).toBe('running');
  const abandonedAt=afterAbandon.people.find(person=>person.id===guest.room.me)!.abandonedAt;expect(abandonedAt).toBeGreaterThan(running.startedAt!);
  await sendProgress(page.request,room.id,token,running.text!);
  const complete=await readRoom(page.request,room.id,token);expect(complete.phase).toBe('finished');expect(complete.people.find(person=>person.id===guest.room.me)!.abandonedAt).toBe(abandonedAt);
  await openLobby(page,room.id,token);
  await expect(page.locator('.results-place')).toHaveCount(1);expect((await page.locator('.results-place').boundingBox())!.width).toBeLessThanOrEqual(310);
  await page.getByRole('button',{name:'Voir mes statistiques'}).click();await expect(page.locator('.results-table tbody tr')).toHaveCount(2);await expect(page.locator('.results-table')).toContainText('Abandon');
 }finally{await closeRoom(page.request,room.id,token);await guest.request.dispose()}
});

test('three finishers keep their result order and archived podium after a finisher leaves',async({page,playwright,baseURL})=>{
 const {room,token}=await createTestRoom(page.request,{name:'La clairière des rapides'}),guests:Awaited<ReturnType<typeof guestContext>>[]=[];
 try{
  for(const nickname of ['Mathis','Léa'])guests.push(await guestContext(playwright,baseURL,room.id,nickname));
  await configureShortRace(page.request,room.id,token);await roomCommand(page.request,room.id,token,{action:'start'});
  const running=await waitForRace(page.request,room.id,token);
  for(const member of [{request:page.request,token},...guests])await sendProgress(member.request,room.id,member.token,running.text!);
  await roomCommand(guests[0].request,room.id,guests[0].token,{action:'leave'});
  await openLobby(page,room.id,token);await expect(page.locator('.results-place')).toHaveCount(3);
  for(const size of [{width:2688,height:1680},{width:1024,height:768}]){
   await page.setViewportSize(size);await expect(page.locator('.results-place')).toHaveCount(3);
   const ground=await page.locator('.results-wood-block').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().bottom));expect(Math.max(...ground)-Math.min(...ground)).toBeLessThan(2);
   expect(await page.locator('body').evaluate(element=>element.scrollWidth)).toBe(size.width);
  }
  const podium=await page.locator('.results-place').evaluateAll(nodes=>nodes.map(node=>({id:node.getAttribute('data-player-id'),rank:Number(node.getAttribute('data-rank'))})).sort((a,b)=>a.rank-b.rank));
  await page.getByRole('button',{name:'Voir mes statistiques'}).click();await expect(page).toHaveURL(/view=results/);await expect(page.locator('.celebration-stage')).toBeHidden();
  expect(await page.locator('.results-table tbody tr').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-player-id')))).toEqual(podium.map(person=>person.id));
 }finally{await closeRoom(page.request,room.id,token);for(const guest of guests)await guest.request.dispose()}
});

test('a connected human with no keystrokes stays eligible at the minimum thirty-second time limit',async({page})=>{
 test.setTimeout(60000);
 const {room,token}=await createTestRoom(page.request,{name:'Les explorateurs patients'});
 try{
  await configureShortRace(page.request,room.id,token);
  await roomCommand(page.request,room.id,token,{action:'bot',difficulty:'impossible'});
  await openLobby(page,room.id,token);
  await page.getByRole('button',{name:'Lancer la course',exact:true}).click();
  await waitForRace(page.request,room.id,token);
  await expect(page.getByRole('heading',{name:'Bravo à tous !'})).toBeVisible({timeout:35000});
  await expect(page.locator('.results-place')).toHaveCount(2);
  const complete=await readRoom(page.request,room.id,token),human=complete.people.find(person=>person.id===room.me)!;
  expect(complete.endedAt!-complete.startedAt!).toBe(30000);expect(human.progress).toBe(0);expect(human.abandoned).toBe(false);
  await page.getByRole('button',{name:'Voir mes statistiques'}).click();
  await expect(page.locator('.results-table tbody tr[data-player-id="'+room.me+'"]')).toContainText('Temps écoulé');
 }finally{await closeRoom(page.request,room.id,token)}
});
