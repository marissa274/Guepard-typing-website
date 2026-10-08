import {test,expect} from '@playwright/test';

test('signup, session, logout and login use PostgreSQL',async({page})=>{
 const username='Jungle'+Date.now().toString(36),password='JungleSecret42!';
 await page.goto('/signup');
 await page.getByLabel('Nom d’utilisateur').fill(username);
 await page.getByLabel('Mot de passe',{exact:true}).fill(password);
 await page.getByLabel('Confirmer le mot de passe').fill(password);
 await page.getByRole('radio',{name:/Crocodile/}).check();
 await page.getByRole('button',{name:/Créer mon compte/}).click();
 await expect(page.locator('header .account summary')).toContainText(username);
 await page.reload();
 await expect(page.locator('header .account summary')).toContainText(username);
 const me=await page.request.get('/api/auth');
 expect((await me.json()).user.avatar).toBe('crocodile');
 await page.locator('header .account summary').click();
 await page.getByRole('button',{name:'Déconnexion'}).click();
 await expect(page.locator('header').getByRole('link',{name:'Se connecter'})).toBeVisible();
 await page.goto('/login');
 await page.getByLabel('Nom d’utilisateur').fill(username);
 await page.getByLabel('Mot de passe',{exact:true}).fill('bad-password');
 await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await expect(page.locator('.auth-notice')).toContainText('incorrect');
 await page.getByLabel('Mot de passe',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await expect(page.locator('header .account summary')).toContainText(username);
});
