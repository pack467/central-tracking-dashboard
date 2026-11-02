const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));

  // 1. Dashboard filter measurements (idle)
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const filterIdle = await page.evaluate(() => {
    const fs = document.getElementById('analytics-filter-section');
    const dateField = fs.querySelector('.date-field');
    const dateTrigger = dateField ? dateField.querySelector('[role="button"]') : null;
    const dateLabel = dateField ? dateField.querySelector('label') : null;
    const dateIcon = dateTrigger ? dateTrigger.querySelector('svg') : null;

    const projectField = fs.querySelector('.analytics-filter-field:nth-child(2)');
    const projectSelect = projectField ? projectField.querySelector('select') : null;
    const projectLabel = projectField ? projectField.querySelector('label') : null;
    const projectIcon = projectField ? projectField.querySelector('.analytics-select-icon') : null;

    const shiftField = fs.querySelector('.analytics-filter-field:nth-child(3)');
    const shiftSelect = shiftField ? shiftField.querySelector('select') : null;

    function s(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        rect: { width: r.width, height: r.height, top: r.top, bottom: r.bottom },
        height: cs.height,
        padding: cs.padding,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
        border: cs.border,
        borderWidth: cs.borderWidth,
        borderColor: cs.borderColor,
        borderRadius: cs.borderRadius,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        boxShadow: cs.boxShadow,
        outline: cs.outline,
        margin: cs.margin,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
      };
    }

    function iconInfo(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        width: r.width,
        height: r.height,
        color: cs.color,
      };
    }

    const grid = fs.querySelector('.grid') || fs.querySelector('.report-filter-grid') || fs;
    const gridStyle = window.getComputedStyle(grid);

    return {
      gridAlignItems: gridStyle.alignItems,
      gridClass: grid.className,
      dateColWrapper: s(dateField),
      projectColWrapper: s(projectField),
      dateTrigger: s(dateTrigger),
      projectSelect: s(projectSelect),
      shiftSelect: s(shiftSelect),
      dateLabel: s(dateLabel),
      projectLabel: s(projectLabel),
      dateIcon: iconInfo(dateIcon),
      projectIcon: iconInfo(projectIcon),
    };
  });

  // 2. Open popup / focus state
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(300);

  const filterOpen = await page.evaluate(() => {
    const fs = document.getElementById('analytics-filter-section');
    const dateField = fs.querySelector('.date-field');
    const dateTrigger = dateField ? dateField.querySelector('[role="button"]') : null;
    const dateLabel = dateField ? dateField.querySelector('label') : null;

    function s(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        rect: { width: r.width, height: r.height, top: r.top, bottom: r.bottom },
        height: cs.height,
        border: cs.border,
        borderWidth: cs.borderWidth,
        borderColor: cs.borderColor,
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow,
      };
    }

    return {
      dateTrigger: s(dateTrigger),
      dateLabelTop: dateLabel ? dateLabel.getBoundingClientRect().top : null,
    };
  });

  // 3. Calendar with range 1 - 13 Sep 2026 selected
  await page.goto('http://localhost:3000/dashboard?date=2026-09-01..2026-09-13', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(400);

  const calendarData = await page.evaluate(() => {
    const popup = document.querySelector('[role="dialog"][aria-label*="rentang"]');
    if (!popup) return { error: 'Popup not found' };

    const monthHeader = popup.querySelector('.flex.items-center.justify-between span')?.textContent?.trim();
    const daysGrid = popup.querySelector('.grid.grid-cols-7.gap-y-\\[3px\\]') || popup.querySelectorAll('.grid.grid-cols-7')[1];
    const gridStyle = daysGrid ? window.getComputedStyle(daysGrid) : null;

    const dayButtons = Array.from(daysGrid ? daysGrid.querySelectorAll('button') : []);
    const days = dayButtons.map(b => {
      const cs = window.getComputedStyle(b);
      return {
        text: b.textContent?.trim(),
        className: b.className,
        bg: cs.backgroundColor,
        color: cs.color,
        boxShadow: cs.boxShadow,
        borderRadius: cs.borderRadius,
        width: b.getBoundingClientRect().width,
        height: b.getBoundingClientRect().height,
      };
    });

    const footer = popup.querySelector('.text-\\[11px\\].text-\\[var\\(--ink-muted\\)\\]')?.textContent?.trim() ||
                   popup.querySelector('.border-t')?.textContent?.trim();

    return {
      monthHeader,
      footer,
      gridGap: {
        gap: gridStyle ? gridStyle.gap : null,
        rowGap: gridStyle ? gridStyle.rowGap : null,
        columnGap: gridStyle ? gridStyle.columnGap : null,
      },
      // First 16 buttons
      sampleDays: days.slice(0, 16),
    };
  });

  // 4. Monitoring History DatePicker vs adjacent controls
  await page.goto('http://localhost:3000/monitoring/history', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const monitoringData = await page.evaluate(() => {
    const datePicker = document.querySelector('.w-\\[160px\\] [role="button"]') || document.querySelector('[aria-label*="tanggal"] [role="button"]');
    const buttons = Array.from(document.querySelectorAll('button'));
    const okBtn = buttons.find(b => b.textContent?.trim() === 'OK');
    const segmentedParent = okBtn ? okBtn.parentElement : null;

    function s(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        rect: { width: r.width, height: r.height, top: r.top, bottom: r.bottom },
        height: cs.height,
        border: cs.border,
      };
    }

    return {
      monitoringDatePicker: s(datePicker),
      segmentedParent: s(segmentedParent),
    };
  });

  // 5. Check global CSS rules in DOM outside @layer
  const globalCss = await page.evaluate(() => {
    const list = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule.type === CSSRule.STYLE_RULE) {
            const sel = rule.selectorText;
            if (sel && (
              sel.includes('datepicker') ||
              sel.includes('date-field') ||
              sel.includes('calendar') ||
              sel.includes('date-picker')
            )) {
              list.push({ selector: sel, css: rule.cssText });
            }
          }
        }
      } catch (e) {}
    }
    return list;
  });

  console.log(JSON.stringify({
    filterIdle,
    filterOpen,
    calendarData,
    monitoringData,
    globalCss,
  }, null, 2));

  await browser.close();
})();
