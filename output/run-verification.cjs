const path = require('path');
const fs = require('fs');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'laptop', width: 1280, height: 800 },
    { name: 'desktop', width: 1920, height: 1080 }
  ];

  // 1. Multi-viewport screenshots of Filter section and Date Picker on Dashboard and Tickets
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));

    // Dashboard Idle
    await page.goto('http://localhost:3000/dashboard?date=2026-09-01..2026-09-13', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    // Scroll to filter section
    const filterSection = await page.$('#analytics-filter-section');
    if (filterSection) {
      await filterSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await filterSection.screenshot({ path: path.join(SCREENSHOT_DIR, `dashboard-filter-idle-${vp.name}.png`) });

      // Click date trigger to open popup
      await page.click('.date-field [role="button"]');
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `dashboard-calendar-open-${vp.name}.png`) });
    }

    // Tickets page
    await page.goto('http://localhost:3000/tickets', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const ticketsFilter = await page.$('.flex.items-center.gap-2.flex-wrap') || await page.$('main');
    if (ticketsFilter) {
      await ticketsFilter.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `tickets-view-${vp.name}.png`) });
    }

    // Monitoring History page
    await page.goto('http://localhost:3000/monitoring/history', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const monFilter = await page.$('.w-\\[160px\\]') || await page.$('main');
    if (monFilter) {
      await monFilter.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `monitoring-history-${vp.name}.png`) });
    }

    await page.close();
  }

  // 2. Specific calendar scenarios on Desktop (1920x1080)
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));

  // Scenario A: Belum ada pilihan (empty)
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(300);
  const popupA = await page.$('[role="dialog"]');
  if (popupA) await popupA.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-1-empty-calendar.png') });

  // Scenario B: Satu hari saja (Single day 5 Sep 2026)
  await page.goto('http://localhost:3000/dashboard?date=2026-09-05', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(300);
  const popupB = await page.$('[role="dialog"]');
  if (popupB) await popupB.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-3-single-day.png') });

  // Scenario C: Rentang satu baris (e.g. 2 Sep..5 Sep)
  await page.goto('http://localhost:3000/dashboard?date=2026-09-02..2026-09-05', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(300);
  const popupC = await page.$('[role="dialog"]');
  if (popupC) await popupC.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-4-same-row-range.png') });

  // Scenario D: Rentang multi-baris (1 Sep..13 Sep)
  await page.goto('http://localhost:3000/dashboard?date=2026-09-01..2026-09-13', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(300);
  const popupD = await page.$('[role="dialog"]');
  if (popupD) await popupD.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-5-multi-row-range.png') });

  // Scenario E: Rentang berawal di SEN (7 Sep) dan berakhir di MIN (13 Sep)
  await page.goto('http://localhost:3000/dashboard?date=2026-09-07..2026-09-13', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(300);
  const popupE = await page.$('[role="dialog"]');
  if (popupE) await popupE.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-7-sen-to-min-range.png') });

  // Scenario F: Rentang lintas bulan (28 Aug..10 Sep)
  await page.goto('http://localhost:3000/dashboard?date=2026-08-28..2026-09-10', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(300);
  const popupF = await page.$('[role="dialog"]');
  if (popupF) await popupF.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-6-cross-month-range.png') });

  // Scenario G: Preset "Minggu Ini"
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(300);
  // Click preset "Minggu Ini"
  const presets = await page.$$('[role="dialog"] [role="toolbar"] button');
  for (const p of presets) {
    const text = await p.textContent();
    if (text?.includes('Minggu Ini')) {
      await p.click();
      break;
    }
  }
  await page.waitForTimeout(300);
  // Re-open to see preset highlighted
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(300);
  const popupG = await page.$('[role="dialog"]');
  if (popupG) await popupG.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-8-preset-minggu-ini.png') });

  // Scenario H: Keyboard focus-visible mode
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  const popupH = await page.$('[role="dialog"]');
  if (popupH) await popupH.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-9-keyboard-focus.png') });

  // Scenario I: Interactive preview (first date clicked, hovering over second date)
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(300);
  // Click on date 1
  const day1Btn = await page.$('[role="dialog"] .grid.grid-cols-7:nth-of-type(2) > div:nth-child(2) button');
  if (day1Btn) {
    await day1Btn.click();
    await page.waitForTimeout(200);
    // Hover on date 8
    const day8Btn = await page.$('[role="dialog"] .grid.grid-cols-7:nth-of-type(2) > div:nth-child(9) button');
    if (day8Btn) {
      await day8Btn.hover();
      await page.waitForTimeout(200);
    }
  }
  const popupI = await page.$('[role="dialog"]');
  if (popupI) await popupI.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-2-interactive-preview.png') });

  console.log('All verification scenarios executed and screenshots captured.');
  await browser.close();
})();
