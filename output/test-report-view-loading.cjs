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
  await page.goto('http://localhost:3000/dashboard?mock=slow', { waitUntil: 'domcontentloaded' });
  // Wait for splash to detach
  await page.waitForSelector('#ctd-app-splash', { state: 'detached', timeout: 5000 });
  // Now we are in the mock=slow window (mock lasts 3000ms from start)
  await page.waitForTimeout(400);

  const res = await page.evaluate(() => {
    const todayPanel = document.querySelector('.ops-today-panel');
    const todayBadge = document.querySelector('.ops-count-badge')?.textContent;
    const okBadge = document.querySelector('.mon-counter-badge.ok')?.textContent;
    const nokBadge = document.querySelector('.mon-counter-badge.nok')?.textContent;
    const staffBadge = document.querySelector('.panel-sub-count')?.textContent;
    const analyticsBadge = document.querySelector('.analytics-filter-counter-badge')?.textContent;
    const todayRows = document.querySelectorAll('.ops-today-panel [role="status"] .grid, .ops-today-panel [aria-hidden="true"] .grid');
    const todayBody = document.querySelector('.ops-today-panel .report-panel-body');
    
    // Check View buttons
    const viewButtons = Array.from(document.querySelectorAll('.panel-view-action-btn')).map(b => ({
      ariaLabel: b.getAttribute('aria-label'),
      disabled: b.disabled,
      ariaDisabled: b.getAttribute('aria-disabled'),
      title: b.getAttribute('title'),
      cursor: window.getComputedStyle(b).cursor,
      opacity: window.getComputedStyle(b).opacity
    }));

    const todaySkeleton = document.querySelector('.ops-today-panel [aria-hidden="true"] div');
    const todayShimmer = document.querySelector('.ops-today-panel .animate-shimmer');
    const panelComputed = window.getComputedStyle(todayPanel);
    const skeletonComputed = todaySkeleton ? window.getComputedStyle(todaySkeleton) : null;
    const shimmerComputed = todayShimmer ? window.getComputedStyle(todayShimmer) : null;
    const shimmerAnims = todayShimmer?.getAnimations ? todayShimmer.getAnimations() : [];

    return {
      hasTodayPanel: !!todayPanel,
      panelBg: panelComputed.backgroundColor,
      skeletonBg: skeletonComputed?.backgroundColor,
      skeletonBorder: skeletonComputed?.border,
      shimmerBg: shimmerComputed?.backgroundImage,
      shimmerAnimName: shimmerComputed?.animationName,
      shimmerAnimDuration: shimmerComputed?.animationDuration,
      shimmerPlayState: shimmerComputed?.animationPlayState,
      shimmerAnimsCount: shimmerAnims.length,
      todayBadge,
      okBadge,
      nokBadge,
      staffBadge,
      analyticsBadge,
      rowCount: todayRows.length,
      panelHeight: todayPanel?.offsetHeight,
      bodyHeight: todayBody?.offsetHeight,
      rowsHeight: Array.from(todayRows).reduce((acc, el) => acc + el.offsetHeight, 0),
      emptySpace: (todayBody?.offsetHeight || 0) - Array.from(todayRows).reduce((acc, el) => acc + el.offsetHeight, 0),
      viewButtons: viewButtons.slice(0, 4)
    };
  });

  console.log('TicketReportView loading state results:');
  console.log(JSON.stringify(res, null, 2));

  await page.screenshot({ path: 'output/step1-overview-loading.png' });
  console.log('Saved screenshot: output/step1-overview-loading.png');

  await browser.close();
})();
