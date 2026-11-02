const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function measureExactPlots() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));

  const results = {};
  for (const pid of ['resolution-trend', 'ticket-volume', 'ticket-mom', 'shift-traffic']) {
    await page.goto(`http://localhost:3000/dashboard?panel=${pid}&mode=chart`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const m = await page.evaluate((panelId) => {
      const dialog = document.querySelector('[data-panel-viewer]');
      const main = dialog?.querySelector('main');
      const svg = main?.querySelector('svg[role="img"]');
      const mainRect = main?.getBoundingClientRect();
      const svgRect = svg?.getBoundingClientRect();

      return {
        panelId,
        mainWidth: mainRect?.width,
        mainHeight: mainRect?.height,
        svgWidth: svgRect?.width,
        svgHeight: svgRect?.height,
        widthCoveragePct: mainRect && svgRect ? ((svgRect.width / mainRect.width) * 100).toFixed(1) + '%' : '0%',
        heightCoveragePct: mainRect && svgRect ? ((svgRect.height / mainRect.height) * 100).toFixed(1) + '%' : '0%',
      };
    }, pid);
    results[pid] = m;
  }

  // Also check compact card on dashboard to guarantee it remained 100% untouched
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const compactCards = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.mgmt-velocity-panel, .report-panel-card, .ops-shift-panel')).map(c => ({
      className: c.className.slice(0, 50),
      hasViewBtn: !!c.querySelector('button[aria-label*="panel"], button[aria-label*="View"]'),
    }));
    return cards;
  });
  results.compactCards = compactCards;

  console.log('=== EXACT PLOT MEASUREMENTS ===');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
}
measureExactPlots();
