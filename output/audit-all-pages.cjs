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

  const pages = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Tickets', path: '/tickets' },
    { name: 'Monitoring', path: '/monitoring' },
    { name: 'Shift Log', path: '/shift-log' },
    { name: 'Reports', path: '/reports' },
    { name: 'Team Roster', path: '/team-roster' },
    { name: 'Runbooks', path: '/runbooks' }
  ];

  const results = {};

  for (const p of pages) {
    // 1. Check loading state (?mock=slow)
    await page.goto(`http://localhost:3000${p.path}?mock=slow`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1400);

    const loadingData = await page.evaluate(() => {
      const skeletons = Array.from(document.querySelectorAll('[aria-hidden="true"], .animate-shimmer'));
      const textZeroes = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.trim();
        return text && (text.includes('0 tiket') || text.includes('0 OK') || text.includes('0 NOK') || text.includes('0 Staf') || text.includes('Menampilkan 0'));
      }).map(el => el.textContent.trim());

      const anims = document.getAnimations ? document.getAnimations() : [];
      return {
        skeletonCount: skeletons.length,
        activeAnimations: anims.length,
        misleadingZeroBadges: textZeroes.slice(0, 5),
      };
    });

    await page.screenshot({ path: `output/baseline-loading-${p.name.toLowerCase().replace(/\s+/g, '-')}.png` });

    // 2. Wait for real data to load
    await page.waitForTimeout(2000);
    const contentData = await page.evaluate(() => {
      const cards = document.querySelectorAll('article, .panel, table tr, [class*="card"]');
      return {
        cardCount: cards.length
      };
    });

    results[p.name] = {
      loading: loadingData,
      content: contentData
    };
  }

  console.log('--- ALL PAGES INVENTORY & SKELETON DIAGNOSIS ---');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();
