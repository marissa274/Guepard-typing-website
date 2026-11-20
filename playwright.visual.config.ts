import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
/**
 * Visual non-regression (TECH-03): screenshots and computed styles against a production build.
 * Requires `npm run build` and a dedicated, migrated PostgreSQL database in DATABASE_URL (the lobby and race
 * states need a host account; a database shared with the E2E would list their rooms on /races).
 * Example: DATABASE_URL=postgresql://…/guepard_visual GUEPARD_TEST_PORT=5180 npm run test:visual
 */
const localChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port=Number(process.env.GUEPARD_TEST_PORT||5180);
const baseURL=`http://localhost:${port}`;
export default defineConfig({
 testDir:'./tests/visual',
 snapshotPathTemplate:'{testDir}/__screenshots__/{arg}{ext}',
 timeout:60000,
 workers:1,
 fullyParallel:false,
 reporter:[['list']],
 expect:{toHaveScreenshot:{animations:'disabled',caret:'hide',maxDiffPixelRatio:0.001}},
 use:{baseURL,locale:'fr-CA',timezoneId:'America/Toronto',colorScheme:'light',headless:true,deviceScaleFactor:1,launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||(existsSync(localChrome)?localChrome:undefined)}},
 webServer:{command:`AUTH_SECRET=guepard-visual-only-secret APP_URL=${baseURL} npx next start -p ${port} -H 127.0.0.1`,url:baseURL,reuseExistingServer:false,timeout:60000},
});
