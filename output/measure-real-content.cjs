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
  await page.goto('http://localhost:3000/dashboard?mock=0', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const realMetrics = await page.evaluate(() => {
    const list = document.querySelector('.today-ticket-list');
    const rows = list ? Array.from(list.children) : [];
    const panel = document.querySelector('.ops-today-panel');
    const body = document.querySelector('.ops-today-panel .report-panel-body');
    const pagi = panel?.querySelector('.report-pagi-bar, [class*="pagination"], [aria-label*="Pagination"]');

    return {
      panelHeight: panel?.offsetHeight,
      bodyHeight: body?.offsetHeight,
      listHeight: list?.offsetHeight,
      pagiHeight: pagi?.offsetHeight,
      rowCount: rows.length,
      rowHeights: rows.map(r => r.offsetHeight),
      firstRowHeight: rows[0]?.offsetHeight,
      emptySpace: (body?.offsetHeight || 0) - (list?.offsetHeight || 0) - (pagi?.offsetHeight || 0)
    };
  });
  console.log('REAL CONTENT METRICS:', realMetrics);
  await browser.close();
})();
