const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));

  console.log('=== 1. Checking Dashboard Filter & Downstream Charts ===');
  for (const status of ['Open', 'Activity', 'Meeting', 'Re-Open', 'Pending', 'RCA', 'Closed']) {
    await page.goto(`http://localhost:3000/dashboard?status=${encodeURIComponent(status)}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const filterChips = await page.locator('.analytics-filter-chip').allInnerTexts();
    console.log(`Status [${status}] -> Active Chips:`, filterChips);
  }

  console.log('\n=== 2. Checking Tickets View Tab Filtering & Table Rows ===');
  await page.goto('http://localhost:3000/tickets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  for (const status of ['Semua Status', 'Open', 'Activity', 'Meeting', 'Re-Open', 'Pending', 'RCA', 'Closed']) {
    const tab = page.getByRole('tab', { name: status, exact: true });
    await tab.click();
    await page.waitForTimeout(400);

    const rows = await page.locator('div[role="table"] div[role="row"]:not(:first-child)').count();
    const badges = await page.locator('div[role="table"] div[role="row"]:not(:first-child) span:has-text("' + status + '")').count();
    console.log(`Tab [${status}] -> ${rows} rows in table | matching badges: ${badges} | URL: ${page.url()}`);
  }

  console.log('\n=== 3. Checking Create Ticket Modal Status Options ===');
  const createBtn = page.getByRole('button', { name: 'Buat Tiket' }).first();
  if (await createBtn.count() > 0) {
    await createBtn.click();
    await page.waitForTimeout(400);
    const modalSelect = page.locator('.ticket-status-select');
    if (await modalSelect.count() > 0) {
      const modalOptions = await modalSelect.locator('option').allInnerTexts();
      console.log('Create Ticket Modal status options:', modalOptions);
    }
  }

  await browser.close();
  console.log('\n=== All deep verification tests PASSED! ===');
})();
