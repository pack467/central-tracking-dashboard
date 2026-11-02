const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // 1. Measure filter section in idle state
  const idleData = await page.evaluate(() => {
    const filterSection = document.getElementById('analytics-filter-section');
    if (!filterSection) return { error: 'filterSection not found' };

    const dateField = filterSection.querySelector('.date-field');
    const dateTrigger = dateField ? dateField.querySelector('[role="button"]') : null;
    const dateLabel = dateField ? dateField.querySelector('label') : null;
    const dateIcon = dateTrigger ? dateTrigger.querySelector('svg') : null;

    const projectField = filterSection.querySelector('.analytics-filter-field:nth-child(2)');
    const projectSelect = projectField ? projectField.querySelector('select') : null;
    const projectLabel = projectField ? projectField.querySelector('label') : null;
    const projectIcon = projectField ? projectField.querySelector('.analytics-select-icon') : null;

    const shiftField = filterSection.querySelector('.analytics-filter-field:nth-child(3)');
    const shiftSelect = shiftField ? shiftField.querySelector('select') : null;

    function getStyle(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return {
        rect: { width: r.width, height: r.height, top: r.top, bottom: r.bottom },
        height: s.height,
        padding: s.padding,
        paddingTop: s.paddingTop,
        paddingBottom: s.paddingBottom,
        paddingLeft: s.paddingLeft,
        paddingRight: s.paddingRight,
        borderWidth: s.borderWidth,
        borderTopWidth: s.borderTopWidth,
        borderColor: s.borderColor,
        borderStyle: s.borderStyle,
        borderRadius: s.borderRadius,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        color: s.color,
        backgroundColor: s.backgroundColor,
        boxShadow: s.boxShadow,
      };
    }

    return {
      dateTrigger: getStyle(dateTrigger),
      projectSelect: getStyle(projectSelect),
      shiftSelect: getStyle(shiftSelect),
      dateLabel: getStyle(dateLabel),
      projectLabel: getStyle(projectLabel),
      dateIcon: getStyle(dateIcon),
      projectIcon: getStyle(projectIcon),
    };
  });

  // 2. Click to open date picker popup on dashboard and measure open/focus state
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(400);

  const openData = await page.evaluate(() => {
    const filterSection = document.getElementById('analytics-filter-section');
    const dateField = filterSection ? filterSection.querySelector('.date-field') : null;
    const dateTrigger = dateField ? dateField.querySelector('[role="button"]') : null;
    const popup = document.querySelector('[role="dialog"][aria-label*="rentang"]');

    function getStyle(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return {
        rect: { width: r.width, height: r.height, top: r.top, bottom: r.bottom },
        height: s.height,
        borderWidth: s.borderWidth,
        borderColor: s.borderColor,
        borderRadius: s.borderRadius,
        boxShadow: s.boxShadow,
      };
    }

    return {
      dateTriggerOpen: getStyle(dateTrigger),
      popupPresent: !!popup,
    };
  });

  // 2b. Navigate to url with date=2026-09-01..2026-09-13
  await page.goto('http://localhost:3000/dashboard?date=2026-09-01..2026-09-13', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(400);

  const committedRangeData = await page.evaluate(() => {
    const popup = document.querySelector('[role="dialog"][aria-label*="rentang"]');
    if (!popup) return { error: 'no popup' };
    const buttons = Array.from(popup.querySelectorAll('.grid.grid-cols-7 button'));
    const days = buttons.map(b => {
      const s = window.getComputedStyle(b);
      return {
        text: b.textContent?.trim(),
        className: b.className,
        bg: s.backgroundColor,
        color: s.color,
        boxShadow: s.boxShadow,
        borderRadius: s.borderRadius,
      };
    });
    const grid = popup.querySelector('.grid.grid-cols-7.gap-y-\\[3px\\]') || popup.querySelectorAll('.grid.grid-cols-7')[1];
    const gs = grid ? window.getComputedStyle(grid) : null;
    return {
      gridGap: gs ? { gap: gs.gap, rowGap: gs.rowGap, columnGap: gs.columnGap } : null,
      days: days.filter(d => parseInt(d.text) >= 1 && parseInt(d.text) <= 15),
    };
  });
  console.log('=== COMMITTED RANGE 1-13 SEP DATA ===');
  console.log(JSON.stringify(committedRangeData, null, 2));

  // 4. Measure Monitoring History DatePicker vs its adjacent controls
  await page.goto('http://localhost:3000/monitoring/history', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const monitoringData = await page.evaluate(() => {
    const datePicker = document.querySelector('.w-\\[160px\\] [role="button"]') || document.querySelector('[aria-label*="tanggal"] [role="button"]');
    const buttons = Array.from(document.querySelectorAll('button'));
    const okBtn = buttons.find(b => b.textContent?.includes('OK'));
    const segmentedBtn = okBtn ? okBtn.parentElement : null;

    function getStyle(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return {
        rect: { width: r.width, height: r.height, top: r.top, bottom: r.bottom },
        height: s.height,
        padding: s.padding,
        borderWidth: s.borderWidth,
        borderColor: s.borderColor,
        borderRadius: s.borderRadius,
      };
    }

    return {
      monitoringDatePicker: getStyle(datePicker),
      segmentedParent: getStyle(segmentedBtn),
    };
  });

  // 5. Check global CSS outside @layer
  const globalCssRules = await page.evaluate(() => {
    const rules = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule.selectorText && (
            rule.selectorText.includes('datepicker') ||
            rule.selectorText.includes('date') ||
            rule.selectorText.includes('calendar') ||
            rule.selectorText.includes('filter')
          )) {
            rules.push({
              selector: rule.selectorText,
              cssText: rule.cssText,
            });
          }
        }
      } catch (e) {
        // Cross origin stylesheet ignore
      }
    }
    return rules;
  });

  console.log(JSON.stringify({
    idleData,
    openData,
    rangeTest,
    monitoringData,
    globalCssRules,
  }, null, 2));

  await browser.close();
})();
