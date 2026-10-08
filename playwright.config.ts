import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
const localChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port=Number(process.env.GUEPARD_TEST_PORT||5173);
const isolated=Boolean(process.env.GUEPARD_TEST_PORT);
const baseURL=isolated?`http://127.0.0.1:${port}`:`http://localhost:${port}`;
export default defineConfig({testDir:'./tests/e2e',timeout:45000,workers:1,use:{baseURL,headless:true,viewport:{width:1440,height:1050},launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||(existsSync(localChrome)?localChrome:undefined)}},webServer:{command:isolated?`APP_URL=${baseURL} npx next start -p ${port} -H 127.0.0.1`:'npm run dev',url:baseURL,reuseExistingServer:true,timeout:60000}});
