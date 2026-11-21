import {expect,test} from '@playwright/test';

for(const width of [320,360,390,768,1100,1440])for(const lang of ['fr','en'])for(const theme of ['light','dark']){
 test(`home controls remain readable and clear of decorations at ${width}px · ${lang} · ${theme}`,async({page,context,baseURL})=>{
  await page.setViewportSize({width,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await context.addCookies([
   {name:'guepard-lang',value:lang,url:baseURL!},
   {name:'guepard-theme',value:theme,url:baseURL!},
  ]);
  await page.route('**/api/auth',route=>route.fulfill({json:{user:null}}));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
  await page.evaluate(()=>document.fonts.ready);
  const form=page.locator('.home-code-entry');
  await expect(form.locator('input')).toBeVisible();
  const layout=await form.evaluate(element=>{
   const field=element.querySelector('input')!,button=element.querySelector('button')!;
   const style=getComputedStyle(field),canvas=document.createElement('canvas'),pen=canvas.getContext('2d')!;
   pen.font=style.font;
   const placeholder=style.textTransform==='uppercase'?field.placeholder.toUpperCase():field.placeholder;
   const fieldSpace=field.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
   const rect=button.getBoundingClientRect(),mascot=document.querySelector('.jungle-mascot')!.getBoundingClientRect();
   return {fieldSpace,placeholderWidth:pen.measureText(placeholder).width,buttonBottom:rect.bottom,mascotTop:mascot.top,
    left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right};
  });
  expect(layout.fieldSpace,'the complete code placeholder fits').toBeGreaterThanOrEqual(layout.placeholderWidth);
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(width);
  if(width<=1250)expect(layout.buttonBottom,'the mascot stays below the code controls').toBeLessThanOrEqual(layout.mascotTop);
  const links=page.locator('.board-action');
  await expect(links).toHaveCount(3);
  for(const link of await links.all()){
   await link.scrollIntoViewIfNeeded();
   const clear=await link.evaluate(element=>{
    const rect=element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2));
   });
   expect(clear,'each home action remains reachable').toBe(true);
  }
 });
}

test('a refused code remains editable and announced on mobile',async({page,context,baseURL})=>{
 await page.setViewportSize({width:320,height:740});
 await context.addCookies([{name:'guepard-lang',value:'fr',url:baseURL!}]);
 await page.route('**/api/auth',route=>route.fulfill({json:{user:null}}));
 await page.route('**/api/rooms',route=>route.fulfill({status:404,json:{error:'Code introuvable.'}}));
 await page.goto('/');
 const form=page.locator('.home-code-entry');
 await form.locator('input').fill('ABC234');
 await form.locator('button').click();
 await expect(page.locator('.home-main [role="alert"]')).toContainText('Code introuvable.');
 await expect(form.locator('input')).toHaveAttribute('aria-invalid','true');
 await expect(form.locator('input')).toBeEditable();
 await expect(form.locator('button')).toBeEnabled();
});
