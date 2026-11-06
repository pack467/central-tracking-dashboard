const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function testScrollLockBugScenarios() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 910 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });

  console.log('--- Testing Scenario 1: Modal interaction and close ---');
  // Open volume viewer
  await page.locator('button[aria-label*="Volume Tiket"]').first().click();
  await page.waitForSelector('.panel-viewer-modal');
  console.log('Opened. body style overflow:', await page.evaluate(() => document.body.style.overflow));

  // Toggle mode to table
  await page.locator('header button[title="Tampilkan tabel data"]').click();
  await page.waitForTimeout(200);

  // Switch to mom
  await page.locator('header button:has-text("Bulan Lalu vs Ini")').click();
  await page.waitForTimeout(200);

  // Close via Esc
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const overflowAfterEsc = await page.evaluate(() => document.body.style.overflow);
  console.log('Overflow after Esc:', overflowAfterEsc);

  // Test actual mouse wheel scroll on dashboard
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(200);
  const scrollAfter = await page.evaluate(() => window.scrollY);
  console.log(`Scroll before: ${scrollBefore}, after wheel: ${scrollAfter}, scrolled delta: ${scrollAfter - scrollBefore}`);

  console.log('--- Testing Scenario 2: Deep Link directly opened then navigate back ---');
  await page.goto('http://localhost:3000/dashboard?panel=ticket-volume', { waitUntil: 'networkidle' });
  await page.waitForSelector('.panel-viewer-modal');
  console.log('Deep link opened. body style overflow:', await page.evaluate(() => document.body.style.overflow));

  // Click Dashboard button
  await page.locator('header button[aria-label="Kembali ke Dashboard"]').click();
  await page.waitForTimeout(500);

  const overflowAfterDeepLinkClose = await page.evaluate(() => document.body.style.overflow);
  console.log('Overflow after deep link close:', overflowAfterDeepLinkClose);

  // Test scroll
  const scrollBefore2 = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(200);
  const scrollAfter2 = await page.evaluate(() => window.scrollY);
  console.log(`Deep link close - scroll before: ${scrollBefore2}, after wheel: ${scrollAfter2}, scrolled delta: ${scrollAfter2 - scrollBefore2}`);

  console.log('--- Testing Scenario 3: What if document.body.style.overflow is already set before opening? ---');
  await page.evaluate(() => {
    // If another component or user interaction set body overflow
    document.body.style.overflow = 'hidden';
  });
  // Now open viewer
  await page.locator('button[aria-label*="Volume Tiket"]').first().click();
  await page.waitForSelector('.panel-viewer-modal');
  // Close viewer
  await page.locator('header button[aria-label="Kembali ke Dashboard"]').click();
  await page.waitForTimeout(500);
  const leakOverflow = await page.evaluate(() => document.body.style.overflow);
  console.log('Leaked body style overflow when prevOverflow was hidden:', leakOverflow);

  await browser.close();
}
testScrollLockBugScenarios();
