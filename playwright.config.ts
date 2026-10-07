import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
const localChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({testDir:'./tests/e2e',timeout:45000,workers:1,use:{baseURL:'http://localhost:5173',headless:true,viewport:{width:1440,height:1050},launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||(existsSync(localChrome)?localChrome:undefined)}},webServer:{command:'npm run dev',url:'http://localhost:5173',reuseExistingServer:true,timeout:60000}});
