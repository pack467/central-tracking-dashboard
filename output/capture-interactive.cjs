const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));
  await page.goto('http://localhost:3000/dashboard?date=2026-09-01..2026-09-13', { waitUntil: 'networkidle' });
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(300);

  // First click on Day 1: sets rangeStart to 2026-09-01
  const buttons = await page.$$('[role="dialog"] .grid.grid-cols-7 button');
  let btn1, btn8;
  for (const b of buttons) {
    const txt = (await b.textContent()).trim();
    if (txt === '1' && !btn1) btn1 = b;
    if (txt === '8' && !btn8) btn8 = b;
  }
  if (btn1) await btn1.click();
  await page.waitForTimeout(200);

  // Hover over Day 8: activates hoverDate = 2026-09-08 preview
  if (btn8) await btn8.hover();
  await page.waitForTimeout(300);

  const popup = await page.$('[role="dialog"]');
  if (popup) {
    await popup.screenshot({ path: path.join(__dirname, 'screenshots', 'scenario-2-interactive-preview.png') });
  }

  await browser.close();
})();
