import {test,expect} from '@playwright/test';

test('account settings persist profile, reject duplicates, and change password across sessions',async({page,browser,baseURL})=>{
 const suffix=Date.now().toString(36),username='Profile'+suffix,renamed='Renamed'+suffix,taken='Taken'+suffix;
 const password='JungleSecret42!',newPassword='NewJungleSecret42!';
 const signup=await page.request.post('/api/auth',{data:{action:'signup',username,password,confirmation:password,avatar:'cheetah'}});
 expect(signup.ok()).toBeTruthy();
 const other=await browser.newContext({baseURL});
 try{
  expect((await other.request.post('/api/auth',{data:{action:'login',username,password}})).ok()).toBeTruthy();
  const duplicate=await browser.newContext({baseURL});
  try{expect((await duplicate.request.post('/api/auth',{data:{action:'signup',username:taken,password,confirmation:password,avatar:'cheetah'}})).ok()).toBeTruthy()}finally{await duplicate.close()}
  await page.goto('/stats');
  await expect(page.locator('header .account summary')).toContainText(username);
  await page.locator('header .account summary').click();
  await page.getByRole('button',{name:'Paramètres',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Votre pseudo').fill(taken);
  await dialog.getByRole('button',{name:'Enregistrer le profil'}).click();
  await expect(dialog.getByRole('alert')).toContainText('déjà pris');
  await expect(page.locator('header .account summary')).toContainText(username);
  await dialog.getByLabel('Votre pseudo').fill(renamed);
  await dialog.getByRole('radio',{name:'Perroquet',exact:true}).check();
  await dialog.getByRole('button',{name:'Enregistrer le profil'}).click();
  await expect(dialog.getByRole('status')).toHaveText('Profil enregistré.');
  await expect(page.locator('header .account summary')).toContainText(renamed);
  await page.reload();
  await expect(page.locator('header .account summary')).toContainText(renamed);
  expect((await (await page.request.get('/api/auth')).json()).user.avatar).toBe('parrot');
  await page.locator('header .account summary').click();
  await page.getByRole('button',{name:'Paramètres',exact:true}).click();
  await dialog.getByLabel('Mot de passe actuel',{exact:true}).fill('incorrect');
  await dialog.getByLabel('Nouveau mot de passe',{exact:true}).fill(newPassword);
  await dialog.getByLabel('Confirmer le nouveau mot de passe').fill(newPassword);
  await dialog.getByRole('button',{name:'Modifier le mot de passe',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('actuel est incorrect');
  await dialog.getByLabel('Mot de passe actuel',{exact:true}).fill(password);
  await dialog.getByRole('button',{name:'Modifier le mot de passe',exact:true}).click();
  await expect(dialog.getByRole('status')).toContainText('Mot de passe modifié');
  await expect(dialog.getByLabel('Mot de passe actuel',{exact:true})).toHaveValue('');
  expect((await (await other.request.get('/api/auth')).json()).user).toBeNull();
  expect((await (await page.request.get('/api/auth')).json()).user.username).toBe(renamed);
  expect((await other.request.post('/api/auth',{data:{action:'login',username:renamed,password}})).status()).toBe(401);
  expect((await other.request.post('/api/auth',{data:{action:'login',username:renamed,password:newPassword}})).ok()).toBeTruthy();
 }finally{await other.close()}
});
