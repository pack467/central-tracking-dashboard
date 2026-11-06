const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.addInitScript(() => {
    window.sessionStorage.setItem('ctd_splash_seen', '1');
    window.localStorage.setItem('ctd_splash_seen', '1');
  });

  await page.goto('http://localhost:3000/dashboard?mock=0', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.today-ticket-row', { timeout: 10000 });

  const pageButtons = await page.$$eval('.today-page-num', els => els.map(e => ({ text: e.textContent, class: e.className })));
  console.log('Page buttons in DOM:', pageButtons);

  // Evaluate clicking directly from inside browser
  const clickResult = await page.evaluate(() => {
    const btn2 = Array.from(document.querySelectorAll('.today-page-num')).find(b => b.textContent.trim() === '2');
    if (!btn2) return 'Button 2 not found';
    btn2.click();
    return 'Clicked button 2';
  });
  console.log('clickResult:', clickResult);

  await page.waitForTimeout(1000);
  console.log('URL after evaluate click:', page.url());

  const activePageBtn = await page.$eval('.today-page-num.active', el => el.textContent);
  console.log('Active page button now:', activePageBtn);

  const firstTicket = await page.$eval('.today-ticket-row .today-ticket-id', el => el.textContent);
  console.log('First ticket ID now:', firstTicket);

  await browser.close();
})();
