import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,isMobile:true,timezoneId:'Asia/Jakarta'});
await ctx.addInitScript(()=>sessionStorage.setItem('ctd_splash_seen','1'));
const page=await ctx.newPage();page.setDefaultTimeout(12000);
page.setDefaultNavigationTimeout(120000);
const errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
await page.clock.setFixedTime(new Date('2026-10-23T00:17:00Z'));
const run=async(name,fn)=>{if(process.env.CTD_INTERACTION_FILTER&&!name.includes(process.env.CTD_INTERACTION_FILTER))return;try { const detail=await fn();results.push({name,pass:true,detail});console.log('PASS',name,JSON.stringify(detail??''));} catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL',name,e.message.slice(0,600));await page.screenshot({path:resolve('output/mobile-redesign/interaction-failure.png'),scale:'css'}).catch(()=>{});}};
const visit=async(route='/dashboard')=>{await page.goto('http://localhost:3000'+route,{waitUntil:'domcontentloaded'});await page.locator('.page-content h1').waitFor();await page.waitForTimeout(1000);await page.waitForFunction(()=>document.querySelectorAll('.page-content [aria-busy=true]').length===0,{},{timeout:25000});if(route==='/dashboard')await page.locator('.compact-velocity-chart-svg').waitFor({timeout:25000});await page.waitForTimeout(700);};
const more=page.getByRole('button',{name:'Lainnya',exact:true});
const sheet=()=>page.locator('[data-sheet-open]');
const scrollReleased=async()=>{
  assert.equal(await sheet().count(),0);
  const data=await page.evaluate(()=>({html:getComputedStyle(document.documentElement).overflowY,body:getComputedStyle(document.body).overflowY,inert:document.querySelectorAll('[inert]').length,overlay:document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('[data-sheet-open],[data-memo-open]')!==null}));
  assert.notEqual(data.html,'hidden');assert.notEqual(data.body,'hidden');assert.equal(data.inert,0);assert.equal(data.overlay,false);
  await page.evaluate(()=>window.scrollTo(0,0));await page.mouse.move(120,300);await page.mouse.wheel(0,250);await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>scrollY)>0);
  return data;
};
await visit();
await run('mobile layout and newest bars',async()=>page.evaluate(()=>({height:document.documentElement.scrollHeight,volume:{scrollLeft:document.querySelector('.compact-svg-barchart-wrap')?.scrollLeft,scrollWidth:document.querySelector('.compact-svg-barchart-wrap')?.scrollWidth},svg:[...document.querySelectorAll('.compact-velocity-chart-svg,.compact-shift-traffic-chart-svg')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,viewBox:e.getAttribute('viewBox'),minFont:Math.min(...[...e.querySelectorAll('text')].map(t=>parseFloat(getComputedStyle(t).fontSize)))}))})));
await run('More initial focus, Tab wrap, Shift Tab wrap, Escape return',async()=>{
  await more.click();await sheet().waitFor();await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>!!document.activeElement.closest('[data-sheet-open]')),true);
  const controls=sheet().locator('button,a,input,select,textarea').filter({visible:true});await controls.last().focus();await page.keyboard.press('Tab');assert.equal(await controls.first().evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Shift+Tab');assert.equal(await controls.last().evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Escape');assert.equal(await more.evaluate(e=>e===document.activeElement),true);return scrollReleased();
});
await run('20 fast sheet cycles: close button, backdrop, Escape',async()=>{
  for(let i=0;i<20;i++){await more.click();await sheet().waitFor();if(i%3===0)await sheet().getByRole('button',{name:'Tutup sheet'}).click();else if(i%3===1)await page.mouse.click(10,60);else await page.keyboard.press('Escape');await sheet().waitFor({state:'detached'});}
  return scrollReleased();
});
await run('swipe down closes sheet and releases touch/keyboard scrolling',async()=>{
  await more.click();await sheet().waitFor();const header=sheet().locator('div').filter({has:page.locator('[id]')});
  const target=sheet().locator('.cursor-grab');const box=await target.boundingBox();
  const cdp=await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:150,y:box.y+8}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:150,y:box.y+120}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);await scrollReleased();
  await page.keyboard.press('PageDown');await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>scrollY)>0);return true;
});
await run('all 8 routes via navigation and correct active item',async()=>{
  const rows=[];
  for(const [route,label,extra] of [['/tickets','Tickets'],['/monitoring','Monitoring'],['/shift-log','Shift Log'],['/reports','Reports',true],['/team-roster','Team Roster',true],['/master-data','Master Data',true],['/runbooks','Runbooks',true],['/dashboard','Dashboard']]){
    if(extra){await more.click();await sheet().getByRole('link',{name:label,exact:true}).click();}else await page.getByRole('navigation',{name:'Navigasi bawah mobile'}).getByRole('link',{name:label,exact:false}).click();
    await page.waitForURL('**'+route);await page.waitForTimeout(900);
    const active=await page.getByRole('navigation',{name:'Navigasi bawah mobile'}).locator('[aria-current=page]').allTextContents();
    if(!extra)assert.ok(active.some(t=>t.includes(label)));rows.push({route,active});
  }return rows;
});
await run('filter controls share values, inline calendar and reset',async()=>{
  await page.getByRole('button',{name:'Ubah',exact:true}).click();await sheet().waitFor();assert.equal(await sheet().locator('select').count(),4);
  const selected=sheet().getByRole('combobox',{name:'Filter proyek'});const value=await selected.locator('option').nth(1).getAttribute('value');await selected.selectOption(value);
  await sheet().getByRole('button',{name:'Filter tanggal analitik tiket'}).click();
  const cal=sheet().getByRole('dialog',{name:'Pilih rentang tanggal'});assert.equal(await cal.evaluate(e=>getComputedStyle(e).position),'relative');assert.ok((await cal.boundingBox()).width<=358);
  await page.screenshot({path:resolve('output/mobile-redesign/filter-sheet.png'),scale:'css'});
  await cal.getByRole('button',{name:'Selesai',exact:true}).click();await sheet().getByRole('button',{name:'Terapkan',exact:true}).click();
  await page.waitForURL(url=>url.searchParams.get('project')===value.toLowerCase());
  const counter=await page.locator('.analytics-filter-counter-badge').innerText();
  await page.getByRole('button',{name:'Ubah',exact:true}).click();assert.equal(await sheet().getByRole('combobox',{name:'Filter proyek'}).inputValue(),value);await sheet().getByRole('button',{name:'Reset',exact:true}).click();await sheet().getByRole('button',{name:'Terapkan',exact:true}).click();await page.waitForURL(url=>!url.searchParams.has('project'));await scrollReleased();return {value,counter};
});
await run('sheet closes on browser Back',async()=>{await page.getByRole('navigation',{name:'Navigasi bawah mobile'}).getByRole('link',{name:'Tickets'}).click();await page.waitForURL('**/tickets');await more.click();await sheet().waitFor();await page.goBack();await page.waitForTimeout(700);return scrollReleased();});
await visit();
await run('client selection sheet',async()=>{await page.getByRole('button',{name:/Klien aktif/}).click();await sheet().waitFor();const options=sheet().getByRole('option');assert.ok(await options.count()>1);const name=await options.nth(1).innerText();await options.nth(1).click();await page.waitForTimeout(2200);assert.equal(await sheet().count(),0);await page.getByRole('button',{name:/Klien aktif/}).click();await sheet().getByRole('option').first().click();await page.waitForTimeout(2200);return {name};});
await visit();
await run('ticket/staff/monitoring expansion and distribution swipe tabs',async()=>{
  await page.locator('.ops-today-panel').getByRole('button',{name:/Lihat semua/}).click();assert.equal(await page.locator('.compact-today-ticket-row:visible').count(),33);await page.locator('.ops-today-panel').getByRole('button',{name:'Ringkas'}).click();assert.equal(await page.locator('.compact-today-ticket-row:visible').count(),5);
  await page.locator('.ops-engineer-panel').getByRole('button',{name:/Lihat semua/}).click();assert.equal(await page.locator('.monitoring-check-card:visible').count(),13);await page.locator('.ops-engineer-panel').getByRole('button',{name:'Ringkas'}).click();
  await page.getByRole('button',{name:'Severity',exact:true}).click();await page.waitForTimeout(450);assert.equal(await page.getByRole('button',{name:'Severity',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Kategori',exact:true}).click();return true;
});
await run('touch tooltips and pan-y',async()=>{
  await visit();
  for(const [selector,tooltip] of [['.compact-velocity-chart-container','.velocity-chart-tooltip'],['.compact-shift-traffic-chart-container','.shift-traffic-tooltip']]){
    const chart=page.locator(selector);await chart.scrollIntoViewIfNeeded();await chart.tap({position:{x:120,y:120}});await page.locator(tooltip).waitFor();const box=await page.locator(tooltip).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390);assert.equal(await chart.evaluate(e=>getComputedStyle(e).touchAction),'pan-y');
  }return true;
});
await run('volume touch detail, legend visibility and MoM sizing',async()=>{
  await visit();const chart=page.locator('.compact-svg-barchart-wrap');await chart.scrollIntoViewIfNeeded();
  const legend=page.locator('.project-legend-pill[role=button]').first();await legend.click();assert.equal(await legend.getAttribute('aria-pressed'),'false');await legend.click();assert.equal(await legend.getAttribute('aria-pressed'),'true');
  await page.locator('.stacked-bar-group').last().tap();await page.locator('.chart-hover-popover').waitFor();assert.ok((await page.locator('.chart-hover-popover').innerText()).includes('2026-09-11'));await page.getByRole('button',{name:'Tutup detail tanggal'}).click();
  await page.getByRole('button',{name:'MoM',exact:true}).click();await page.waitForURL(url=>url.searchParams.get('chart')==='trajectory');await page.waitForTimeout(350);
  const data=await page.locator('.compact-report-bar-svg-lg').evaluate(e=>({width:e.getBoundingClientRect().width,viewBox:e.viewBox.baseVal.width,minFont:Math.min(...[...e.querySelectorAll('text')].map(t=>parseFloat(getComputedStyle(t).fontSize)))}));assert.equal(data.width,data.viewBox);assert.ok(data.minFont>=11);await page.getByRole('button',{name:'Vol',exact:true}).click();await page.waitForURL(url=>!url.searchParams.has('chart'));return data;
});
await run('staff detail focus trap and release',async()=>{
  await visit();const card=page.locator('.user-summary-card').first();await card.click();const modal=page.getByRole('dialog',{name:/Detail tiket/});await modal.waitFor();await page.waitForTimeout(100);assert.equal(await modal.evaluate(e=>e.contains(document.activeElement)),true);await page.keyboard.press('Shift+Tab');assert.equal(await modal.evaluate(e=>e.contains(document.activeElement)),true);await page.keyboard.press('Escape');await modal.waitFor({state:'detached'});return scrollReleased();
});
await run('desktop filter matches mobile result',async()=>{
  const dc=await browser.newContext({viewport:{width:1280,height:800},timezoneId:'Asia/Jakarta'});await dc.addInitScript(()=>sessionStorage.setItem('ctd_splash_seen','1'));const dp=await dc.newPage();dp.setDefaultNavigationTimeout(120000);await dp.goto('http://localhost:3000/dashboard',{waitUntil:'domcontentloaded'});await dp.getByRole('combobox',{name:'Filter proyek'}).waitFor();await dp.waitForFunction(()=>document.querySelectorAll('[aria-busy=true]').length===0);await dp.getByRole('combobox',{name:'Filter proyek'}).selectOption('APH');await dp.waitForURL(url=>url.searchParams.get('project')==='aph');const counter=await dp.locator('.analytics-filter-counter-badge').innerText();assert.match(counter,/12.*88/);await dc.close();return counter;
});
await run('memo 20 close cycles, focus and auto scroll release',async()=>{
  const view=page.locator('.ops-shift-panel').getByRole('button');
  for(let i=0;i<20;i++){await view.click();const modal=page.locator('[data-memo-open]');await modal.waitFor();if(i%2)await page.keyboard.press('Escape');else await modal.getByRole('button',{name:/Tutup/}).last().click();await modal.waitFor({state:'detached'});}
  return scrollReleased();
});
await run('Panel Viewer deep link and close',async()=>{
  await page.goto('http://localhost:3000/dashboard?panel=ticket-volume');const viewer=page.locator('[data-panel-viewer]');await viewer.waitFor();await page.keyboard.press('Escape');await viewer.waitFor({state:'detached'});return scrollReleased();
});
await run('320px transition header, safe areas, bottom content, reduced motion',async()=>{
  await page.setViewportSize({width:320,height:568});await page.clock.setFixedTime(new Date('2026-10-23T01:10:00Z'));await visit();
  const header=await page.locator('.app-topbar').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,children:[...el.querySelectorAll('button,.app-shift-badge,.app-clock-badge')].filter(e=>e.checkVisibility()).map(e=>({name:e.textContent,w:e.getBoundingClientRect().width,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}));assert.ok(header.scrollWidth<=320,JSON.stringify(header));
  const cdp=await ctx.newCDPSession(page);let safeArea;
  await page.evaluate(()=>{document.documentElement.style.setProperty('--ctd-safe-top','44px');document.documentElement.style.setProperty('--ctd-safe-bottom','34px');});
  safeArea=await page.locator('.app-topbar').evaluate(e=>e.getBoundingClientRect().height);assert.equal(safeArea,96);
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(150);
  const bottom=await page.evaluate(()=>({content:document.querySelector('.shift-traffic-panel').getBoundingClientRect().bottom,nav:document.querySelector('[aria-label="Navigasi bawah mobile"]').getBoundingClientRect().top,fab:document.querySelector('.fab-new-ticket').getBoundingClientRect().top}));assert.ok(bottom.content<=Math.min(bottom.nav,bottom.fab),JSON.stringify(bottom));
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('.compact-ticket-report-container').waitFor();return {header,safeArea,bottom};
});
writeFileSync(resolve(process.env.CTD_INTERACTION_FILTER?'output/mobile-redesign/expansion-check.json':'output/mobile-redesign/interactions.json'),JSON.stringify({results,errors},null,2));await browser.close();
