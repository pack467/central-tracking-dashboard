const fs = require('fs');
const path = require('path');
const os = require('os');

const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function runScrollDiagnosis() {
  console.log('=== RUNNING IN-DEPTH SCROLL BUG DIAGNOSIS ===');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const results = {
    closePaths: {},
    stressScenarios: {},
    rootCauses: [],
  };

  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 910 } });
    await page.addInitScript(() => window.sessionStorage.setItem('ctd_splash_seen', '1'));

    // Helper to get detailed DOM scroll snapshot
    async function getSnapshot(label) {
      return await page.evaluate((lbl) => {
        const html = document.documentElement;
        const body = document.body;
        const appRoot = document.getElementById('app-root');
        const workspace = document.querySelector('.workspace');
        const pageContent = document.querySelector('.page-content');
        const modal = document.querySelector('.panel-viewer-modal');

        const initialScrollY = window.scrollY;
        // Test scroll
        window.scrollBy(0, 100);
        const scrolledBy100 = window.scrollY - initialScrollY;
        window.scrollTo(0, initialScrollY);

        const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);

        return {
          label: lbl,
          scrollY: initialScrollY,
          scrolledDelta: scrolledBy100,
          canScroll: scrolledBy100 > 0,
          html: {
            overflow: window.getComputedStyle(html).overflow,
            overflowY: window.getComputedStyle(html).overflowY,
            inlineOverflow: html.style.overflow,
            hasInert: html.hasAttribute('inert'),
            ariaHidden: html.getAttribute('aria-hidden'),
          },
          body: {
            overflow: window.getComputedStyle(body).overflow,
            overflowY: window.getComputedStyle(body).overflowY,
            inlineOverflow: body.style.overflow,
            hasInert: body.hasAttribute('inert'),
            ariaHidden: body.getAttribute('aria-hidden'),
          },
          appRoot: appRoot ? {
            hasInert: appRoot.hasAttribute('inert'),
            ariaHidden: appRoot.getAttribute('aria-hidden'),
          } : null,
          modalInDOM: !!modal,
          centerElement: centerEl ? {
            tagName: centerEl.tagName,
            className: centerEl.className?.toString?.()?.slice(0, 80) || '',
            id: centerEl.id || '',
          } : null,
        };
      }, label);
    }

    // Helper to open a panel cleanly
    async function openPanel(panelId = 'resolution-trend') {
      // Scroll down to the panel first so there's scroll room
      await page.evaluate(() => window.scrollTo(0, 800));
      await page.waitForTimeout(100);
      const btn = page.locator(`button[aria-label*="${panelId === 'resolution-trend' ? 'Tren Durasi Penyelesaian' : 'Volume Tiket'}"]`).first();
      await btn.click();
      await page.waitForSelector('.panel-viewer-modal', { state: 'attached', timeout: 3000 });
      await page.waitForTimeout(200);
    }

    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Initial before test
    const beforeAll = await getSnapshot('Initial Before Any Open');

    // --- TEST 1: Close via Dashboard Button ---
    console.log('Testing Path 1: Dashboard button');
    await openPanel('resolution-trend');
    const whileOpen1 = await getSnapshot('While Open (Path 1)');
    await page.locator('header button[aria-label="Kembali ke Dashboard"]').click();
    await page.waitForTimeout(300);
    const afterClose1 = await getSnapshot('After Close (Dashboard button)');

    // Test wheel scroll
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(100);
    const wheelY1 = await page.evaluate(() => window.scrollY);

    // Test keyboard ArrowDown / PageDown
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(100);
    const keyDownY1 = await page.evaluate(() => window.scrollY);

    results.closePaths['DashboardButton'] = {
      whileOpen: whileOpen1,
      afterClose: afterClose1,
      wheelScrollWorked: wheelY1 > afterClose1.scrollY,
      keyScrollWorked: keyDownY1 > wheelY1,
    };

    // --- TEST 2: Close via X button ---
    console.log('Testing Path 2: Close (X) button');
    await openPanel('resolution-trend');
    const whileOpen2 = await getSnapshot('While Open (Path 2)');
    await page.locator('header button[aria-label="Tutup Tampilan Penuh"]').click();
    await page.waitForTimeout(300);
    const afterClose2 = await getSnapshot('After Close (X button)');

    results.closePaths['CloseXButton'] = {
      whileOpen: whileOpen2,
      afterClose: afterClose2,
    };

    // --- TEST 3: Close via Escape Key ---
    console.log('Testing Path 3: Escape key');
    await openPanel('resolution-trend');
    const whileOpen3 = await getSnapshot('While Open (Path 3)');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const afterClose3 = await getSnapshot('After Close (Escape key)');

    results.closePaths['EscapeKey'] = {
      whileOpen: whileOpen3,
      afterClose: afterClose3,
    };

    // --- TEST 4: Close via "Ubah filter di Dashboard" (Deprecated/Removed) ---
    // Note: 'Ubah filter' button was removed from PanelViewer.

    // --- TEST 5: Browser Back button (Deep link & pushState) ---
    console.log('Testing Path 5: Deep link & Browser Back button');
    await page.goto('http://localhost:3000/dashboard?panel=resolution-trend', { waitUntil: 'networkidle' });
    await page.waitForSelector('.panel-viewer-modal', { state: 'attached', timeout: 3000 });
    const whileOpen5 = await getSnapshot('While Open (Deep Link)');
    
    // In deep link, if user hits browser back:
    await page.goBack();
    await page.waitForTimeout(500);
    const afterClose5 = await getSnapshot('After Browser Back from Deep Link');

    results.closePaths['BrowserBack'] = {
      whileOpen: whileOpen5,
      afterClose: afterClose5,
    };

    // --- STRESS 1: Switch panel inside viewer (volume <-> mom) then close ---
    console.log('Stress 1: Switch panel inside viewer then close');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await openPanel('ticket-volume');
    const switchBtn = page.locator('button:has-text("Bulan Lalu vs Ini")');
    await switchBtn.click();
    await page.waitForTimeout(300);
    // Switch back to volume
    await page.locator('header button:has-text("Volume per Project")').click();
    await page.waitForTimeout(300);
    // Close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const afterStress1 = await getSnapshot('After Switch Panels and Close');
    results.stressScenarios['PanelSwitch'] = afterStress1;

    // --- STRESS 2: Consecutive Open/Close x2 ---
    console.log('Stress 2: Consecutive Open/Close twice');
    await openPanel('resolution-trend');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    await openPanel('resolution-trend');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const afterStress2 = await getSnapshot('After 2x Consecutive Open/Close');
    results.stressScenarios['Consecutive2x'] = afterStress2;

    // --- STRESS 3: Rapid Open/Close 20 times ---
    console.log('Stress 3: Rapid Open/Close 20 times');
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => {
        window.history.pushState({}, '', '?panel=resolution-trend');
        window.dispatchEvent(new Event('popstate'));
      });
      await page.waitForTimeout(30);
      await page.evaluate(() => {
        window.history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new Event('popstate'));
      });
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(500);
    const afterStress3 = await getSnapshot('After 20x Rapid Open/Close');
    results.stressScenarios['Rapid20x'] = afterStress3;

    // --- ROOT CAUSE ANALYSIS OF SCROLL LOCK LEAK ---
    // Inspect what happens when multiple components or effects touch document.body.style.overflow
    const mechanismAudit = await page.evaluate(() => {
      // Check listeners on window & body
      return {
        bodyInlineOverflow: document.body.style.overflow,
        htmlInlineOverflow: document.documentElement.style.overflow,
        documentActiveElement: document.activeElement ? {
          tagName: document.activeElement.tagName,
          className: document.activeElement.className?.toString?.()?.slice(0, 50),
          id: document.activeElement.id,
        } : null,
      };
    });
    results.mechanismAudit = mechanismAudit;

    fs.writeFileSync(
      path.join(__dirname, 'scroll-diagnosis.json'),
      JSON.stringify(results, null, 2)
    );
    console.log('=== SCROLL DIAGNOSIS FINISHED! ===');
  } catch (err) {
    console.error('Error in scroll diagnosis:', err);
  } finally {
    await browser.close();
  }
}

runScrollDiagnosis();
