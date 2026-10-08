import {test,expect} from '@playwright/test';

test('four-person demo matches the reference viewport and fills the detailed page',async({page})=>{
 await page.setViewportSize({width:2688,height:1680});await page.goto('/demo/podium');
 await expect(page.getByText('Démonstration · 4 participants fictifs')).toBeVisible();
 const places=page.locator('.results-place');await expect(places).toHaveCount(3);
 expect(await places.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-rank')))).toEqual(['2','1','3']);
 await expect(places.nth(0).locator('.runner-gazelle')).toBeVisible();await expect(places.nth(1).locator('.runner-cheetah')).toBeVisible();await expect(places.nth(2).locator('.runner-hare')).toBeVisible();
 const ground=await page.locator('.results-wood-block').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().bottom));expect(Math.max(...ground)-Math.min(...ground)).toBeLessThan(2);
 const post=await page.locator('.celebration-sign-post').boundingBox();expect(Math.abs(post!.y+post!.height-ground[0])).toBeLessThan(2);
 await expect(page.locator('.podium-cheering-monkey')).toBeVisible();await expect(page.locator('.podium-flower')).toHaveCount(3);expect(await page.locator('.podium-flower-left').evaluate(el=>getComputedStyle(el).animationName)).toBe('podium-flower-sway');
 expect(await page.locator('body').evaluate(el=>el.scrollWidth)).toBe(2688);
 const footer=await page.locator('.compact-footer').boundingBox();expect(footer!.y+footer!.height).toBeLessThanOrEqual(1681);const monkey=await page.locator('.podium-cheering-monkey').boundingBox();expect(monkey!.y+monkey!.height).toBeLessThan(ground[0]+55);const title=await page.locator('.results-heading').boundingBox();expect(title!.y+title!.height).toBeLessThan((await places.nth(1).boundingBox())!.y);await page.screenshot({path:'/tmp/guepard-podium-demo-2688.png'});
 await page.getByRole('button',{name:'Voir mes statistiques'}).click();await expect(page).toHaveURL(/view=results/);
 await expect(page.locator('.results-table tbody tr')).toHaveCount(4);
 const width=await page.locator('.results-panels').evaluate(el=>el.getBoundingClientRect().width/window.innerWidth);expect(width).toBeGreaterThan(.8);
 await page.screenshot({path:'/tmp/guepard-demo-statistiques.png',fullPage:true});
 await page.setViewportSize({width:1024,height:768});await page.goto('/demo/podium');await expect(places).toHaveCount(3);expect(await page.locator('body').evaluate(el=>el.scrollWidth)).toBe(1024);await page.screenshot({path:'/tmp/guepard-podium-demo-tablet.png',fullPage:true});await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.podium-flower-left').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});
