const fs = require('fs');
const path = require('path');
const os = require('os');

const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

const VIEWPORTS = [
  { name: 'desktop-wide', width: 1920, height: 1080 },
  { name: 'desktop-laptop', width: 1440, height: 900 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const AFTER_DIR = path.join(__dirname, 'panel-viewer', 'after');
const MODALS_DIR = path.join(__dirname, 'panel-viewer', 'modals');

if (!fs.existsSync(AFTER_DIR)) fs.mkdirSync(AFTER_DIR, { recursive: true });
if (!fs.existsSync(MODALS_DIR)) fs.mkdirSync(MODALS_DIR, { recursive: true });

async function run() {
  console.log('--- Starting Panel Viewer Automated Verification ---');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const testReport = {
    memoPanelAudit: {},
    panelButtonsFound: [],
    viewersTested: {},
    deepLinksTested: {},
    screenshotsCaptured: [],
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Bypass splash
    await page.addInitScript(() => {
      window.sessionStorage.setItem('ctd_splash_seen', '1');
    });

    console.log('Navigating to http://localhost:3000/dashboard ...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // ── 1. Audit Memo Panel DOM ──
    console.log('Auditing Memo panel DOM...');
    const memoAudit = await page.evaluate(() => {
      const memoCard = document.querySelector('.ops-shift-panel');
      if (!memoCard) return { error: 'ops-shift-panel not found' };
      const text = memoCard.innerText || '';
      const hasTersimpan = text.includes('Tersimpan');
      const hasSalin = text.includes('Salin');
      const hasPlusPoin = text.includes('+ Poin') || text.includes('Poin Catatan');
      const hasReset = text.includes('Reset');
      const hasButir = text.includes('butir catatan');
      const viewBtn = memoCard.querySelector('.panel-view-action-btn');
      const textarea = memoCard.querySelector('textarea');
      const textareaRect = textarea ? textarea.getBoundingClientRect() : null;

      return {
        found: true,
        hasTersimpan,
        hasSalin,
        hasPlusPoin,
        hasReset,
        hasButir,
        hasViewBtn: Boolean(viewBtn),
        viewBtnText: viewBtn ? viewBtn.innerText.trim() : null,
        textareaHeight: textareaRect ? textareaRect.height : 0,
      };
    });
    testReport.memoPanelAudit = memoAudit;
    console.log('Memo Audit Result:', memoAudit);

    // ── 2. Test Memo Modal Interaction ──
    console.log('Testing Memo Modal interaction...');
    const memoViewBtn = page.locator('.ops-shift-panel .panel-view-action-btn');
    await memoViewBtn.click();
    await page.waitForTimeout(500);

    const memoModalVisible = await page.locator('.memo-modal-card').isVisible();
    console.log('Memo modal visible:', memoModalVisible);

    // Take screenshot of Memo Modal
    await page.screenshot({
      path: path.join(MODALS_DIR, 'memo_modal_1440x900.png'),
    });

    // Test add bullet in modal
    const addBulletBtn = page.locator('.memo-modal-card button:has-text("Poin Catatan")');
    if (await addBulletBtn.isVisible()) {
      await addBulletBtn.click();
    }

    // Close memo modal via Selesai button
    const selesaiBtn = page.locator('.memo-modal-card button:has-text("Selesai")');
    await selesaiBtn.click();
    await page.waitForTimeout(400);

    const memoModalClosed = !(await page.locator('.memo-modal-card').isVisible());
    console.log('Memo modal closed successfully:', memoModalClosed);

    // ── 3. Check All 7 Panel View Buttons ──
    console.log('Checking all 7 Panel View Buttons in Dashboard DOM...');
    const buttonsFound = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.panel-view-action-btn'));
      return btns.map((b) => {
        const rect = b.getBoundingClientRect();
        return {
          ariaLabel: b.getAttribute('aria-label'),
          title: b.getAttribute('title'),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          visible: rect.width > 0 && rect.height > 0,
        };
      });
    });
    testReport.panelButtonsFound = buttonsFound;
    console.log(`Found ${buttonsFound.length} panel-view-action-btn elements:`, buttonsFound);

    // ── 4. Test Deep Links for All 7 Panels ──
    const PANELS_TO_TEST = [
      'ticket-volume',
      'ticket-mom',
      'user-recap',
      'category-distribution',
      'severity-distribution',
      'shift-traffic',
      'resolution-trend',
    ];

    for (const panelId of PANELS_TO_TEST) {
      console.log(`Testing deep-link: /dashboard?panel=${panelId} ...`);
      await page.goto(`http://localhost:3000/dashboard?panel=${panelId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);

      const isViewerOpen = await page.locator('.panel-viewer-modal').isVisible();
      const currentUrl = page.url();
      const titleText = await page.locator('#panel-viewer-title').innerText().catch(() => '');

      // Screenshot chart view
      const chartShotPath = path.join(MODALS_DIR, `${panelId}_chart.png`);
      await page.screenshot({ path: chartShotPath });

      // Test switching to table mode if available
      const tableToggleBtn = page.locator('button[title="Tampilkan tabel data"]');
      let tableModeWorks = false;
      if (await tableToggleBtn.isVisible()) {
        await tableToggleBtn.click();
        await page.waitForTimeout(500);
        tableModeWorks = page.url().includes('mode=table');
        const tableShotPath = path.join(MODALS_DIR, `${panelId}_table.png`);
        await page.screenshot({ path: tableShotPath });
      }

      testReport.deepLinksTested[panelId] = {
        isOpen: isViewerOpen,
        title: titleText,
        currentUrl,
        tableModeWorks,
      };
      console.log(`Panel ${panelId}: open=${isViewerOpen}, title="${titleText}", tableWorks=${tableModeWorks}`);
    }

    // ── 5. Responsive Viewport Screenshots (Dashboard after) ──
    console.log('Capturing responsive after screenshots across 5 viewports...');
    for (const vp of VIEWPORTS) {
      const vpPage = await context.newPage();
      await vpPage.setViewportSize({ width: vp.width, height: vp.height });
      await vpPage.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
      await vpPage.waitForTimeout(700);

      const shotPath = path.join(AFTER_DIR, `dashboard_${vp.name}_${vp.width}x${vp.height}.png`);
      await vpPage.screenshot({ path: shotPath, fullPage: true });
      testReport.screenshotsCaptured.push(shotPath);
      console.log(`Captured: ${shotPath}`);
      await vpPage.close();
    }

    fs.writeFileSync(
      path.join(__dirname, 'panel-viewer', 'verification-results.json'),
      JSON.stringify(testReport, null, 2),
      'utf8'
    );
    console.log('--- Verification Complete! Results saved to verification-results.json ---');
  } catch (err) {
    console.error('Error during verification:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
