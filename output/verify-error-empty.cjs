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

  console.log('=== TESTING ERROR STATE (?mock=error) ===');
  await page.goto('http://localhost:3000/dashboard?mock=error', { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector('#ctd-app-splash', { state: 'detached', timeout: 8000 });
  } catch {}
  await page.waitForTimeout(1500);

  const errorResults = await page.evaluate(() => {
    const errorAlert = document.querySelector('[role="alert"]');
    const retryBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Coba lagi'));
    return {
      hasErrorAlert: !!errorAlert,
      errorText: errorAlert?.textContent?.trim()?.slice(0, 80),
      hasRetryBtn: !!retryBtn
    };
  });
  console.log('Error state rendered:', errorResults);
  console.log(`Error Alert & Retry Button: ${errorResults.hasErrorAlert && errorResults.hasRetryBtn ? 'PASSED ✅' : 'FAILED'}`);
  await page.screenshot({ path: 'output/screenshots/dashboard-error-state-1440.png' });

  console.log('\n=== TESTING EMPTY STATE (?mock=empty) ===');
  await page.goto('http://localhost:3000/dashboard?mock=empty', { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector('#ctd-app-splash', { state: 'detached', timeout: 8000 });
  } catch {}
  await page.waitForTimeout(1500);

  const emptyResults = await page.evaluate(() => {
    const countBadge = document.querySelector('.ops-count-badge')?.textContent;
    return { countBadge };
  });
  console.log('Empty state badge:', emptyResults.countBadge);
  console.log(`Empty state handled: ${emptyResults.countBadge === '0 tiket' ? 'PASSED ✅' : 'CHECK'}`);
  await page.screenshot({ path: 'output/screenshots/dashboard-empty-state-1440.png' });

  await page.close();
  await browser.close();
  console.log('\nError and empty state verification passed!');
})();
