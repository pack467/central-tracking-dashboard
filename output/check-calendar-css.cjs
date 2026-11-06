const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));
  await page.goto('http://localhost:3000/dashboard?date=2026-09-01..2026-09-13', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.click('.date-field [role="button"]');
  await page.waitForTimeout(400);

  const matchedRules = await page.evaluate(() => {
    const popup = document.querySelector('[role="dialog"][aria-label*="rentang"]');
    const monthTitle = popup.querySelector('.flex.items-center.justify-between span')?.textContent?.trim();
    const buttons = Array.from(popup.querySelectorAll('.grid.grid-cols-7 button'));
    return {
      monthTitle,
      buttons: buttons.map(b => ({
        text: b.textContent?.trim(),
        className: b.className,
        computedBg: window.getComputedStyle(b).backgroundColor,
        computedColor: window.getComputedStyle(b).color,
        computedShadow: window.getComputedStyle(b).boxShadow,
      })),
    };
  });

  const debugInfo = await page.evaluate(() => {
    const popup = document.querySelector('[role="dialog"][aria-label*="rentang"]');
    const buttons = Array.from(popup.querySelectorAll('.grid.grid-cols-7 button'));
    const btn1 = buttons[1]; // day 1
    const btn2 = buttons[2]; // day 2

    // Check if Tailwind generated CSS for bg-[var(--accent-blue)] and bg-[rgba(56,189,248,0.2)]
    const allRules = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule.cssText && (
            rule.cssText.includes('accent-blue') ||
            rule.cssText.includes('56,189,248') ||
            rule.cssText.includes('bg-transparent')
          )) {
            allRules.push({
              selector: rule.selectorText,
              cssText: rule.cssText,
            });
          }
        }
      } catch(e) {}
    }

    return {
      btn1Bg: window.getComputedStyle(btn1).backgroundColor,
      btn2Bg: window.getComputedStyle(btn2).backgroundColor,
      btn1Class: btn1.className,
      btn2Class: btn2.className,
      matchingRules: allRules.slice(0, 20),
    };
  });

  console.log('DEBUG INFO:', JSON.stringify(debugInfo, null, 2));
  await browser.close();
})();
