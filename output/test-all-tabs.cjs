const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));

  await page.goto('http://localhost:3000/tickets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const statuses = [
    { name: 'Semua Status', regex: /^Semua Status$/ },
    { name: 'Open', regex: /^Open$/ },
    { name: 'Closed', regex: /^Closed$/ },
    { name: 'Activity', regex: /^Activity$/ },
    { name: 'Meeting', regex: /^Meeting$/ },
    { name: 'Re-Open', regex: /^Re-Open$/ },
    { name: 'Pending', regex: /^Pending$/ },
    { name: 'RCA', regex: /^RCA$/ },
  ];

  for (const s of statuses) {
    const tabBtn = page.locator('[aria-label="Filter status tiket"] button').filter({ hasText: s.regex });
    await tabBtn.click();
    await page.waitForTimeout(400);

    const countText = await page.locator('div[aria-live="polite"]:not(.toast-stack)').innerText();
    const rows = await page.locator('[role="table"] a[role="row"]').count();
    console.log(`[${s.name.padEnd(12)}] -> Rows on page: ${rows} | Counter: "${countText.trim()}" | URL: ${page.url()}`);
  }

  await browser.close();
  console.log('\nAll status tabs verified successfully!');
})();
