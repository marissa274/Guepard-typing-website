import {test,expect} from '@playwright/test';
import sharp from 'sharp';

test('profile photo validates real image bytes, resizes, persists and can be removed',async({page,browser,baseURL})=>{
 const image=await sharp({create:{width:640,height:320,channels:3,background:'#338855'}}).png().toBuffer();
 const anonymous=await browser.newContext({baseURL});
 try{expect((await anonymous.request.post('/api/auth/avatar',{multipart:{photo:{name:'photo.png',mimeType:'image/png',buffer:image}}})).status()).toBe(401)}finally{await anonymous.close()}
 const username='Photo'+Date.now().toString(36),password='PhotoSecret42!';
 expect((await page.request.post('/api/auth',{data:{action:'signup',username,password,confirmation:password,avatar:'cheetah'}})).ok()).toBeTruthy();
 expect((await page.request.post('/api/auth/avatar',{multipart:{photo:{name:'photo.png',mimeType:'image/png',buffer:Buffer.alloc(2*1024*1024+1)}}})).status()).toBe(413);
 expect((await page.request.post('/api/auth/avatar',{multipart:{photo:{name:'photo.png',mimeType:'image/png',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')}}})).status()).toBe(400);
 expect((await page.request.post('/api/auth/avatar',{multipart:{photo:{name:'photo.jpg',mimeType:'image/jpeg',buffer:image}}})).status()).toBe(400);
 await page.goto('/stats');await expect(page.locator('header .account summary')).toContainText(username);
 await page.locator('header .account summary').click();await page.getByRole('button',{name:'Paramètres',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Photo de profil',{exact:true}).setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:image});
 await dialog.getByRole('button',{name:'Téléverser la photo'}).click();await expect(dialog.getByRole('status')).toHaveText('Photo enregistrée.');
 await page.reload();await expect(page.locator('header .account summary img')).toBeVisible();
 const user=(await (await page.request.get('/api/auth')).json()).user;
 expect(user.avatarUrl).toMatch(/^\/api\/avatars\/[a-f0-9-]+\?v=/);
 const stored=await page.request.get(user.avatarUrl);expect(stored.headers()['content-type']).toBe('image/webp');
 const metadata=await sharp(await stored.body()).metadata();expect(metadata.width).toBe(256);expect(metadata.height).toBe(256);expect(metadata.exif).toBeUndefined();
 await page.locator('header .account summary').click();await page.getByRole('button',{name:'Paramètres',exact:true}).click();
 await dialog.getByRole('button',{name:'Supprimer la photo'}).click();await expect(dialog.getByRole('status')).toHaveText('Photo supprimée.');
 await page.reload();await expect(page.locator('header .account summary img')).toHaveCount(0);
 expect((await (await page.request.get('/api/auth')).json()).user.avatarUrl).toBeUndefined();
 expect((await page.request.get(user.avatarUrl)).status()).toBe(404);
});
