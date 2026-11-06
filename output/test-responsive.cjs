const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const vp of [
    { name: 'desktop-1440', width: 1440, height: 900 },
    { name: 'laptop-1366', width: 1366, height: 768 },
    { name: 'tablet-1024', width: 1024, height: 768 },
    { name: 'mobile-768', width: 768, height: 1024 }
  ]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const userRecapEl = await page.locator('.user-summary-panel');
    if (await userRecapEl.count() > 0) {
      await userRecapEl.screenshot({ path: `output/recap-${vp.name}.png` });
    }
    const todayEl = await page.locator('.ops-today-panel');
    if (await todayEl.count() > 0) {
      await todayEl.screenshot({ path: `output/today-${vp.name}.png` });
    }
    console.log(`Generated screenshots for ${vp.name}`);
    await page.close();
  }
  await browser.close();
  console.log('All responsive screenshots generated successfully');
})();
