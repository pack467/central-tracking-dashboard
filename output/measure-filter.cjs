const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const res = await page.evaluate(() => {
    const fs = document.getElementById('analytics-filter-section');
    const dt = fs.querySelector('.date-field [role="button"]');
    const dl = fs.querySelector('.date-field label');
    const di = dt ? dt.querySelector('svg') : null;

    const ps = fs.querySelector('.analytics-filter-field:nth-child(2) select');
    const pl = fs.querySelector('.analytics-filter-field:nth-child(2) label');
    const pi = fs.querySelector('.analytics-filter-field:nth-child(2) .analytics-select-icon');

    function s(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        rect: { top: r.top, bottom: r.bottom, height: r.height, width: r.width },
        height: cs.height,
        padding: cs.padding,
        border: cs.border,
        borderWidth: cs.borderWidth,
        borderColor: cs.borderColor,
        borderRadius: cs.borderRadius,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        color: cs.color,
        boxShadow: cs.boxShadow,
        margin: cs.margin,
      };
    }
    return {
      dateTrigger: s(dt),
      projectSelect: s(ps),
      dateLabel: s(dl),
      projectLabel: s(pl),
      dateIcon: di ? { w: di.getBoundingClientRect().width, h: di.getBoundingClientRect().height, color: window.getComputedStyle(di).color } : null,
      projectIcon: pi ? { w: pi.getBoundingClientRect().width, h: pi.getBoundingClientRect().height, color: window.getComputedStyle(pi).color } : null,
    };
  });
  console.log('IDLE FILTER:\n', JSON.stringify(res, null, 2));

  // Focus and open states
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(300);

  const openRes = await page.evaluate(() => {
    const fs = document.getElementById('analytics-filter-section');
    const dt = fs.querySelector('.date-field [role="button"]');
    const dl = fs.querySelector('.date-field label');
    const di = dt ? dt.querySelector('svg') : null;
    const r = dt.getBoundingClientRect();
    const cs = window.getComputedStyle(dt);
    return {
      dateTrigger: {
        rect: { top: r.top, bottom: r.bottom, height: r.height, width: r.width },
        height: cs.height,
        border: cs.border,
        borderColor: cs.borderColor,
        boxShadow: cs.boxShadow,
      },
      dateLabelTop: dl ? dl.getBoundingClientRect().top : null,
      dateIconColor: di ? window.getComputedStyle(di).color : null,
    };
  });
  console.log('OPEN FILTER:\n', JSON.stringify(openRes, null, 2));

  await browser.close();
})();
