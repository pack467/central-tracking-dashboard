const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

function hexOrRgbToLuminance(colorStr) {
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.addInitScript(() => {
    window.sessionStorage.setItem('ctd_splash_seen', '1');
    window.localStorage.setItem('ctd_splash_seen', '1');
  });

  console.log('=== STEP 1 DIAGNOSIS: SKELETON ANIMATIONS, CONTRAST, & DOM ANATOMY ===\n');

  await page.goto('http://localhost:3000/dashboard?mock=slow', { waitUntil: 'domcontentloaded' });
  // Wait past splash unmount (800ms) but before mock ends (3000ms)
  await page.waitForTimeout(1400);

  const dashboardDiagnosis = await page.evaluate(() => {
    const panel = document.querySelector('.ops-today-panel');
    const panelBg = panel ? window.getComputedStyle(panel).backgroundColor : null;

    const shimmerElements = Array.from(document.querySelectorAll('.animate-shimmer'));

    // Check animations API on shimmer elements
    const shimmerAnimations = shimmerElements.map(el => {
      const anims = el.getAnimations ? el.getAnimations() : [];
      return {
        count: anims.length,
        names: anims.map(a => a.animationName),
        playState: anims.map(a => a.playState)
      };
    });

    const sampleSkeleton = document.querySelector('.ops-today-panel [aria-hidden="true"] div');
    const sampleShimmer = document.querySelector('.ops-today-panel .animate-shimmer');

    // Check badges during loading
    const todayBadge = document.querySelector('.ops-count-badge')?.textContent;
    const okBadge = document.querySelector('.mon-counter-badge.ok')?.textContent;
    const nokBadge = document.querySelector('.mon-counter-badge.nok')?.textContent;
    const stafBadge = document.querySelector('.panel-sub-count')?.textContent;
    
    // View buttons
    const viewButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('View') || b.getAttribute('aria-label')?.includes('Perbesar')).map(b => ({
      ariaLabel: b.getAttribute('aria-label') || b.textContent.trim(),
      disabled: b.disabled,
      opacity: window.getComputedStyle(b).opacity,
      cursor: window.getComputedStyle(b).cursor,
      title: b.getAttribute('title')
    }));

    // Panel geometry and gaps
    const todayBody = panel?.querySelector('.report-panel-body');
    const todayList = panel?.querySelector('.today-ticket-list');
    const todayRows = panel?.querySelectorAll('.grid.grid-cols-\\[88px_1fr_auto\\]');

    const monPanel = document.querySelector('.ops-engineer-panel');
    const monRows = monPanel?.querySelectorAll('.flex.items-center.justify-between');

    // Sample all skeleton elements colors across the dashboard
    const skeletonDivs = Array.from(document.querySelectorAll('[aria-hidden="true"] div[class*="bg-"]')).map(d => ({
      className: d.className,
      bg: window.getComputedStyle(d).backgroundColor
    }));

    return {
      panelBg,
      shimmerCount: shimmerElements.length,
      sampleSkeletonStyle: sampleSkeleton ? {
        bg: window.getComputedStyle(sampleSkeleton).backgroundColor,
        border: window.getComputedStyle(sampleSkeleton).border,
        borderRadius: window.getComputedStyle(sampleSkeleton).borderRadius
      } : null,
      sampleShimmerStyle: sampleShimmer ? {
        animationName: window.getComputedStyle(sampleShimmer).animationName,
        animationDuration: window.getComputedStyle(sampleShimmer).animationDuration,
        animationPlayState: window.getComputedStyle(sampleShimmer).animationPlayState,
        bgImage: window.getComputedStyle(sampleShimmer).backgroundImage,
        transform: window.getComputedStyle(sampleShimmer).transform,
        opacity: window.getComputedStyle(sampleShimmer).opacity
      } : null,
      shimmerAnimationsActive: shimmerAnimations.filter(s => s.count > 0).length,
      badges: {
        todayBadge,
        okBadge,
        nokBadge,
        stafBadge
      },
      viewButtons: viewButtons.slice(0, 6),
      todayPanelGeometry: {
        panelHeight: panel?.offsetHeight,
        bodyHeight: todayBody?.offsetHeight,
        rowCount: todayRows?.length,
        totalRowsHeight: Array.from(todayRows || []).reduce((acc, el) => acc + el.offsetHeight, 0),
        emptySpace: (todayBody?.offsetHeight || 0) - Array.from(todayRows || []).reduce((acc, el) => acc + el.offsetHeight, 0)
      },
      monitoringPanelGeometry: {
        panelHeight: monPanel?.offsetHeight,
        rowCount: monRows?.length
      },
      uniqueSkeletonBgs: Array.from(new Set(skeletonDivs.map(s => s.bg)))
    };
  });

  console.log('--- DASHBOARD DIAGNOSTIC SNAPSHOT ---');
  console.log(JSON.stringify(dashboardDiagnosis, null, 2));

  if (dashboardDiagnosis.panelBg && dashboardDiagnosis.sampleSkeletonStyle?.bg) {
    const ratio = contrastRatio(dashboardDiagnosis.panelBg, dashboardDiagnosis.sampleSkeletonStyle.bg);
    console.log(`\nContrast Ratio (Skeleton Block vs Panel): ${ratio.toFixed(3)}:1 (Requirement is >= 1.4:1)`);
  }

  // Take screenshot of loading state
  await page.screenshot({ path: 'output/diagnosis-dashboard-loading.png' });
  console.log('Saved screenshot: output/diagnosis-dashboard-loading.png');

  await page.close();
  await browser.close();
  console.log('\nDiagnosis script completed.');
})();
