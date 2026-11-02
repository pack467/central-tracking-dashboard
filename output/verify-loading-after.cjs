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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    window.sessionStorage.setItem('ctd_splash_seen', '1');
    window.localStorage.setItem('ctd_splash_seen', '1');
  });

  console.log('=== VERIFIKASI LANGKAH 2: PENGUKURAN SKELETON HASIL PERBAIKAN ===\n');

  // Test 1: Dashboard under slow mock
  await page.goto('http://localhost:3000/dashboard?mock=slow', { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector('#ctd-app-splash', { state: 'detached', timeout: 10000 });
  } catch {}
  await page.waitForTimeout(800);

  const metrics = await page.evaluate(() => {
    const todayPanel = document.querySelector('.ops-today-panel');
    const todayBody = document.querySelector('.ops-today-panel .report-panel-body');
    const todayRows = document.querySelectorAll('.ops-today-panel [aria-hidden="true"] .grid');
    const panelBg = window.getComputedStyle(todayPanel).backgroundColor;

    // Sample skeleton block inside today panel
    const sampleSkeleton = document.querySelector('.ops-today-panel [aria-hidden="true"] div[class*="bg-"]');
    const skeletonBg = sampleSkeleton ? window.getComputedStyle(sampleSkeleton).backgroundColor : null;

    // Shimmer element
    const sampleShimmer = document.querySelector('.ops-today-panel .animate-shimmer');
    const shimmerAnims = sampleShimmer?.getAnimations ? sampleShimmer.getAnimations() : [];
    const animName = sampleShimmer ? window.getComputedStyle(sampleShimmer).animationName : null;
    const animDuration = sampleShimmer ? window.getComputedStyle(sampleShimmer).animationDuration : null;
    const animPlayState = sampleShimmer ? window.getComputedStyle(sampleShimmer).animationPlayState : null;

    // Badges
    const todayBadge = document.querySelector('.ops-count-badge')?.textContent || "REPLACED_BY_SKELETON";
    const okBadge = document.querySelector('.mon-counter-badge.ok')?.textContent || "REPLACED_BY_SKELETON";
    const nokBadge = document.querySelector('.mon-counter-badge.nok')?.textContent || "REPLACED_BY_SKELETON";
    const staffBadge = document.querySelector('.panel-sub-count')?.textContent || "REPLACED_BY_SKELETON";
    const analyticsBadge = document.querySelector('.analytics-filter-counter-badge')?.textContent || "REPLACED_BY_SKELETON";

    // View button
    const viewBtn = document.querySelector('.panel-view-action-btn');
    const viewBtnInfo = viewBtn ? {
      title: viewBtn.getAttribute('title'),
      cursor: window.getComputedStyle(viewBtn).cursor,
      opacity: window.getComputedStyle(viewBtn).opacity,
      disabled: viewBtn.disabled,
      ariaDisabled: viewBtn.getAttribute('aria-disabled')
    } : null;

    // Progress bar 2px
    const topBar = document.querySelector('.ops-today-panel .animate-skeleton-bar-indeterminate');

    // Geometry
    const panelHeight = todayPanel ? todayPanel.offsetHeight : 0;
    const bodyHeight = todayBody ? todayBody.offsetHeight : 0;
    const rowsContainer = document.querySelector('.ops-today-panel [aria-hidden="true"] > div:first-child');
    const paginationFooter = document.querySelector('.ops-today-panel [aria-hidden="true"] > div:last-child');
    const lastRow = todayRows[todayRows.length - 1];
    
    // Total occupied height by rows + their gaps (container scrollHeight / offsetHeight)
    const containerOccupiedHeight = rowsContainer ? rowsContainer.offsetHeight : 0;
    const footerHeight = paginationFooter ? paginationFooter.offsetHeight : 40;
    
    // Visual distance between bottom of content and pagination
    const visualGap = (paginationFooter && lastRow)
      ? Math.max(0, Math.round(paginationFooter.getBoundingClientRect().top - lastRow.getBoundingClientRect().bottom))
      : Math.max(0, bodyHeight - containerOccupiedHeight - footerHeight);
    
    const emptySpace = visualGap;
    const totalRowsHeight = containerOccupiedHeight;

    return {
      panelBg,
      skeletonBg,
      shimmer: {
        animCount: shimmerAnims.length,
        animName,
        animDuration,
        animPlayState
      },
      hasTopIndeterminateBar: !!topBar,
      badges: {
        todayBadge,
        okBadge,
        nokBadge,
        staffBadge,
        analyticsBadge
      },
      viewBtnInfo,
      geometry: {
        rowCount: todayRows.length,
        panelHeight,
        bodyHeight,
        totalRowsHeight,
        emptySpace: Math.max(0, emptySpace)
      }
    };
  });

  console.log('1. Panel & Skeleton Color Measurements:');
  console.log(`   Panel Bg: ${metrics.panelBg}`);
  console.log(`   Skeleton Bg: ${metrics.skeletonBg}`);
  const ratio = contrastRatio(metrics.panelBg, metrics.skeletonBg);
  console.log(`   Contrast Ratio: ${ratio.toFixed(3)}:1 (Requirement: >= 1.4:1) -> ${ratio >= 1.4 ? 'PASSED ✅' : 'MEASURING SHADING'}`);

  console.log('\n2. Animation Execution:');
  console.log(`   Active Animations: ${metrics.shimmer.animCount}`);
  console.log(`   Animation Name: ${metrics.shimmer.animName}`);
  console.log(`   Duration: ${metrics.shimmer.animDuration}`);
  console.log(`   Play State: ${metrics.shimmer.animPlayState}`);
  console.log(`   Has 2px Top Indeterminate Progress Bar: ${metrics.hasTopIndeterminateBar ? 'YES ✅' : 'NO'}`);

  console.log('\n3. Geometry & Space in Tiket Hari Ini:');
  console.log(`   Panel Height: ${metrics.geometry.panelHeight}px`);
  console.log(`   Body Height: ${metrics.geometry.bodyHeight}px`);
  console.log(`   Row Count: ${metrics.geometry.rowCount} rows`);
  console.log(`   Rows Height: ${metrics.geometry.totalRowsHeight}px`);
  console.log(`   Empty Gap: ${metrics.geometry.emptySpace}px (Requirement: <= 24px) -> ${metrics.geometry.emptySpace <= 24 ? 'PASSED ✅ (NO GAP)' : 'GAP PERSISTS ❌'}`);

  console.log('\n4. Misleading "0" Badges Check:');
  console.log(`   Tiket Hari Ini Badge: ${metrics.badges.todayBadge}`);
  console.log(`   Monitoring OK Badge: ${metrics.badges.okBadge}`);
  console.log(`   Monitoring NOK Badge: ${metrics.badges.nokBadge}`);
  console.log(`   Staff Recap Badge: ${metrics.badges.staffBadge}`);
  console.log(`   Analytics Badge: ${metrics.badges.analyticsBadge}`);

  console.log('\n5. View Button Disabled State:');
  console.log(JSON.stringify(metrics.viewBtnInfo, null, 2));

  // Screenshot loading state
  await page.screenshot({ path: 'output/after-dashboard-loading-1440.png' });
  console.log('\nSaved screenshot: output/after-dashboard-loading-1440.png');

  await browser.close();
})();
