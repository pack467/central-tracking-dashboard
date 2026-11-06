import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire('C:/Users/GALIH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
mkdirSync('output/routing/before', { recursive: true });
const results = [];
for (const width of [390]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Asia/Jakarta' });
  await context.addInitScript(() => sessionStorage.setItem('ctd_splash_seen', '1'));
  const page = await context.newPage(); page.on('pageerror', e => console.log('BASELINE ERROR:', e.message));
  await page.clock.setFixedTime(new Date('2026-10-11T03:00:00Z'));

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(7000); await page.evaluate(() => document.getElementById('__vinext_dev_error_overlay_root')?.remove());
  for (const label of ['Dashboard', 'Tickets', 'Monitoring', 'Shift Log', 'Reports', 'Team Roster', 'Runbooks']) {
    if (width === 390) {
      await page.getByRole('button', { name: /menu|navigasi mobile/i }).first().click({ force: true });
      await page.locator('.mobile-drawer').getByRole('button', { name: new RegExp(''^'' + label) }).click({ force: true });
    } else await page.locator('nav').getByRole('button', { name: new RegExp(''^'' + label) }).first().click({ force: true });
    await page.waitForTimeout(1300); await page.evaluate(() => document.getElementById('__vinext_dev_error_overlay_root')?.remove());
    await page.screenshot({ path: `output/routing/before/${width}-${label.replaceAll(' ', '-').toLowerCase()}.png`, fullPage: true, animations: 'disabled', style: '#__vinext_dev_error_overlay_root { display: none; }' });
    results.push({ width, label, title: await page.title(), h1: await page.locator('h1').allTextContents() });
  }
  await context.storageState({ path: `output/routing/storage-${width}.json` });
  await context.close();
}
writeFileSync('output/routing/baseline.json', JSON.stringify(results, null, 2));
await browser.close();





