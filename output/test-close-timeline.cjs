const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function testCloseTimeline() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 910 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });

  // Open viewer
  await page.locator('button[aria-label*="Tren Durasi Penyelesaian"]').first().click();
  await page.waitForSelector('.panel-viewer-modal', { state: 'attached' });
  console.log('Viewer opened. URL:', page.url());
  console.log('Body overflow while open:', await page.evaluate(() => document.body.style.overflow));

  // Click close button
  console.log('Clicking close button...');
  await page.locator('header button[aria-label="Kembali ke Dashboard"]').click();

  for (let ms = 100; ms <= 2000; ms += 200) {
    await page.waitForTimeout(200);
    const info = await page.evaluate(() => ({
      url: window.location.href,
      modalCount: document.querySelectorAll('.panel-viewer-modal').length,
      bodyOverflow: document.body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow,
    }));
    console.log(`At ~${ms}ms: modalCount=${info.modalCount}, bodyOverflow="${info.bodyOverflow}", url="${info.url}"`);
    if (info.modalCount === 0) {
      console.log('Modal unmounted successfully!');
      break;
    }
  }

  await browser.close();
}
testCloseTimeline();
