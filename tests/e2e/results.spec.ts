import {test,expect} from '@playwright/test';
test('two real finishers, spectator privacy, keyboard details and mobile results',async({page,browser,request})=>{
 const {room,token}=await (await request.post('/api/rooms',{data:{name:'Les deux explorateurs',nickname:'Hôte',animal:'cheetah',visibility:'public'}})).json(),headers={Authorization:'Bearer '+token};
 const guest=await (await request.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Ami'}})).json();const watcher=await browser.newContext();
 try{await page.goto('/');await page.evaluate(({id,token})=>sessionStorage.setItem('guepard-room-'+id,token),{id:room.id,token});await page.goto('/lobby/'+room.id);await page.getByRole('button',{name:'Lancer la course',exact:true}).click();const spectator=await (await request.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Observatrice'}})).json();const view=await watcher.newPage();await view.goto('/');await view.evaluate(({id,token})=>sessionStorage.setItem('guepard-room-'+id,token),{id:room.id,token:spectator.token});await view.goto('/lobby/'+room.id);await expect(page.getByLabel('Texte de la course')).toBeEnabled({timeout:10000});const current=(await (await request.get('/api/rooms/'+room.id,{headers})).json()).room;await page.getByLabel('Texte de la course').fill(current.text);await expect(page.getByText('Terminé ! Tu peux suivre les autres pistes.')).toBeVisible();await request.post('/api/rooms/'+room.id,{headers:{Authorization:'Bearer '+guest.token},data:{action:'progress',value:current.text,typed:current.text.length}});
 await expect(page.getByRole('heading',{name:'Bravo à tous !'})).toBeVisible();await expect(page.locator('.results-place')).toHaveCount(2);await expect(page.locator('.results-place .runner-tortoise')).toHaveCount(1);await page.getByRole('button',{name:'Voir mes statistiques'}).click();await expect(page.locator('.results-table tbody tr')).toHaveCount(2);await expect(page.locator('.heat-clean').first()).toBeVisible();await page.getByLabel('Disposition').selectOption('QWERTY');await page.locator('.heat-key').first().focus();await expect(page.locator('.heat-detail')).toContainText('1 :');await view.getByRole('button',{name:'Voir mes statistiques'}).click();await expect(view.getByText('Tu as suivi cette course')).toBeVisible();await expect(view.locator('.personal-metrics')).toHaveCount(0);await expect(view.getByRole('button',{name:'Lancer une revanche'})).toHaveCount(0);expect((await request.post('/api/rooms/'+room.id,{headers:{Authorization:'Bearer '+spectator.token},data:{action:'rematch'}})).status()).toBe(403);
 await page.screenshot({path:'/tmp/guepard-results-two.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.locator('body').evaluate(el=>el.scrollWidth)).toBe(390);await page.screenshot({path:'/tmp/guepard-results-mobile.png',fullPage:true});await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.results-place .race-runner').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 }finally{await watcher.close();await request.post('/api/rooms/'+room.id,{headers,data:{action:'leave'}})}
});

test('a single eligible finisher keeps a compact podium and excludes an abandonment',async({page,request})=>{
 const {room,token}=await (await request.post('/api/rooms',{data:{name:'Un seul finaliste',nickname:'Hôte',animal:'cheetah',visibility:'public'}})).json(),headers={Authorization:'Bearer '+token};
 const guest=await (await request.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Ami'}})).json();
 try{
  await request.post('/api/rooms/'+room.id,{headers,data:{action:'start'}});
  await request.post('/api/rooms/'+room.id,{headers:{Authorization:'Bearer '+guest.token},data:{action:'abandon'}});
  const current=(await (await request.get('/api/rooms/'+room.id,{headers})).json()).room;
  await request.post('/api/rooms/'+room.id,{headers,data:{action:'progress',value:current.text,typed:current.text.length}});
  await page.goto('/');await page.evaluate(({id,token})=>sessionStorage.setItem('guepard-room-'+id,token),{id:room.id,token});await page.goto('/lobby/'+room.id);
  await expect(page.locator('.results-place')).toHaveCount(1);expect((await page.locator('.results-place').boundingBox())!.width).toBeLessThanOrEqual(310);
  await page.getByRole('button',{name:'Voir mes statistiques'}).click();await expect(page.locator('.results-table tbody tr')).toHaveCount(2);await expect(page.locator('.results-table')).toContainText('Abandon');
 }finally{await request.post('/api/rooms/'+room.id,{headers,data:{action:'leave'}})}
});

test('three ranked players stay grounded and results survive a finisher leaving',async({page,request})=>{
 const {room,token}=await (await request.post('/api/rooms',{data:{name:'La clairière des rapides',nickname:'Marissa',animal:'cheetah',visibility:'public'}})).json(),headers={Authorization:'Bearer '+token};
 const members=[{token}];for(const nickname of ['Mathis','Léa'])members.push(await (await request.post('/api/rooms/'+room.id,{data:{action:'join',nickname}})).json());
 try{
  await request.post('/api/rooms/'+room.id,{headers,data:{action:'start'}});const running=(await (await request.get('/api/rooms/'+room.id,{headers})).json()).room;
  for(const member of members)await request.post('/api/rooms/'+room.id,{headers:{Authorization:'Bearer '+member.token},data:{action:'progress',value:running.text,typed:running.text.length}});
  await page.goto('/');await page.evaluate(({id,token})=>sessionStorage.setItem('guepard-room-'+id,token),{id:room.id,token});await page.goto('/lobby/'+room.id);
  await expect(page.locator('.results-place')).toHaveCount(3);
  await request.post('/api/rooms/'+room.id,{headers:{Authorization:'Bearer '+members[1].token},data:{action:'leave'}});
  for(const size of [{width:2688,height:1680},{width:1024,height:768}]){
   await page.setViewportSize(size);await expect(page.locator('.results-place')).toHaveCount(3);
   const ground=await page.locator('.results-wood-block').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().bottom));expect(Math.max(...ground)-Math.min(...ground)).toBeLessThan(2);
   const pole=await page.locator('.celebration-sign-post').boundingBox();expect(Math.abs(pole!.y+pole!.height-ground[0])).toBeLessThan(2);
   expect(await page.locator('body').evaluate(el=>el.scrollWidth)).toBe(size.width);
   await page.screenshot({path:size.width===2688?'/tmp/guepard-podium-corrected-2688.png':'/tmp/guepard-podium-tablet.png',fullPage:true});
  }
  const podium=await page.locator('.results-place').evaluateAll(nodes=>nodes.map(n=>({id:n.getAttribute('data-player-id'),rank:Number(n.getAttribute('data-rank'))})).sort((a,b)=>a.rank-b.rank));
  await page.getByRole('button',{name:'Voir mes statistiques'}).click();await expect(page).toHaveURL(/view=results/);await expect(page.locator('.celebration-stage')).toBeHidden();await expect(page.locator('.results-table tbody tr')).toHaveCount(3);
  expect(await page.locator('.results-table tbody tr').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-player-id')))).toEqual(podium.map(p=>p.id));
  await expect(page.locator('.main-navigation a[aria-current="page"]')).toHaveCount(0);
 }finally{await request.post('/api/rooms/'+room.id,{headers,data:{action:'leave'}})}
});

test('a human with no keystrokes remains on the time-limit podium',async({page,request})=>{
 const {room,token}=await (await request.post('/api/rooms',{data:{name:'Les explorateurs patients',nickname:'Humain sans frappe',animal:'cheetah',visibility:'public'}})).json(),headers={Authorization:'Bearer '+token};
 try{
  await request.post('/api/rooms/'+room.id,{headers,data:{action:'bot'}});await request.post('/api/rooms/'+room.id,{headers,data:{action:'settings',settings:{timeLimit:1,inactiveAfter:600}}});await request.post('/api/rooms/'+room.id,{headers,data:{action:'start'}});
  await page.goto('/');await page.evaluate(({id,token})=>sessionStorage.setItem('guepard-room-'+id,token),{id:room.id,token});await page.goto('/lobby/'+room.id);
  await expect(page.locator('.results-place')).toHaveCount(2);await expect(page.locator('.results-podium')).toContainText('Humain sans frappe');
 }finally{await request.post('/api/rooms/'+room.id,{headers,data:{action:'leave'}})}
});
