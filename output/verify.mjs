import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const require = createRequire(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));
const { chromium } = require('playwright');

const base = 'http://localhost:3000/dashboard';
const outputDir = resolve('output/severity-polish/after');
mkdirSync(outputDir, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const viewports = [1024, 1280, 1440, 1640, 1920, 768, 390];
  
  const measurements = {};

  for (const width of viewports) {
    const context = await browser.newContext({
      viewport: { width, height: 950 },
      timezoneId: 'Asia/Jakarta'
    });
    await context.addInitScript(() => {
      try { sessionStorage.setItem('ctd_splash_seen', '1'); } catch {}
    });

    const page = await context.newPage();
    try { await page.clock.setFixedTime(new Date('2026-10-11T03:00:00Z')); } catch {}

    await page.goto(base);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const data = await page.evaluate(() => {
      const panels = document.querySelectorAll('.report-charts-grid > article');
      if (panels.length < 2) return { error: 'Panels not found' };

      const catPanel = panels[0];
      const sevPanel = panels[1];

      const catRect = catPanel.getBoundingClientRect();
      const sevRect = sevPanel.getBoundingClientRect();

      const catHeading = catPanel.querySelector('.report-panel-heading');
      const sevHeading = sevPanel.querySelector('.report-panel-heading');
      const catHeadingRect = catHeading?.getBoundingClientRect();
      const sevHeadingRect = sevHeading?.getBoundingClientRect();

      const catBody = catPanel.querySelector('.report-panel-body');
      const sevBody = sevPanel.querySelector('.report-panel-body');
      const catBodyRect = catBody?.getBoundingClientRect();
      const sevBodyRect = sevBody?.getBoundingClientRect();
      const sevBodyComputed = sevBody ? window.getComputedStyle(sevBody) : null;

      // Inner content container
      const contentWrap = sevBody?.firstElementChild;
      const contentWrapRect = contentWrap?.getBoundingClientRect();

      const sevDonutWrap = sevBody?.querySelector('.donut-chart-wrap');
      const sevDonutRect = sevDonutWrap?.getBoundingClientRect();

      const sevCardsGrid = sevBody?.querySelector('.priority-spectrum-list');
      const sevCardsGridRect = sevCardsGrid?.getBoundingClientRect();
      const sevCardsGridComputed = sevCardsGrid ? window.getComputedStyle(sevCardsGrid) : null;

      const cardEls = sevCardsGrid?.querySelectorAll('.priority-spec-box');
      const cardsData = Array.from(cardEls || []).map(c => {
        const r = c.getBoundingClientRect();
        const cs = window.getComputedStyle(c);
        const fillBar = c.querySelector('.rounded-full > div');
        const fillBarWidth = fillBar ? fillBar.style.width : null;
        return {
          title: c.querySelector('strong')?.textContent,
          count: c.querySelector('.spec-count')?.textContent,
          pct: c.querySelector('.spec-pct')?.textContent,
          width: r.width,
          height: r.height,
          padding: cs.padding,
          barWidth: fillBarWidth,
          isClipped: c.scrollWidth > c.clientWidth || c.scrollHeight > c.clientHeight
        };
      });

      const topGap = contentWrapRect && sevBodyRect ? (contentWrapRect.top - sevBodyRect.top) : 0;
      const bottomGap = contentWrapRect && sevBodyRect ? (sevBodyRect.bottom - contentWrapRect.bottom) : 0;

      // Donut SVG inspection
      const svg = sevBody?.querySelector('.donut-svg');
      const circle = svg?.querySelector('circle.donut-segment');
      const circleAttrs = circle ? {
        r: circle.getAttribute('r'),
        strokeWidth: circle.getAttribute('stroke-width'),
        cx: circle.getAttribute('cx'),
        cy: circle.getAttribute('cy')
      } : null;

      const centerNum = sevBody?.querySelector('.donut-total-num')?.textContent;
      const centerLabel = sevBody?.querySelector('.donut-total-label')?.textContent;

      // Check clipping or overflow
      const pageHasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;

      return {
        catPanel: { width: catRect.width, height: catRect.height },
        sevPanel: { width: sevRect.width, height: sevRect.height },
        sevHeading: { height: sevHeadingRect?.height },
        sevBody: {
          width: sevBodyRect?.width,
          height: sevBodyRect?.height,
          padding: sevBodyComputed?.padding
        },
        contentWrap: {
          width: contentWrapRect?.width,
          height: contentWrapRect?.height
        },
        topGap,
        bottomGap,
        sevDonut: {
          width: sevDonutRect?.width,
          height: sevDonutRect?.height,
          circle: circleAttrs,
          centerNum,
          centerLabel
        },
        sevCardsGrid: {
          width: sevCardsGridRect?.width,
          height: sevCardsGridRect?.height,
          gap: sevCardsGridComputed?.gap,
          gridTemplateColumns: sevCardsGridComputed?.gridTemplateColumns,
          gridTemplateRows: sevCardsGridComputed?.gridTemplateRows
        },
        cards: cardsData,
        pageHasHorizontalScroll,
        heightDifference: Math.abs(catRect.height - sevRect.height)
      };
    });

    measurements[width] = data;

    const panelGrid = page.locator('.report-charts-grid');
    if (await panelGrid.count() > 0) {
      await panelGrid.first().screenshot({ path: join(outputDir, `panels-${width}.png`) });
    }
    await page.screenshot({ path: join(outputDir, `full-${width}.png`), fullPage: false });

    if (width === 1440) {
      const toggleTab = page.locator('.sidebar-toggle-tab');
      if (await toggleTab.count() > 0) {
        await toggleTab.first().click();
        await page.waitForTimeout(500);
        const collapsedData = await page.evaluate(() => {
          const panels = document.querySelectorAll('.report-charts-grid > article');
          const catRect = panels[0]?.getBoundingClientRect();
          const sevRect = panels[1]?.getBoundingClientRect();
          return { catPanelWidth: catRect?.width, sevPanelWidth: sevRect?.width, sevPanelHeight: sevRect?.height };
        });
        measurements['1440-sidebar-collapsed'] = collapsedData;
        await panelGrid.first().screenshot({ path: join(outputDir, `panels-1440-collapsed.png`) });
        await toggleTab.first().click();
        await page.waitForTimeout(500);
      }

      const shiftTab = page.locator('.shift-panel-toggle-tab');
      if (await shiftTab.count() > 0) {
        await shiftTab.first().click();
        await page.waitForTimeout(500);
        const shiftOpenData = await page.evaluate(() => {
          const panels = document.querySelectorAll('.report-charts-grid > article');
          const catRect = panels[0]?.getBoundingClientRect();
          const sevRect = panels[1]?.getBoundingClientRect();
          return { catPanelWidth: catRect?.width, sevPanelWidth: sevRect?.width, sevPanelHeight: sevRect?.height };
        });
        measurements['1440-shiftpanel-open'] = shiftOpenData;
        await panelGrid.first().screenshot({ path: join(outputDir, `panels-1440-shiftopen.png`) });
      }
    }

    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(measurements, null, 2));
}

run().catch(console.error);
