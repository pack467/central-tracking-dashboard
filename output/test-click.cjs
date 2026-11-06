const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function testClick() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 910 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });

  console.log('Page loaded. URL:', page.url());
  
  // Find all buttons with panelTitle or aria-label
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText,
      ariaLabel: b.getAttribute('aria-label'),
      title: b.getAttribute('title'),
      className: b.className,
    })).filter(b => b.ariaLabel?.includes('panel') || b.text?.includes('View'));
  });
  console.log('Found View buttons:', buttons);

  const btn = page.locator('button[aria-label="Perbesar panel Tren Durasi Penyelesaian"]').first();
  console.log('Is button visible:', await btn.isVisible());
  await btn.click();
  await page.waitForTimeout(1000);
  console.log('URL after click:', page.url());

  const dialog = await page.locator('div[role="dialog"]').count();
  console.log('Dialog count:', dialog);
  const panelViewer = await page.locator('.panel-viewer-modal').count();
  console.log('Panel viewer count:', panelViewer);

  const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
  console.log('Body style overflow:', bodyOverflow);

  await browser.close();
}
testClick();
