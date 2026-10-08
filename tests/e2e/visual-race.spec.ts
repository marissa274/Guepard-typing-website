import {test,expect} from '@playwright/test';
test('bot continues to run during rapid typing and the tortoise remains complete',async({page,request})=>{
 const created=await (await request.post('/api/rooms',{data:{name:'Bot continu',nickname:'Testeur',animal:'cheetah',visibility:'public'}})).json();
 const {room,token}=created,headers={Authorization:'Bearer '+token};
 try{
  await request.post('/api/rooms/'+room.id,{headers,data:{action:'bot',difficulty:'medium'}});
  await page.goto('/');
  await page.evaluate(({id,token})=>sessionStorage.setItem('guepard-room-'+id,token),{id:room.id,token});
  await page.goto('/lobby/'+room.id);
  await page.getByRole('button',{name:'Lancer la course',exact:true}).click();
  const field=page.getByLabel('Texte de la course');
  await expect(field).toBeEnabled();
  const initial=await (await request.get('/api/rooms/'+room.id,{headers})).json();
  const text=initial.room.text,botId=initial.room.people.find((p:{kind:string})=>p.kind==='bot').id;
  for(let i=1;i<=18;i++){await field.fill(text.slice(0,i));await page.waitForTimeout(110)}
  const later=await (await request.get('/api/rooms/'+room.id,{headers})).json();
  const bot=later.room.people.find((p:{id:string})=>p.id===botId);
  expect(bot.progress).toBeGreaterThan(0);
  const lane=page.locator('.race-lane[data-player-id="'+botId+'"]');
  await expect(lane.locator('.race-runner')).toHaveAttribute('data-motion','running');
  await expect(page.locator('.race-runner.runner-tortoise[data-motion="running"]')).toBeVisible();
  expect(await page.locator('.runner-tortoise').first().evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('race-gaits.png');
  await page.screenshot({path:'/tmp/guepard-tortoise-fixed.png'});
 }finally{await request.post('/api/rooms/'+room.id,{headers,data:{action:'leave'}})}
});
test('fixed lanes, stable transformations, final podium and rematch',async({page,request})=>{
 const created=await (await request.post('/api/rooms',{data:{name:'La course des animaux',nickname:'Marissa',animal:'cheetah',visibility:'public'}})).json();const {room,token}=created,headers={Authorization:'Bearer '+token};
 const members=[{id:room.me,token}];for(const nickname of ['Mathis','Léa','Noah']){const r=await (await request.post('/api/rooms/'+room.id,{data:{action:'join',nickname}})).json();members.push({id:r.room.me,token:r.token})}
 try{await page.goto('/');await page.evaluate(({id,token})=>sessionStorage.setItem('guepard-room-'+id,token),{id:room.id,token});await page.goto('/lobby/'+room.id);await page.getByRole('button',{name:'Lancer la course',exact:true}).click();await expect(page.locator('.race-lane')).toHaveCount(4);await expect(page.locator('.race-lane .runner-cheetah')).toHaveCount(4);const initialOrder=await page.locator('.race-lane').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-player-id')));await expect(page.getByLabel('Texte de la course')).toBeEnabled({timeout:2000});await expect(page.getByLabel('Texte de la course')).toBeFocused();const current=await (await request.get('/api/rooms/'+room.id,{headers})).json();const text=current.room.text;
 const progress=async(i:number,fraction:number)=>{const value=text.slice(0,Math.floor(text.length*fraction));expect((await request.post('/api/rooms/'+room.id,{headers:{Authorization:'Bearer '+members[i].token},data:{action:'progress',value,typed:value.length}})).ok()).toBeTruthy()};
 for(const [i,f]of [.7,.6,.45,.3].entries())await progress(i,f);
 await expect(page.locator('.race-lane').nth(1).locator('.runner-gazelle')).toBeVisible();await expect(page.locator('.race-lane').nth(3).locator('.runner-tortoise')).toBeVisible();await progress(3,.45);await expect(page.locator('.race-lane').nth(3).locator('.runner-tortoise')).toBeVisible();await progress(3,.5);await expect(page.locator('.race-lane').nth(3).locator('.runner-hare')).toBeVisible();expect(await page.locator('.race-lane').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-player-id')))).toEqual(initialOrder);
 await progress(0,.75);const runner=page.locator('.race-lane').first().locator('.race-runner');await expect(runner).toHaveAttribute('data-motion','running');
 const poses=await runner.evaluate(el=>{const animation=el.getAnimations().find(a=>(a as CSSAnimation).animationName==='gait-cycle')!;animation.pause();animation.currentTime=10;const first=getComputedStyle(el).backgroundPositionX;animation.currentTime=350;const second=getComputedStyle(el).backgroundPositionX;animation.play();return [first,second]});expect(poses[0]).not.toBe(poses[1]);
 await runner.screenshot({path:'/tmp/guepard-gait-frame.png'});
 await page.screenshot({path:'/tmp/guepard-visual-race.png',fullPage:true});for(let i=0;i<4;i++)await progress(i,1);await expect(page.getByRole('heading',{name:'Bravo à tous !'})).toBeVisible();await expect(page.locator('.podium-place')).toHaveCount(3);await page.setViewportSize({width:1536,height:1024});await expect(page.locator('.results-panels')).toBeHidden();await page.screenshot({path:'/tmp/guepard-celebration.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.locator('body').evaluate(el=>el.scrollWidth)).toBe(390);await page.screenshot({path:'/tmp/guepard-celebration-mobile.png',fullPage:true});await page.setViewportSize({width:1536,height:1024});await page.getByRole('button',{name:'Voir mes statistiques'}).click();await expect(page.locator('.results-table tbody tr')).toHaveCount(4);await page.setViewportSize({width:1536,height:1024});await page.screenshot({path:'/tmp/guepard-podium.png',fullPage:true});await page.getByRole('button',{name:'Lancer une revanche'}).click();await expect(page.locator('.race-lane .runner-cheetah')).toHaveCount(4);await page.setViewportSize({width:390,height:844});await expect(page.locator('body')).toHaveJSProperty('scrollWidth',390);await page.screenshot({path:'/tmp/guepard-race-mobile.png',fullPage:true});
 }finally{await request.post('/api/rooms/'+room.id,{headers,data:{action:'leave'}})}
});
