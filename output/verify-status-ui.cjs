const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));

  console.log('--- 1. Testing Dashboard Status Filter ---');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check Status filter options in Dashboard
  const statusSelect = page.locator('select[aria-label="Filter status tiket"]');
  const count = await statusSelect.count();
  console.log('Status select found:', count > 0);

  if (count > 0) {
    const options = await statusSelect.locator('option').allInnerTexts();
    console.log('Dashboard status options:', options);

    // Test selecting a few statuses
    for (const val of ['Open', 'Activity', 'Meeting', 'Re-Open', 'RCA', 'Pending', 'Closed']) {
      await statusSelect.selectOption(val);
      await page.waitForTimeout(400);
      const url = page.url();
      console.log(`Selected "${val}" -> URL:`, url);
    }
  }

  console.log('\n--- 2. Testing Tickets Page Status Tabs ---');
  await page.goto('http://localhost:3000/tickets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const tabs = page.locator('div[role="tablist"] button[role="tab"]');
  const tabTexts = await tabs.allInnerTexts();
  console.log('Tickets page status tabs:', tabTexts);

  // Click on "Re-Open" tab
  const reopenTab = tabs.filter({ hasText: 'Re-Open' });
  if (await reopenTab.count() > 0) {
    await reopenTab.click();
    await page.waitForTimeout(500);
    console.log('Clicked Re-Open tab, URL:', page.url());
  }

  // Click on "RCA" tab
  const rcaTab = tabs.filter({ hasText: 'RCA' });
  if (await rcaTab.count() > 0) {
    await rcaTab.click();
    await page.waitForTimeout(500);
    console.log('Clicked RCA tab, URL:', page.url());
  }

  await browser.close();
  console.log('\nAll checks completed successfully!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
