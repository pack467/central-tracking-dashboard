const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));

  await page.goto('http://localhost:3000/tickets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const tabsInfo = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tab"]')).map(el => ({
      text: el.innerText.trim(),
      tag: el.tagName,
      role: el.getAttribute('role'),
      selected: el.getAttribute('aria-selected')
    }));
  });
  console.log('All tabs on /tickets:', tabsInfo);

  // Click Re-Open
  console.log('Clicking tab with text "Re-Open"...');
  await page.locator('[role="tablist"] button[role="tab"]').filter({ hasText: /^Re-Open$/ }).click();
  await page.waitForTimeout(500);
  console.log('URL after Re-Open click:', page.url());

  const rows = await page.locator('[role="table"] [role="row"]').count();
  console.log('Total table rows (including header):', rows);

  // Click RCA
  console.log('Clicking tab with text "RCA"...');
  await page.locator('[role="tablist"] button[role="tab"]').filter({ hasText: /^RCA$/ }).click();
  await page.waitForTimeout(500);
  console.log('URL after RCA click:', page.url());

  const rowsRCA = await page.locator('[role="table"] [role="row"]').count();
  console.log('Total table rows for RCA:', rowsRCA);

  await browser.close();
})();
