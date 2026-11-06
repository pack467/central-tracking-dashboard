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

  // Click the first ticket to open drawer
  await page.locator('[role="table"] a[role="row"]').first().click();
  await page.waitForTimeout(600);

  // In the drawer, click "Edit Ticket"
  const editBtn = page.getByRole('button', { name: 'Edit Ticket' });
  await editBtn.click();
  await page.waitForTimeout(500);

  const selects = await page.locator('select').all();
  for (const s of selects) {
    const opts = await s.locator('option').allInnerTexts();
    if (opts.includes('Open') && opts.includes('Closed')) {
      console.log('TicketEditModal status options:', opts);
    }
  }

  await browser.close();
  console.log('Edit modal check complete!');
})();
