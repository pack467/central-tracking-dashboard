const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));
  await page.goto('http://localhost:3000/dashboard?date=2026-09-01..2026-09-13', { waitUntil: 'networkidle' });
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(400);

  const calData = await page.evaluate(() => {
    const popup = document.querySelector('[role="dialog"]');
    const daysGrid = popup.querySelectorAll('.grid.grid-cols-7')[1];
    const cellWrappers = Array.from(daysGrid.children);

    return cellWrappers.slice(0, 16).map((cell, idx) => {
      const ribbon = cell.querySelector('[aria-hidden="true"]');
      const btn = cell.querySelector('button');
      const bStyle = btn ? window.getComputedStyle(btn) : null;
      const rStyle = ribbon ? window.getComputedStyle(ribbon) : null;

      return {
        idx,
        text: btn?.textContent?.trim(),
        hasRibbon: !!ribbon,
        ribbonBg: rStyle?.backgroundColor,
        ribbonRect: ribbon ? {
          left: ribbon.getBoundingClientRect().left,
          right: ribbon.getBoundingClientRect().right,
          width: ribbon.getBoundingClientRect().width,
          borderTopLeftRadius: rStyle?.borderTopLeftRadius,
          borderTopRightRadius: rStyle?.borderTopRightRadius,
          borderBottomLeftRadius: rStyle?.borderBottomLeftRadius,
          borderBottomRightRadius: rStyle?.borderBottomRightRadius,
        } : null,
        btnBg: bStyle?.backgroundColor,
        btnColor: bStyle?.color,
        btnFontWeight: bStyle?.fontWeight,
        btnBoxShadow: bStyle?.boxShadow,
        btnBorderRadius: bStyle?.borderRadius,
      };
    });
  });

  console.log('CALENDAR DAYS INSPECT:\n', JSON.stringify(calData, null, 2));
  await browser.close();
})();
