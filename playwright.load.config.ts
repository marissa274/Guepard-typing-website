import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
/**
 * Configuration dédiée au test de charge (npm run test:load). Elle est volontairement séparée de
 * playwright.config.ts : le test ne tourne ni dans `npm test`, ni dans `npm run test:e2e`, ni en CI.
 * Le serveur n'est PAS démarré ici : lancez un build de production (voir docs/perf/course-30-joueurs.md).
 */
const localChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({
 testDir:'./tests/load',
 timeout:300000,
 workers:1,
 retries:0,
 reporter:'list',
 outputDir:'./test-results/load',
 use:{
  baseURL:process.env.LOAD_BASE_URL||'http://127.0.0.1:5190',
  locale:'fr-CA',headless:true,viewport:{width:1440,height:1050},
  launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||(existsSync(localChrome)?localChrome:undefined)},
 },
});
