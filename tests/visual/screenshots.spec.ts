import {test,expect} from '@playwright/test';
import {screenshotCases,openCase} from './states';

for(const visual of screenshotCases){
 test(`screenshot ${visual.id}`,async({page,baseURL})=>{
  const cleanup=await openCase(page,visual,baseURL!);
  try{
   const options={animations:'disabled' as const,caret:'hide' as const,maxDiffPixelRatio:0.001,mask:(visual.scenario.masks||[]).map(selector=>page.locator(selector))};
   if(visual.scenario.shot)await expect(page.locator(visual.scenario.shot).first()).toHaveScreenshot(`${visual.id}.png`,options);
   else await expect(page).toHaveScreenshot(`${visual.id}.png`,options);
  }finally{await cleanup?.()}
 });
}
