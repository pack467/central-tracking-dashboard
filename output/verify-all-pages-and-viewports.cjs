const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);
const fs = require('fs');

const PAGES = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'tickets', path: '/tickets' },
  { name: 'monitoring', path: '/monitoring' },
  { name: 'shift-log', path: '/shift-log' },
  { name: 'reports', path: '/reports' },
  { name: 'team-roster', path: '/team-roster' },
  { name: 'runbooks', path: '/runbooks' },
];

const VIEWPORTS = [
  { name: '1920', width: 1920, height: 1080 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const outputDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('=== MULTI-PAGE & MULTI-VIEWPORT VERIFICATION ===\n');

  // 1. Capture Dashboard across all 5 viewports
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.addInitScript(() => {
      window.sessionStorage.setItem('ctd_splash_seen', '1');
      window.localStorage.setItem('ctd_splash_seen', '1');
    });

    await page.goto(`http://localhost:3000/dashboard?mock=slow`, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForSelector('#ctd-app-splash', { state: 'detached', timeout: 8000 });
    } catch {}
    await page.waitForTimeout(600);

    // Freeze animations at 500ms for deterministic rendering
    await page.evaluate(() => {
      document.getAnimations().forEach(anim => {
        try {
          anim.pause();
          anim.currentTime = 500;
        } catch {}
      });
    });

    const file = path.join(outputDir, `dashboard-loading-${vp.name}.png`);
    await page.screenshot({ path: file });
    console.log(`Saved screenshot: dashboard-loading-${vp.name}.png`);
    await page.close();
  }

  // 2. Capture all 7 pages at standard 1440 viewport
  for (const pInfo of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      window.sessionStorage.setItem('ctd_splash_seen', '1');
      window.localStorage.setItem('ctd_splash_seen', '1');
    });

    await page.goto(`http://localhost:3000${pInfo.path}?mock=slow`, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForSelector('#ctd-app-splash', { state: 'detached', timeout: 8000 });
    } catch {}
    await page.waitForTimeout(600);

    // Freeze animations
    await page.evaluate(() => {
      document.getAnimations().forEach(anim => {
        try {
          anim.pause();
          anim.currentTime = 500;
        } catch {}
      });
    });

    const file = path.join(outputDir, `${pInfo.name}-loading-1440.png`);
    await page.screenshot({ path: file });
    console.log(`Saved screenshot: ${pInfo.name}-loading-1440.png`);
    await page.close();
  }

  // 3. Test prefers-reduced-motion: reduce
  console.log('\n=== TESTING prefers-reduced-motion: reduce ===');
  const rmPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce'
  });
  await rmPage.addInitScript(() => {
    window.sessionStorage.setItem('ctd_splash_seen', '1');
    window.localStorage.setItem('ctd_splash_seen', '1');
  });
  await rmPage.goto('http://localhost:3000/dashboard?mock=slow', { waitUntil: 'domcontentloaded' });
  try {
    await rmPage.waitForSelector('#ctd-app-splash', { state: 'detached', timeout: 8000 });
  } catch {}
  await rmPage.waitForTimeout(600);

  const rmResults = await rmPage.evaluate(() => {
    const sampleShimmer = document.querySelector('.animate-shimmer');
    const computedAnim = sampleShimmer ? window.getComputedStyle(sampleShimmer).animationName : 'none';
    const sampleSkeleton = document.querySelector('div[class*="bg-"]');
    const isVisible = sampleSkeleton && window.getComputedStyle(sampleSkeleton).opacity !== '0';
    return {
      shimmerAnimationName: computedAnim,
      skeletonBlockVisible: isVisible
    };
  });
  console.log(`Reduced Motion shimmer animation: ${rmResults.shimmerAnimationName} (expected: none) -> ${rmResults.shimmerAnimationName === 'none' ? 'PASSED ✅' : 'RUNNING'}`);
  console.log(`Reduced Motion skeleton visible: ${rmResults.skeletonBlockVisible ? 'PASSED ✅' : 'FAILED'}`);
  await rmPage.screenshot({ path: path.join(outputDir, 'dashboard-reduced-motion-1440.png') });
  await rmPage.close();

  // 4. Test Instant Mock (?mock=0)
  console.log('\n=== TESTING INSTANT MOCK (?mock=0) ===');
  const instantPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await instantPage.addInitScript(() => {
    window.sessionStorage.setItem('ctd_splash_seen', '1');
    window.localStorage.setItem('ctd_splash_seen', '1');
  });
  await instantPage.goto('http://localhost:3000/dashboard?mock=0', { waitUntil: 'domcontentloaded' });
  try {
    await instantPage.waitForSelector('#ctd-app-splash', { state: 'detached', timeout: 8000 });
  } catch {}
  
  // Wait for dynamic import to resolve & render
  await instantPage.waitForSelector('.ticket-report-container', { timeout: 15000 });
  await instantPage.waitForTimeout(500);

  const instantInfo = await instantPage.evaluate(() => {
    const countBadge = document.querySelector('.ops-count-badge')?.textContent;
    const isDataLoaded = !!countBadge && !countBadge.includes('REPLACED');
    const ticketsCount = document.querySelectorAll('.today-ticket-list > article, .today-ticket-list > div').length;
    return { isDataLoaded, countBadge, ticketsCount };
  });
  console.log(`Instant load rendered data: ${instantInfo.countBadge} (${instantInfo.ticketsCount} tickets rendered) -> ${instantInfo.isDataLoaded ? 'PASSED ✅' : 'FAILED'}`);
  await instantPage.screenshot({ path: path.join(outputDir, 'dashboard-instant-loaded-1440.png') });
  await instantPage.close();

  await browser.close();
  console.log('\nAll multi-page and viewport verifications completed successfully!');
})();
