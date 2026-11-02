const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));

  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const options = await page.evaluate(() => {
    const sel = document.querySelector('select[aria-label="Filter status tiket"]');
    return Array.from(sel.options).map(o => ({ value: o.value, text: o.text, selected: o.selected }));
  });
  console.log('DOM options in browser:', options);

  for (const opt of options) {
    if (opt.value === 'All') continue;
    await page.selectOption('select[aria-label="Filter status tiket"]', opt.value);
    await page.waitForTimeout(500);
    console.log(`Selected ${opt.value} -> URL: ${page.url()} | current value:`, await page.$eval('select[aria-label="Filter status tiket"]', s => s.value));
  }

  await browser.close();
})();
