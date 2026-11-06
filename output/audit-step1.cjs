const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

function hexOrRgbToLuminance(colorStr) {
  if (!colorStr) return 0;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return 0;
  const [r, g, b] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(color1, color2) {
  const l1 = hexOrRgbToLuminance(color1);
  const l2 = hexOrRgbToLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.sessionStorage.setItem('ctd_splash_seen', '1');
    window.localStorage.setItem('ctd_splash_seen', '1');
  });

  console.log('=== RUNNING STEP 1 AUDIT ON ALL PAGES ===\n');

  // Audit 1: Dashboard under slow mock
  await page.goto('http://localhost:3000/dashboard?mock=slow', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600); // During skeleton loading

  const dashboardAudit = await page.evaluate(() => {
    const panelBg = '#1e293b';
    const skeletonBlocks = Array.from(document.querySelectorAll('[aria-hidden="true"] div[class*="bg-"]'));
    const shimmerEls = Array.from(document.querySelectorAll('.animate-shimmer'));

    const animDetails = shimmerEls.slice(0, 5).map(el => {
      const anims = el.getAnimations ? el.getAnimations() : [];
      return {
        count: anims.length,
        names: anims.map(a => a.animationName),
        playStates: anims.map(a => a.playState)
      };
    });

    const sampleBlock = skeletonBlocks[0];
    const sampleBlockStyle = sampleBlock ? {
      className: sampleBlock.className,
      bg: window.getComputedStyle(sampleBlock).backgroundColor,
      borderRadius: window.getComputedStyle(sampleBlock).borderRadius
    } : null;

    const sampleShimmer = shimmerEls[0];
    const sampleShimmerStyle = sampleShimmer ? {
      className: sampleShimmer.className,
      bg: window.getComputedStyle(sampleShimmer).backgroundImage,
      transform: window.getComputedStyle(sampleShimmer).transform,
      animationName: window.getComputedStyle(sampleShimmer).animationName,
      animationDuration: window.getComputedStyle(sampleShimmer).animationDuration
    } : null;

    // Badges in DOM
    const todayBadge = document.querySelector('.ops-count-badge')?.textContent;
    const okBadge = document.querySelector('.mon-counter-badge.ok')?.textContent;
    const nokBadge = document.querySelector('.mon-counter-badge.nok')?.textContent;
    const staffBadge = document.querySelector('.panel-sub-count')?.textContent;
    const analyticsBadge = document.querySelector('.analytics-filter-counter-badge')?.textContent;

    // Today panel height measurements
    const todayPanel = document.querySelector('.ops-today-panel');
    const todayBody = document.querySelector('.ops-today-panel .report-panel-body');
    const skeletonRows = document.querySelectorAll('.ops-today-panel [role="status"] .grid, .ops-today-panel [aria-hidden="true"] .grid');

    return {
      shimmerCount: shimmerEls.length,
      sampleBlockStyle,
      sampleShimmerStyle,
      animDetails,
      badges: {
        todayBadge,
        okBadge,
        nokBadge,
        staffBadge,
        analyticsBadge
      },
      todayGeometry: {
        panelHeight: todayPanel?.offsetHeight,
        bodyHeight: todayBody?.offsetHeight,
        rowCount: skeletonRows.length,
        rowsHeight: Array.from(skeletonRows).reduce((acc, el) => acc + el.offsetHeight, 0)
      }
    };
  });

  console.log('Dashboard Audit Output:');
  console.log(JSON.stringify(dashboardAudit, null, 2));

  // Contrast measurements
  const panelBg = 'rgb(30, 41, 59)'; // #1e293b
  const currentBlockBg = dashboardAudit.sampleBlockStyle?.bg || 'rgb(30, 41, 59)';
  const targetBlockBg = 'rgb(36, 48, 68)'; // #243044
  const targetShimmer1 = 'rgb(51, 65, 85)'; // #334155
  const targetShimmer2 = 'rgb(59, 74, 99)'; // #3b4a63

  console.log('\n--- CONTRAST RATIO ANALYSIS ---');
  console.log(`Current Skeleton Block (${currentBlockBg}) vs Panel (${panelBg}): ${contrastRatio(panelBg, currentBlockBg).toFixed(3)}:1 (CRITICAL FAILURE: 1:1)`);
  console.log(`Target Block (#243044) vs Panel (#1e293b): ${contrastRatio(panelBg, targetBlockBg).toFixed(3)}:1`);
  console.log(`Target Shimmer Shading 1 (#334155) vs Panel (#1e293b): ${contrastRatio(panelBg, targetShimmer1).toFixed(3)}:1 (PASS >= 1.4:1)`);
  console.log(`Target Shimmer Highlight (#3b4a63) vs Panel (#1e293b): ${contrastRatio(panelBg, targetShimmer2).toFixed(3)}:1 (PASS >= 1.4:1)`);

  await page.screenshot({ path: 'output/step1-dashboard-loading.png' });
  console.log('\nSaved screenshot: output/step1-dashboard-loading.png');

  await browser.close();
})();
