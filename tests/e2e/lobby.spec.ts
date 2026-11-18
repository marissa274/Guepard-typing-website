import {test,expect,type APIRequestContext} from '@playwright/test';
import {createTestRoom,ensureAccount,memberHeaders,guestContext,configureShortRace,waitForRace} from './helpers';

async function command(request:APIRequestContext,id:string,token:string,body:Record<string,unknown>){const response=await request.post('/api/rooms/'+id,{headers:memberHeaders(token),data:body});expect(response.ok(),await response.text()).toBeTruthy();return response.json()}

test('guests cannot create, while an account can create with a chosen animal and capacity',async({page})=>{
 await page.goto('/create');await expect(page.getByRole('link',{name:'Se connecter',exact:true}).last()).toBeVisible();
 expect((await page.request.post('/api/rooms',{data:{name:'Interdit',animal:'cheetah',nickname:'Invité'}})).status()).toBe(403);
 await ensureAccount(page.request);await page.reload();
 await page.getByLabel('Nom du salon').fill('La course du toucan');await page.getByRole('button',{name:'Animaux suivants'}).click();await page.getByRole('radio',{name:/Toucan/}).check();await page.getByLabel('Capacité maximale').fill('3');await page.getByRole('button',{name:'Créer une course',exact:true}).click();
 await expect(page).toHaveURL(/\/lobby\//);const id=page.url().split('/').pop()!,token=await page.evaluate(id=>sessionStorage.getItem('guepard-room-'+id)!,id);
 try{const room=(await (await page.request.get('/api/rooms/'+id,{headers:memberHeaders(token)})).json()).room;expect(room.animal).toBe('toucan');expect(room.settings.capacity).toBe(3);expect(room.code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);await expect(page.getByText('Vous êtes l’hôte',{exact:true})).toBeVisible()}
 finally{await command(page.request,id,token,{action:'close'})}
});

test('public explorer filters actual rooms and quick play joins without creating fictitious rooms',async({page,playwright,baseURL})=>{
 const {room,token}=await createTestRoom(page.request,{name:'Salon public EN',language:'EN'}),visitor=await playwright.request.newContext({baseURL});
 try{
  await page.goto('/races');await expect(page.getByRole('heading',{name:'Salon public EN'})).toBeVisible();
  const filtered=(await (await visitor.get('/api/rooms?language=EN&complexity=medium')).json()).rooms;
  expect(filtered.some((candidate:{id:string})=>candidate.id===room.id)).toBe(true);expect(filtered.every((candidate:{language:string;complexity:string})=>candidate.language==='EN'&&candidate.complexity==='medium')).toBe(true);
  const quick=await visitor.post('/api/rooms',{data:{action:'quick',nickname:'Ami rapide'}});expect(quick.ok()).toBeTruthy();const joined=await quick.json();
  expect(joined.room.settings.visibility).toBe('public');expect(joined.room.people.some((person:{name:string})=>person.name==='Ami rapide')).toBe(true);
  expect((await visitor.post('/api/rooms',{data:{action:'create',name:'Interdit',animal:'cheetah',nickname:'Ami rapide'}})).status()).toBe(403);
  await visitor.post('/api/rooms',{data:{action:'leave-current'}});
 }finally{await command(page.request,room.id,token,{action:'close'});await visitor.dispose()}
});

test('host settings synchronize, stable guest cookies avoid duplicates, and running races reject late arrivals',async({page,browser,playwright,baseURL})=>{
 const {room,token}=await createTestRoom(page.request,{name:'La clairière des amis'}),headers=memberHeaders(token),guest=await guestContext(playwright,baseURL,room.id,'Sam');
 const visitor=await browser.newContext({baseURL,storageState:await guest.request.storageState()}),view=await visitor.newPage(),late=await playwright.request.newContext({baseURL});
 try{
  await page.goto('/');await page.evaluate(({id,token})=>sessionStorage.setItem('guepard-room-'+id,token),{id:room.id,token});await page.goto('/lobby/'+room.id);
  await view.goto('/lobby/'+room.id);await view.getByRole('button',{name:/Entrer dans le salon/}).click();await expect(view.getByText('En attente du départ par l’hôte',{exact:true})).toBeVisible();
  const same=await (await guest.request.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Sam autre onglet'}})).json();expect(same.token).toBe(guest.token);expect(same.room.people).toHaveLength(2);
  await page.getByLabel('Longueur en mots').fill('200');await page.getByLabel('Longueur en mots').press('Tab');await expect(view.getByLabel('Longueur en mots')).toHaveValue('200');await expect(view.getByLabel('Visibilité')).toBeDisabled();
  await configureShortRace(page.request,room.id,token);await command(page.request,room.id,token,{action:'start'});
  const blocked=await late.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Retardataire'}});expect(blocked.status()).toBe(409);
  await waitForRace(page.request,room.id,token);await expect(view.getByLabel('Texte de la course')).toBeEnabled();
  await command(guest.request,room.id,guest.token,{action:'abandon'});await command(page.request,room.id,token,{action:'abandon'});await expect(page.getByRole('heading',{name:'Bravo à tous !'})).toBeVisible();
  const after=await late.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Retardataire'}});expect(after.ok()).toBeTruthy();expect((await after.json()).room.phase).toBe('finished');
  await page.setViewportSize({width:390,height:844});expect(await page.locator('body').evaluate(el=>el.scrollWidth)).toBe(390);
 }finally{await page.request.post('/api/rooms/'+room.id,{headers,data:{action:'close'}});await visitor.close();await guest.request.dispose();await late.dispose()}
});

test('private invitation status, recipient reconnection, expulsion and authenticated host transfer are enforced',async({request,playwright,baseURL})=>{
 const {room,token}=await createTestRoom(request,{name:'Classe privée',visibility:'private'}),nextHost=await playwright.request.newContext({baseURL}),intruder=await playwright.request.newContext({baseURL});
 let guest:Awaited<ReturnType<typeof guestContext>>|undefined,nextToken='';
 try{
  const links=await command(request,room.id,token,{action:'invite',count:2});expect(links.invitations).toHaveLength(2);
  guest=await guestContext(playwright,baseURL,room.id,'Élève invité',{invite:links.invitations[0].token});
  expect((await intruder.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Copie',invite:links.invitations[0].token}})).status()).toBe(403);
  await command(guest.request,room.id,guest.token,{action:'leave'});
  const replay=await guest.request.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Élève invité',invite:links.invitations[0].token}});expect(replay.ok()).toBeTruthy();guest={request:guest.request,...await replay.json()};
  await ensureAccount(nextHost);const joined=await nextHost.post('/api/rooms/'+room.id,{data:{action:'join',invite:links.invitations[1].token}});expect(joined.ok()).toBeTruthy();nextToken=(await joined.json()).token;
  const hostView=(await (await request.get('/api/rooms/'+room.id,{headers:memberHeaders(token)})).json()).room;expect(hostView.invitations.every((invitation:{used:boolean;usedName?:string})=>invitation.used&&invitation.usedName)).toBe(true);
  await command(request,room.id,token,{action:'kick',personId:guest!.room.me});
  expect((await guest!.request.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Élève invité',invite:links.invitations[0].token}})).status()).toBe(403);
  await command(request,room.id,token,{action:'leave'});
  const successor=(await (await nextHost.get('/api/rooms/'+room.id,{headers:memberHeaders(nextToken)})).json()).room;expect(successor.isHost).toBe(true);
  await command(nextHost,room.id,nextToken,{action:'close'});expect((await request.get('/api/rooms/'+room.id,{headers:memberHeaders(token)})).status()).toBe(404);
 }finally{await nextHost.post('/api/rooms/'+room.id,{headers:memberHeaders(nextToken||token),data:{action:'close'}});await request.post('/api/rooms/'+room.id,{headers:memberHeaders(token),data:{action:'close'}});await guest?.request.dispose();await nextHost.dispose();await intruder.dispose()}
});

test('capacity stops at thirty racers while spectators are admitted and stable identities occupy one room',async({request,playwright,baseURL})=>{
 const {room,token}=await createTestRoom(request,{capacity:30}),other=await playwright.request.newContext({baseURL}),spectator=await playwright.request.newContext({baseURL});
 let otherRoom:{room:{id:string};token:string}|undefined;
 try{
  for(let i=0;i<29;i++)await command(request,room.id,token,{action:'bot'});
  expect((await request.post('/api/rooms/'+room.id,{headers:memberHeaders(token),data:{action:'bot'}})).status()).toBe(409);
  const joined=await spectator.post('/api/rooms/'+room.id,{data:{action:'join',nickname:'Spectateur',role:'spectator'}});expect(joined.ok()).toBeTruthy();expect((await joined.json()).room.players).toBe(30);
  otherRoom=await createTestRoom(other);
  const conflict=await spectator.post('/api/rooms/'+otherRoom.room.id,{data:{action:'join',nickname:'Spectateur'}});expect(conflict.status()).toBe(409);expect(await conflict.json()).toMatchObject({code:'ROOM_MEMBERSHIP_CONFLICT',roomId:room.id});
  expect((await spectator.post('/api/rooms',{data:{action:'leave-current'}})).ok()).toBeTruthy();expect((await spectator.post('/api/rooms/'+otherRoom.room.id,{data:{action:'join',nickname:'Spectateur'}})).ok()).toBeTruthy();
 }finally{await request.post('/api/rooms/'+room.id,{headers:memberHeaders(token),data:{action:'close'}});if(otherRoom)await other.post('/api/rooms/'+otherRoom.room.id,{headers:memberHeaders(otherRoom.token),data:{action:'close'}});await other.dispose();await spectator.dispose()}
});

test('a signed guest becomes an account without duplicating membership and logout releases it',async({request,playwright,baseURL})=>{
 const {room,token}=await createTestRoom(request),guest=await guestContext(playwright,baseURL,room.id,'Visiteur');
 try{
  const user=await ensureAccount(guest.request);
  const restored=await guest.request.post('/api/rooms/'+room.id,{data:{action:'join'}});
  expect(restored.ok()).toBeTruthy();const current=(await restored.json()).room;
  expect(current.me).toBe(guest.room.me);expect(current.people).toHaveLength(2);
  expect(current.people.find((person:{id:string})=>person.id===current.me)).toMatchObject({kind:'demo',name:user.username});
  const conflict=await guest.request.post('/api/rooms',{data:{name:'Second salon',animal:'cheetah',visibility:'public'}});
  expect(conflict.status()).toBe(409);expect((await conflict.json()).code).toBe('ROOM_MEMBERSHIP_CONFLICT');
  expect((await guest.request.post('/api/auth',{data:{action:'logout'}})).ok()).toBeTruthy();
  const after=await request.get('/api/rooms/'+room.id,{headers:memberHeaders(token)});
  expect((await after.json()).room.people).toHaveLength(1);
 }finally{await command(request,room.id,token,{action:'close'});await guest.request.dispose()}
});
