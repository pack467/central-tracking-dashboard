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

  const routes = [
    { name: 'Dashboard', url: 'http://localhost:3000/dashboard?mock=slow' },
    { name: 'Tickets', url: 'http://localhost:3000/tickets?mock=slow' },
    { name: 'Monitoring', url: 'http://localhost:3000/monitoring?mock=slow' },
    { name: 'Shift Log', url: 'http://localhost:3000/shift-log?mock=slow' },
    { name: 'Reports', url: 'http://localhost:3000/reports?mock=slow' },
    { name: 'Team Roster', url: 'http://localhost:3000/team-roster?mock=slow' },
    { name: 'Runbooks', url: 'http://localhost:3000/runbooks?mock=slow' },
  ];

  console.log('=== AUDITING SKELETON LOADING ON ALL 7 PAGES ===\n');

  for (const r of routes) {
    await page.goto(r.url, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForSelector('#ctd-app-splash', { state: 'detached', timeout: 5000 });
    } catch {}
    await page.waitForTimeout(300);

    const info = await page.evaluate((pageName) => {
      const statusEls = Array.from(document.querySelectorAll('[role="status"]'));
      const srTexts = statusEls.map(s => s.querySelector('.sr-only')?.textContent?.trim()).filter(Boolean);
      const shimmerCount = document.querySelectorAll('.animate-shimmer').length;
      const isDashboardSkeleton = !!document.querySelector('.ops-today-panel, .ops-focus-section');
      
      return {
        pageName,
        statusCount: statusEls.length,
        srTexts,
        shimmerCount,
        isDashboardSkeleton,
      };
    }, r.name);

    console.log(`Page: ${info.pageName}`);
    console.log(`  - Screen reader text: ${info.srTexts.join(' | ')}`);
    console.log(`  - Shimmer elements count: ${info.shimmerCount}`);
    console.log(`  - Showing DashboardSkeleton fallback: ${info.isDashboardSkeleton}`);
    
    const filename = `output/audit-${r.name.toLowerCase().replace(/\s+/g, '-')}-loading.png`;
    await page.screenshot({ path: filename });
    console.log(`  - Screenshot saved: ${filename}\n`);
  }

  await browser.close();
})();
