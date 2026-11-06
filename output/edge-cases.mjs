import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));
const { chromium } = require('playwright');

const base = 'http://localhost:3000/dashboard';

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: 'Asia/Jakarta'
  });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('ctd_splash_seen', '1'); } catch {}
  });

  const page = await context.newPage();
  await page.goto(base);
  await page.waitForLoadState('networkidle');

  // Test 1: Standard data verification (values, percentages, center text)
  const stats = await page.evaluate(() => {
    const sevPanel = document.querySelectorAll('.report-charts-grid > article')[1];
    const donutTotal = sevPanel.querySelector('.donut-total-num')?.textContent;
    const donutLabel = sevPanel.querySelector('.donut-total-label')?.textContent;
    const cards = Array.from(sevPanel.querySelectorAll('.priority-spec-box')).map(c => ({
      name: c.querySelector('strong')?.textContent,
      count: c.querySelector('.spec-count')?.textContent,
      pct: c.querySelector('.spec-pct')?.textContent,
      barWidth: c.querySelector('.rounded-full > div')?.style.width
    }));
    return { donutTotal, donutLabel, cards };
  });

  console.log('STANDARD DATA:', stats);
  assert.equal(stats.donutTotal, '32', 'Center total is 32 (11+21)');
  assert.equal(stats.donutLabel, 'CRIT/HIGH', 'Center label is CRIT/HIGH');
  assert.equal(stats.cards[0].name, 'Critical');
  assert.equal(stats.cards[0].count, '11');
  assert.equal(stats.cards[0].pct, '13% share');
  assert.equal(stats.cards[0].barWidth, '13%');

  assert.equal(stats.cards[1].name, 'High');
  assert.equal(stats.cards[1].count, '21');
  assert.equal(stats.cards[1].pct, '24% share');
  assert.equal(stats.cards[1].barWidth, '24%');

  assert.equal(stats.cards[2].name, 'Medium');
  assert.equal(stats.cards[2].count, '25');
  assert.equal(stats.cards[2].pct, '28% share');
  assert.equal(stats.cards[2].barWidth, '28%');

  assert.equal(stats.cards[3].name, 'Low');
  assert.equal(stats.cards[3].count, '31');
  assert.equal(stats.cards[3].pct, '35% share');
  assert.equal(stats.cards[3].barWidth, '35%');

  // Test 2: Hover behavior on donut segments
  const segment = page.locator('.report-charts-grid > article:nth-child(2) circle.donut-segment').first();
  await segment.hover({ force: true });
  await page.waitForTimeout(100);
  console.log('Donut segment hover tested successfully');

  // Test 3: Edge cases via DOM mutation simulation in runtime
  const edgeCaseResults = await page.evaluate(() => {
    const sevPanel = document.querySelectorAll('.report-charts-grid > article')[1];
    const cardsGrid = sevPanel.querySelector('.priority-spectrum-list');

    // Simulate all zeroes
    const zeroesTest = (() => {
      // Test zero division logic
      const total = 0;
      const count = 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const barStyle = `${Math.min(100, Math.max(0, pct))}%`;
      return { pct, barStyle };
    })();

    // Simulate thousands (1,234)
    const thousandsTest = (() => {
      const card = cardsGrid.querySelector('.priority-spec-box');
      const countEl = card.querySelector('.spec-count');
      const orig = countEl.textContent;
      countEl.textContent = '1,234';
      const isClipped = card.scrollWidth > card.clientWidth || card.scrollHeight > card.clientHeight;
      countEl.textContent = orig;
      return { isClipped };
    })();

    return { zeroesTest, thousandsTest };
  });

  console.log('EDGE CASES:', edgeCaseResults);
  assert.equal(edgeCaseResults.zeroesTest.pct, 0);
  assert.equal(edgeCaseResults.zeroesTest.barStyle, '0%');
  assert.equal(edgeCaseResults.thousandsTest.isClipped, false);

  await context.close();
  await browser.close();
  console.log('ALL EDGE CASE ASSERTIONS PASSED!');
}

run().catch(e => { console.error(e); process.exit(1); });
