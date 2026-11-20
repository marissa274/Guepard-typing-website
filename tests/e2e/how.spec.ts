import {test,expect} from '@playwright/test';
test('four illustrated steps, navigation and reduced animation',async({page})=>{
 await page.goto('/how');await expect(page.getByRole('heading',{name:'UN CLAVIER. UNE COURSE.'})).toBeVisible();await expect(page.locator('.how-cards article')).toHaveCount(4);await expect(page.locator('.main-navigation a.active')).toHaveText('Comment jouer');await expect(page.getByRole('link',{name:/Rejoindre rapidement/})).toHaveAttribute('href','/play');await page.screenshot({path:'/tmp/guepard-how-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.locator('body').evaluate(el=>el.scrollWidth)).toBe(390);await page.screenshot({path:'/tmp/guepard-how-mobile.png',fullPage:true});await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.how-mini-tracks .race-runner').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});
test('unknown URL answers HTTP 404 with the missing-page view, real pages stay 200',async({page})=>{
 const missing=await page.goto('/nexiste-pas');expect(missing?.status()).toBe(404);await expect(page.getByRole('heading',{name:/Cette piste n’existe pas/})).toBeVisible();
 for(const path of ['/','/how','/races','/login','/signup','/about','/lobby/ABCDE'])expect((await page.goto(path))?.status(),path).toBe(200);
});
