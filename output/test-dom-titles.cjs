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
  await page.goto('http://localhost:3000/dashboard?mock=slow', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  const titles = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h1, h2, h3, h4, span, div')).map(el => el.textContent?.trim()).filter(t => t && t.length < 50 && (t.includes('Tiket') || t.includes('Dashboard') || t.includes('Live') || t.includes('Memuat'))).slice(0, 15);
  });
  console.log('Titles found:', titles);

  const mainClasses = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('main, section, article, [role="status"]')).map(el => ({
      tag: el.tagName,
      role: el.getAttribute('role'),
      className: el.className
    }));
  });
  console.log('Main elements:', mainClasses);

  await browser.close();
})();
