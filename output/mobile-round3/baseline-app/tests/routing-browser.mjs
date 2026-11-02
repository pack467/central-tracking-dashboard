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
const storageState = existsSync(storagePath) ? JSON.parse(readFileSync(storagePath, 'utf8')) : undefined;
if (storageState) storageState.origins = storageState.origins.map(entry => ({ ...entry, origin: new URL(base).origin }));
const makeContext = async (width = 1280, options = {}) => {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Asia/Jakarta', ...(storageState ? { storageState } : {}), ...options });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('ctd_splash_seen', '1'); } catch { /* A new tab may initially have an opaque origin. */ } });
  ctx.on('page',p=>{
    p.on('pageerror', e => errors.push({ type: 'pageerror', message: e.message }));
    p.on('console', m => { if (m.type() === 'error') errors.push({ type: 'console', message: m.text(), location: m.location() }); });
    p.on('response', r => { if(r.status() >= 400) failedResponses.push({status:r.status(),url:r.url(),type:r.request().resourceType()}); });
  });
  return ctx;
};
const context = await makeContext();
const page = await context.newPage();
page.setDefaultTimeout(7000);
page.setDefaultNavigationTimeout(30000);
await page.clock.setFixedTime(new Date('2026-10-11T03:00:00Z'));
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
  assert.equal(new URL(page.url()).pathname, '/reports/monitoring-log');
  assert.equal(new URL(page.url()).search, expected);
  await page.reload(); await page.waitForTimeout(1500);
  assert.equal(new URL(page.url()).search, expected);
  assert.equal(await page.locator('select').first().inputValue(), selected);
});
await run('sidebar SPA and shell identity, Back/Forward, new tab', async () => {
  await visit('/dashboard');
  await page.evaluate(() => { window.__routingShell = document.querySelector('[data-shell]'); window.__routingClock = document.querySelector('.topbar'); });
  for (const [path,label] of links.filter(([path])=>!path.includes('?')&&!path.slice(1).includes('/')&&!['/notifications','/profile'].includes(path))) {
    const changed = new URL(page.url()).pathname !== path;
    await page.locator('nav a').filter({hasText: new RegExp('^' + label + '$')}).click();
    await page.waitForURL(base+path); await page.waitForTimeout(500);
    assert.equal(new URL(page.url()).pathname, path);
    assert.equal(await page.evaluate(() => window.__routingShell === document.querySelector('[data-shell]') && window.__routingClock === document.querySelector('.topbar')), true);
    assert.equal(await page.locator('#ctd-app-splash').count(), 0);
    if (changed) assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('.page-content h1')), true, 'Incoming heading receives focus: '+path);
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
  const clickable = page.locator('.page-content a[href^="/team-roster/"]').first();
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
await run('slow navigation shows progress and skeleton, then focuses heading', async () => {
  const ctx = await makeContext(); const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date('2026-10-11T03:00:00Z'));
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/monitoring')) await new Promise(resolve => setTimeout(resolve, 1200));
    if (url.pathname.includes('MonitoringView') && url.pathname.endsWith('.js')) await new Promise(resolve => setTimeout(resolve, 2500));
    await route.continue();
  });
  try {
    await p.goto(base+'/dashboard'); await p.locator('.page-content h1').waitFor(); await p.waitForTimeout(700);
    await p.locator('nav a[title="Monitoring"]').click();
    await p.locator('#route-progress-bar').waitFor({state:'visible'});
    await p.locator('.page-content [aria-busy="true"]').first().waitFor({state:'visible'});
    await p.waitForURL('**/monitoring'); await p.locator('.page-content h1').waitFor(); await p.waitForTimeout(400);
    assert.equal(await p.locator('#route-progress-bar').count(),0);
    assert.equal(await p.locator('#ctd-app-splash').count(),0);
    assert.equal(await p.evaluate(()=>document.activeElement===document.querySelector('.page-content h1')),true);
  } finally { await ctx.close(); }
});
await run('canonical redirects (one response) and unknown URL', async () => {
  for(const [from,to,status] of [['/','/dashboard',307],['/Dashboard','/dashboard',308],['/Monitor','/monitoring',308],['/MONITORING/','/monitoring',308],['/reports/overview/','/reports',308],['/?tab=profile','/profile',307]]){
    const r=await fetch(base+from,{redirect:'manual'}); assert.equal(r.status,status); assert.equal(new URL(r.headers.get('location'),base).pathname,to);
  }
  const r=await page.goto(base+'/does-not-exist'); assert.equal(r.status(),404); await page.waitForTimeout(900); assert.equal(await page.locator('h1').count(),1);
});
await run('monitoring verdicts, notes, clock, sidebar and panel persist', async () => {
  await visit('/monitoring');
  const original=await page.evaluate(()=>localStorage.getItem('ctd.checkpoints'));
  await page.getByRole('button',{name:'Tandai checkpoint sebagai OK',exact:true}).first().click();
  await page.getByRole('button',{name:'Tambah catatan',exact:true}).first().click();
  await page.locator('#checkpoint-note-input').fill('Routing persistence QA: queue stabil');
  await page.getByRole('dialog').getByRole('button',{name:/Simpan/}).click();
  await page.getByRole('button',{name:'Tandai checkpoint sebagai NOK',exact:true}).first().click();
  await page.locator('#checkpoint-note-input').fill('Routing persistence QA: latensi API');
  await page.getByRole('dialog').getByRole('button',{name:/Simpan/}).click();
  await page.waitForTimeout(300);
  const stored=await page.evaluate(()=>localStorage.getItem('ctd.checkpoints'));
  assert.ok(stored.includes('queue stabil') && stored.includes('latensi API'));
  if(await page.getByRole('button',{name:'Tutup panel roster tim'}).count())await page.getByRole('button',{name:'Tutup panel roster tim'}).click();
  await page.getByRole('button',{name:'Ciutkan sidebar',exact:true}).click();
  await page.getByRole('button',{name:'Buka panel roster tim'}).click();
  await page.clock.setFixedTime(new Date('2026-10-11T03:00:05Z'));
  await page.getByRole('link',{name:'Lihat jadwal shift roster'}).click();await page.waitForURL('**/team-roster');await page.waitForTimeout(500);
  assert.equal(await page.locator('.sidebar-is-collapsed.shift-panel-is-open').count(),1);
  await page.getByRole('button',{name:'Tutup panel roster tim'}).click();
  await page.locator('nav a[title="Dashboard"]').click();await page.waitForURL('**/dashboard');await page.waitForTimeout(1200);
  assert.equal(await page.locator('.sidebar-is-collapsed').count(),1);
  assert.match(await page.locator('.topbar').innerText(),/10:00:05/);
  await page.locator('nav a[title="Monitoring"]').click();await page.waitForURL('**/monitoring');await page.waitForTimeout(700);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ctd.checkpoints')),stored);
  await page.getByRole('button',{name:'Buka panel roster tim'}).click();
  await page.reload();await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ctd.checkpoints')),stored);
  assert.equal(await page.locator('.sidebar-is-collapsed.shift-panel-is-open').count(),1);
  await page.getByRole('button',{name:'Tutup panel roster tim'}).click();
  await page.getByRole('button',{name:'Lebarkan sidebar',exact:true}).click();
  await page.evaluate(value=>value===null?localStorage.removeItem('ctd.checkpoints'):localStorage.setItem('ctd.checkpoints',value),original);
  await page.clock.setFixedTime(new Date('2026-10-11T03:00:00Z'));
});
await run('SM/ActiveMQ slug and Reports copied URL reproduce CSV data',async()=>{
  await visit('/runbooks/escalation?project=sm-activemq');
  assert.ok((await page.getByRole('button',{name:/SM\/ActiveMQ/}).getAttribute('class')).includes('bg-[var(--accent-blue-soft)]'));
  assert.equal(new URL(page.url()).searchParams.get('project'),'sm-activemq');
  await visit('/reports/ticket-log?from=2026-09-06&to=2026-09-12&project=aph');
  const url=page.url();
  const copied=await makeContext();const other=await copied.newPage();await other.clock.setFixedTime(new Date('2026-10-11T03:00:00Z'));await other.goto(url);await other.locator('.page-content h1').waitFor();await other.waitForTimeout(1400);
  assert.equal(await page.locator('.page-content').innerText(),await other.locator('.page-content').innerText());
  const downloadText=async p=>{await p.locator('summary[aria-label="Ekspor CSV"]').click();const [download]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:/Ticket log \(.csv\)/}).click()]);const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks).toString('utf8');};
  const csv=await downloadText(page),copy=await downloadText(other);assert.equal(csv,copy);assert.ok(csv.includes('APH'));
  await copied.close();
});
await run('signed-out deep link retains safe login destination', async () => {
  await page.goto(base+'/dashboard');
  await page.evaluate(()=>localStorage.setItem('ctd.is_logged_out','true'));
  await page.goto(base+'/reports/ticket-log?project=aph');
  await page.waitForURL('**/login?next=*');
  assert.equal(new URL(page.url()).searchParams.get('next'),'/reports/ticket-log?project=aph');
  await page.locator('#login-identifier').fill('EMP-1001');await page.locator('#login-password').fill('password123');
  await page.getByRole('button',{name:'Masuk',exact:true}).click();await page.waitForURL('**/reports/ticket-log?project=aph');
  for(const destination of ['//evil.com','https://evil.com','javascript:']){
    await page.goto(base+'/login?next='+encodeURIComponent(destination));await page.locator('#ctd-app-splash').waitFor({state:'detached'});await page.locator('#login-identifier').fill('EMP-1001');await page.locator('#login-password').fill('password123');
    await page.getByRole('button',{name:'Masuk',exact:true}).click();await page.waitForURL('**/dashboard');
  }
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
    const beforePath=join(output,width===390 && !key.includes('tickets')?'reconstructed':'before',key); if(!existsSync(beforePath))throw new Error('Missing baseline '+key);
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
const filterName=process.env.CTD_TEST_FILTER?'-'+process.env.CTD_TEST_FILTER.replaceAll(/[^a-z0-9]+/gi,'-'):'';
writeFileSync(join(output,(base.endsWith('3001')?'production-verification':'verification')+filterName+'.json'),JSON.stringify(results,null,2));
await browser.close();
if(results.some(r=>!r.pass))process.exitCode=1;

