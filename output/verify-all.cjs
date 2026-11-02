const fs = require('fs');
const path = require('path');
const os = require('os');

const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

const VIEWPORTS = [
  { name: '2560x1440', width: 2560, height: 1440 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
  { name: '844x390', width: 844, height: 390 },
];

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function verifyAll() {
  console.log('=== STARTING FULL AUTOMATED VERIFICATION ===');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const verificationReport = {
    scrollBugResolved: {},
    chartCoverage: {},
    tableEmptyBandResolved: {},
    momAnomaliesResolved: {},
    statsStripVerified: {},
    textBrevedad: {},
    screenshots: [],
  };

  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));

    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // ── 1. VERIFY SCROLL BUG FIX ──
    console.log('1. Verifying scroll bug across all 4 close paths...');

    async function checkScrollability() {
      return await page.evaluate(() => {
        const initialY = window.scrollY;
        window.scrollBy(0, 100);
        const scrolledDelta = window.scrollY - initialY;
        window.scrollTo(0, initialY);
        return {
          canScroll: scrolledDelta > 0,
          scrolledDelta,
          bodyStyleOverflow: document.body.style.overflow,
          bodyComputedOverflow: window.getComputedStyle(document.body).overflow,
          htmlComputedOverflow: window.getComputedStyle(document.documentElement).overflow,
          modalCount: document.querySelectorAll('[data-panel-viewer]').length,
        };
      });
    }

    // Path A: Dashboard button
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.locator('button[aria-label*="Tren Durasi Penyelesaian"]').first().click();
    await page.waitForSelector('[data-panel-viewer]');
    await page.locator('header button[aria-label="Kembali ke Dashboard"]').click();
    await page.waitForTimeout(400);
    const scrollPathA = await checkScrollability();
    console.log('Path A (Dashboard button):', scrollPathA);

    // Path B: Close X button
    await page.locator('button[aria-label*="Tren Durasi Penyelesaian"]').first().click();
    await page.waitForSelector('[data-panel-viewer]');
    await page.locator('header button[aria-label="Tutup Tampilan Penuh"]').click();
    await page.waitForTimeout(400);
    const scrollPathB = await checkScrollability();
    console.log('Path B (Close X button):', scrollPathB);

    // Path C: Escape key
    await page.locator('button[aria-label*="Tren Durasi Penyelesaian"]').first().click();
    await page.waitForSelector('[data-panel-viewer]');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const scrollPathC = await checkScrollability();
    console.log('Path C (Escape key):', scrollPathC);

    // Path D: Panel switch then close (The exact bug scenario that previously failed!)
    await page.locator('button[aria-label*="Volume Tiket"]').first().click();
    await page.waitForSelector('[data-panel-viewer]');
    // Switch to MoM
    await page.locator('header button:has-text("MoM")').click();
    await page.waitForTimeout(300);
    // Switch to Volume
    await page.locator('header button:has-text("Volume per Project")').click();
    await page.waitForTimeout(300);
    // Close via Esc
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const scrollPathD = await checkScrollability();
    console.log('Path D (Switch panel then close):', scrollPathD);

    // Stress test: 20x rapid open/close
    console.log('Stress test: 20x rapid open/close...');
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => {
        window.history.pushState({}, '', '?panel=resolution-trend');
        window.dispatchEvent(new Event('popstate'));
      });
      await page.waitForTimeout(20);
      await page.evaluate(() => {
        window.history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new Event('popstate'));
      });
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(400);
    const scrollRapid = await checkScrollability();
    console.log('Stress Rapid 20x:', scrollRapid);

    verificationReport.scrollBugResolved = {
      pathA: scrollPathA,
      pathB: scrollPathB,
      pathC: scrollPathC,
      pathD_SwitchPanel: scrollPathD,
      rapid20x: scrollRapid,
    };

    // ── 2. MEASURE CHART COVERAGE (>= 85% Panel) ──
    console.log('2. Measuring chart coverage and table empty bands...');
    const panelIds = [
      'resolution-trend',
      'ticket-volume',
      'ticket-mom',
      'shift-traffic',
      'category-distribution',
      'severity-distribution',
      'user-recap',
    ];

    for (const pid of panelIds) {
      await page.goto(`http://localhost:3000/dashboard?panel=${pid}&mode=chart`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const metrics = await page.evaluate((panelId) => {
        const dialog = document.querySelector('[data-panel-viewer]');
        const main = dialog?.querySelector('main');
        const svg = main?.querySelector('svg');
        const mainRect = main ? main.getBoundingClientRect() : null;
        const svgRect = svg ? svg.getBoundingClientRect() : null;

        // Stat strip info
        const statPills = Array.from(main?.querySelectorAll('.grid > div') || []).map(p => ({
          label: p.querySelector('span')?.textContent?.trim() || '',
          value: p.querySelector('div')?.textContent?.trim() || '',
        }));

        let widthRatio = 0;
        let heightRatio = 0;
        if (mainRect && svgRect) {
          widthRatio = (svgRect.width / mainRect.width) * 100;
          heightRatio = (svgRect.height / mainRect.height) * 100;
        }

        const subtitle = dialog?.querySelector('header span.font-mono')?.textContent?.trim() || '';

        return {
          panelId,
          mainRect,
          svgRect,
          widthRatio: widthRatio.toFixed(1) + '%',
          heightRatio: heightRatio.toFixed(1) + '%',
          statPills,
          subtitle,
        };
      }, pid);

      verificationReport.chartCoverage[pid] = metrics;
      console.log(`Panel ${pid} coverage: width=${metrics.widthRatio}, height=${metrics.heightRatio}`);

      // Check Table mode if applicable
      if (['resolution-trend', 'ticket-volume', 'ticket-mom', 'shift-traffic', 'user-recap'].includes(pid)) {
        await page.goto(`http://localhost:3000/dashboard?panel=${pid}&mode=table`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const tableMetrics = await page.evaluate((panelId) => {
          const main = document.querySelector('main');
          const table = main?.querySelector('table');
          const tbody = table?.querySelector('tbody');
          const tfoot = table?.querySelector('tfoot');
          const container = table?.parentElement;

          const containerRect = container ? container.getBoundingClientRect() : null;
          const tableRect = table ? table.getBoundingClientRect() : null;
          const emptyBand = containerRect && tableRect ? Math.max(0, containerRect.bottom - tableRect.bottom) : 0;

          // MoM checks
          let momBaselineBugFixed = false;
          let momTotalPctFixed = false;
          if (panelId === 'ticket-mom') {
            const rows = Array.from(tbody?.querySelectorAll('tr') || []);
            const zeroRow = rows.find(r => r.textContent?.includes('vs -'));
            if (zeroRow) {
              const lastCell = zeroRow.querySelector('td:last-child')?.textContent?.trim();
              momBaselineBugFixed = lastCell === '-';
            }
            if (tfoot) {
              const totalRowText = tfoot.textContent || '';
              momTotalPctFixed = totalRowText.includes('%');
            }
          }

          return {
            panelId,
            emptyBand: Math.round(emptyBand),
            hasStickyHeader: !!table?.querySelector('thead.sticky'),
            hasStickyFooter: !!tfoot?.classList.contains('sticky'),
            momBaselineBugFixed,
            momTotalPctFixed,
          };
        }, pid);

        verificationReport.tableEmptyBandResolved[pid] = tableMetrics;
      }
    }

    // ── 3. CAPTURE MULTI-VIEWPORT SCREENSHOTS (8 Viewports x Panels) ──
    console.log('3. Capturing multi-viewport screenshots across all 8 screen sizes...');
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      console.log(`Capturing for viewport: ${vp.name} (${vp.width}x${vp.height})...`);

      for (const pid of ['resolution-trend', 'ticket-volume', 'ticket-mom', 'shift-traffic', 'user-recap']) {
        await page.goto(`http://localhost:3000/dashboard?panel=${pid}&mode=chart`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(300);
        const shotPath = path.join(SCREENSHOT_DIR, `${pid}_${vp.name}_chart.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
        verificationReport.screenshots.push({ name: `${pid}_${vp.name}_chart`, path: shotPath });
      }
    }

    fs.writeFileSync(
      path.join(__dirname, 'verification-report.json'),
      JSON.stringify(verificationReport, null, 2)
    );
    console.log('=== VERIFICATION COMPLETE! Written to output/verification-report.json ===');
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await browser.close();
  }
}

verifyAll();
