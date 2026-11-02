import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
let require = createRequire(import.meta.url);
try { require.resolve('playwright'); } catch {
  require = createRequire(join(process.env.CTD_TOOL_NODE_MODULES ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'), 'playwright/package.json'));
}
const { chromium } = require('playwright');
const base = process.env.CTD_TEST_URL ?? 'http://localhost:3000';
const output = resolve(import.meta.dirname, '../../output/routing');
mkdirSync(join(output, 'after'), { recursive: true });
const results = [], errors = [], failedResponses = [];
const browser = await chromium.launch({ headless: true, channel: process.env.CTD_BROWSER_CHANNEL ?? 'chrome' });
const storagePath = join(output, 'storage-390.json');
const makeContext = async (width = 1280, options = {}) => {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Asia/Jakarta', ...(existsSync(storagePath) ? { storageState: storagePath } : {}), ...options });
  await ctx.addInitScript(() => sessionStorage.setItem('ctd_splash_seen', '1'));
  return ctx;
};
const context = await makeContext();
const page = await context.newPage();
page.setDefaultTimeout(7000);
page.setDefaultNavigationTimeout(30000);
await page.clock.setFixedTime(new Date('2026-10-11T03:00:00Z'));
page.on('pageerror', e => errors.push({ type: 'pageerror', message: e.message }));
page.on('console', m => { if (m.type() === 'error') errors.push({ type: 'console', message: m.text() }); });
page.on('response', r => { if(r.status() >= 400) failedResponses.push({status:r.status(),url:r.url(),type:r.request().resourceType()}); });
const run = async (name, fn) => { if(process.env.CTD_TEST_FILTER && !name.includes(process.env.CTD_TEST_FILTER))return; if(process.env.CTD_SKIP_PIXEL && name.startsWith('pixel'))return; try { const detail = await fn(); results.push({ name, pass: true, detail }); console.log('PASS', name); } catch (error) { results.push({ name, pass: false, error: error.message }); console.log('FAIL', name, error.message.slice(0,700)); } };
const visit = async path => {
  await page.goto(base + path);
  await page.locator('.page-content h1').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(850);
};
const links = [
  ['/dashboard','Dashboard'], ['/tickets','Tickets'], ['/tickets/escalations','Tickets'], ['/monitoring','Monitoring'], ['/monitoring/history','Monitoring'], ['/shift-log','Shift Log'], ['/reports','Reports'], ['/reports/ticket-log','Reports'], ['/reports/monitoring-log','Reports'], ['/reports/pdf-preview','Reports'], ['/team-roster','Team Roster'], ['/team-roster?view=weekly&week=2026-W34','Team Roster'], ['/team-roster?view=monthly&month=2026-09','Team Roster'], ['/runbooks','Runbooks'], ['/runbooks/credentials','Runbooks'], ['/runbooks/links','Runbooks'], ['/runbooks/escalation','Runbooks'], ['/notifications','Notifikasi'], ['/profile','Profile'],
];
for (const [path,label] of links) await run('hard reload ' + path, async () => {
  await visit(path);
  assert.equal(await page.locator('.page-content h1').count(), 1);
  assert.equal(new URL(page.url()).pathname, path.split('?')[0]);
  if (!['Notifikasi','Profile'].includes(label)) assert.equal(await page.locator('nav a[aria-current="page"]').innerText(), label);
  assert.match(await page.title(), /Central Tracking Dashboard/);
  if (path.includes('weekly')) assert.match(await page.locator('.page-content').innerText(), /17 Aug|23 Aug/);
  if (path.includes('monthly')) assert.match(await page.locator('.page-content').innerText(), /September/);
  return { title: await page.title(), url: page.url() };
});
await run('reports global filters and tab links', async () => {
  await visit('/reports/ticket-log?from=2026-09-05&to=2026-09-11&project=aph');
  assert.equal(await page.locator('#report-tab-tickets[aria-selected="true"]').innerText().then(t=>t.split('\n')[0]), 'Ticket log');
  const expected = new URL(page.url()).search;
  const selected = await page.locator('select').first().inputValue();
  assert.equal(selected.toLowerCase(), 'aph');
  await page.getByRole('tab', {name:/Monitoring Log/i}).click();
  await page.waitForTimeout(900);
  assert.equal(new URL(page.url()).search, expected);
  await page.reload(); await page.waitForTimeout(1500);
  assert.equal(new URL(page.url()).search, expected);
  assert.equal(await page.locator('select').first().inputValue(), selected);
});
await run('sidebar SPA and shell identity, Back/Forward, new tab', async () => {
  await visit('/dashboard');
  await page.evaluate(() => { window.__routingShell = document.querySelector('[data-shell]'); window.__routingClock = document.querySelector('.topbar'); });
  for (const [path,label] of links.filter(([path])=>!path.includes('?')&&!path.slice(1).includes('/')&&!['/notifications','/profile'].includes(path))) {
    await page.locator('nav a').filter({hasText: new RegExp('^' + label + '$')}).click();
    await page.waitForURL(base+path); await page.waitForTimeout(500);
    assert.equal(new URL(page.url()).pathname, path);
    assert.equal(await page.evaluate(() => window.__routingShell === document.querySelector('[data-shell]') && window.__routingClock === document.querySelector('.topbar')), true);
    assert.equal(await page.locator('#ctd-app-splash').count(), 0);
  }
  const prior = new URL(page.url()).pathname;
  await page.goBack(); await page.waitForTimeout(700);
  assert.notEqual(new URL(page.url()).pathname, prior);
  await page.goForward(); await page.waitForTimeout(700);
  assert.equal(new URL(page.url()).pathname, prior);
  const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('nav a').filter({hasText:'Tickets'}).click({modifiers:['Control']})]);
  await popup.waitForLoadState(); assert.equal(new URL(popup.url()).pathname, '/tickets'); await popup.close();
});
await run('query validation and single canonical replace', async () => {
  await visit('/tickets?status=ngawur&priority=invalid&size=NaN&page=-1&junk=x');
  assert.equal(new URL(page.url()).search, '');
  const history = await page.evaluate(()=>history.length);
  await page.waitForTimeout(1300); assert.equal(await page.evaluate(()=>history.length),history);
  await visit('/reports?from=2026-09-12&to=2026-09-06');
  assert.equal(new URL(page.url()).searchParams.get('from'), '2026-09-06');
  assert.equal(new URL(page.url()).searchParams.get('to'), '2026-09-12');
  await visit('/reports?from=abc');
  assert.equal(new URL(page.url()).search, '');
});
await run('debounced search replaces history; pagination pushes', async () => {
  await visit('/tickets');
  const initial = await page.evaluate(()=>history.length);
  const input = page.getByRole('textbox', {name: 'Cari tiket'}).first();
  await input.fill('a'); await input.fill('ap'); await input.fill('aph');
  await page.waitForTimeout(700);
  assert.equal(new URL(page.url()).searchParams.get('q'), 'aph');
  assert.equal(await page.evaluate(()=>history.length),initial);
  assert.equal(await page.locator('#route-progress-bar').count(),0);
  await input.fill(''); await page.waitForTimeout(500);
  const pagination = page.locator('button').filter({hasText:/^2$/}).first();
  if (await pagination.count()) { await pagination.click(); await page.waitForTimeout(500); assert.equal(new URL(page.url()).searchParams.get('page'),'2'); assert.equal(await page.evaluate(()=>history.length),initial+1); }
  else throw new Error('Expected at least two ticket pages');
});
await run('roster modes and periods push history', async () => {
  await visit('/team-roster?view=weekly&week=2026-W34');
  const before=await page.evaluate(()=>history.length);
  await page.getByRole('button',{name:/Monthly/i}).click(); await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).searchParams.get('view'),'monthly');
  assert.equal(await page.evaluate(()=>history.length),before+1);
  await page.goBack(); await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).searchParams.get('view'),'weekly');
  await page.reload(); await page.waitForTimeout(1000);
  assert.match(await page.locator('.page-content').innerText(),/17 Aug/);
});
await run('ticket drawer preserves list and filters; invalid ID', async () => {
  await visit('/tickets?status=active');
  await page.evaluate(()=>window.__ticketList=document.querySelector('[role="table"]'));
  await page.getByRole('row').filter({has:page.locator('strong')}).first().click();
  await page.getByRole('dialog',{name:'Detail ticket'}).waitFor();
  const path=new URL(page.url()).pathname;
  assert.match(path,/^\/tickets\/[a-z0-9-]+$/);
  assert.equal(new URL(page.url()).searchParams.get('status'),'active');
  assert.equal(await page.evaluate(()=>window.__ticketList===document.querySelector('[role="table"]')),true);
  await page.reload(); await page.getByRole('dialog',{name:'Detail ticket'}).waitFor();
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).pathname,'/tickets');
  assert.equal(new URL(page.url()).searchParams.get('status'),'active');
  await visit('/tickets/missing-id');
  await page.getByRole('dialog',{name:'Tiket tidak ditemukan'}).waitFor();
  await page.getByRole('link',{name:'Kembali ke daftar'}).click(); await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).pathname,'/tickets');
});
await run('roster detail deep link and missing ID', async () => {
  await visit('/team-roster');
  const member = page.locator('[role="row"] button').first();
  const names = await page.locator('.page-content button').allTextContents();
  // Roster cells retain their original keyboard handlers; open the first name.
  const clickable = page.locator('.page-content [role="button"]').first();
  if(await clickable.count()) await clickable.click(); else await member.click();
  await page.waitForTimeout(500);
  await page.waitForURL(/\/team-roster\/.+/); assert.match(new URL(page.url()).pathname,/^\/team-roster\/.+/);
  await page.reload(); await page.getByRole('dialog').waitFor();
  await visit('/team-roster/missing-id'); await page.getByRole('dialog',{name:'Anggota tidak ditemukan'}).waitFor();
  return names.slice(0,4);
});
await run('runbook detail deep link and missing ID', async () => {
  await visit('/runbooks');
  await page.locator('[role=button][aria-expanded]').first().click(); await page.waitForTimeout(500);
  assert.match(new URL(page.url()).pathname,/^\/runbooks\/.+/);
  await page.reload(); await page.waitForTimeout(1000);
  assert.equal(await page.locator('[role=button][aria-expanded="true"]').count(),1);
  await visit('/runbooks/missing-id'); await page.getByRole('dialog',{name:'Runbook tidak ditemukan'}).waitFor();
});
await run('scroll preserved for query, reset for pages, restored on history', async () => {
  await visit('/tickets'); await page.evaluate(()=>window.scrollTo(0,400));
  const before=await page.evaluate(()=>window.scrollY);
  await page.getByRole('tab',{name:/^Active/}).click(); await page.waitForTimeout(600);
  assert.equal(await page.evaluate(()=>window.scrollY),before);
  await page.locator('nav a').filter({hasText:'Dashboard'}).click(); await page.waitForTimeout(800);
  assert.equal(await page.evaluate(()=>window.scrollY),0);
  await page.goBack(); await page.waitForTimeout(800);
  assert.equal(await page.evaluate(()=>window.scrollY),before);
});
await run('canonical redirects (one response) and unknown URL', async () => {
  for(const [from,to,status] of [['/','/dashboard',307],['/Dashboard','/dashboard',308],['/Monitor','/monitoring',308],['/MONITORING/','/monitoring',308],['/reports/overview/','/reports',308],['/?tab=profile','/profile',307]]){
    const r=await fetch(base+from,{redirect:'manual'}); assert.equal(r.status,status); assert.equal(new URL(r.headers.get('location'),base).pathname,to);
  }
  const r=await page.goto(base+'/does-not-exist'); assert.equal(r.status(),404); await page.waitForTimeout(900); assert.equal(await page.locator('h1').count(),1);
});
await run('signed-out deep link retains safe login destination', async () => {
  await page.goto(base+'/dashboard');
  await page.evaluate(()=>localStorage.setItem('ctd.is_logged_out','true'));
  await page.goto(base+'/reports/ticket-log?project=aph');
  await page.waitForURL('**/login?next=*');
  assert.equal(new URL(page.url()).searchParams.get('next'),'/reports/ticket-log?project=aph');
  await page.evaluate(()=>localStorage.removeItem('ctd.is_logged_out'));
});
// Baseline comparisons use identical clock, storage, viewport and settled animations.
for(const width of [1280,390])await run('pixel baseline '+width,async()=>{
  const ctx=await makeContext(width); const p=await ctx.newPage();
  await p.clock.setFixedTime(new Date('2026-10-11T03:00:00Z'));
  const {PNG}=require('pngjs'); const pixelmatch=(await import(pathToFileURL(require.resolve('pixelmatch')).href)).default;
  const diffs=[];
  for(const [path,label] of links.filter(([path])=>!path.includes('?')&&!path.slice(1).includes('/')&&!['/notifications','/profile'].includes(path))){
    await p.goto(base+path); await p.locator('.page-content h1').waitFor(); await p.waitForTimeout(7500);
    const key=`${width}-${label.replaceAll(' ','-').toLowerCase()}.png`;
    const afterPath=join(output,'after',key); await p.screenshot({path:afterPath,fullPage:true,animations:'disabled'});
    const beforePath=join(output,'before',key); if(!existsSync(beforePath))throw new Error('Missing baseline '+key);
    const a=PNG.sync.read(readFileSync(beforePath)),b=PNG.sync.read(readFileSync(afterPath));
    if(a.width!==b.width||a.height!==b.height){diffs.push({page:path,sizeBefore:[a.width,a.height],sizeAfter:[b.width,b.height],percent:100});continue;}
    const out=new PNG({width:a.width,height:a.height}); const mismatch=pixelmatch(a.data,b.data,out.data,a.width,a.height,{threshold:0.1});
    writeFileSync(join(output,'after','diff-'+key),PNG.sync.write(out)); diffs.push({page:path,percent:100*mismatch/(a.width*a.height)});
  }
  await ctx.close(); writeFileSync(join(output,`pixel-${width}.json`),JSON.stringify(diffs,null,2));
  assert.ok(diffs.every(d=>d.percent<0.5),JSON.stringify(diffs)); return diffs;
});
const expected404 = failedResponses.filter(r=>r.status===404 && r.url.includes('/does-not-exist'));
const unexpectedErrors = errors.filter(e=>!(e.type==='console' && e.message.includes('404 (Not Found)') && expected404.length));
results.push({name:'console and hydration',pass:unexpectedErrors.length===0 && failedResponses.every(r=>expected404.includes(r)),errors:unexpectedErrors,failedResponses,expected404});
writeFileSync(join(output,base.endsWith('3001')?'production-verification.json':'verification.json'),JSON.stringify(results,null,2));
await browser.close();
if(results.some(r=>!r.pass))process.exitCode=1;
