const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    window.sessionStorage.setItem('ctd_splash_seen', '1');
    window.localStorage.setItem('ctd_splash_seen', '1');
  });
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  const html = await page.evaluate(() => document.querySelector('.page-content')?.innerHTML || 'NO PAGE CONTENT');
  console.log('PAGE CONTENT (first 1000 chars):');
  console.log(html.slice(0, 1000));
  await browser.close();
})();
