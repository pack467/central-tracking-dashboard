import {chromium,open,visit,root} from './r2-audit.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';import {join} from 'node:path';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const {ctx,page}=await open(browser);const results=[],errors=[];mkdirSync(root,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
async function run(name,fn){if(process.env.R2_TEST_FILTER&&!name.includes(process.env.R2_TEST_FILTER))return;try{await visit(page); const detail=await fn();results.push({name,pass:true,detail});console.log('PASS',name,JSON.stringify(detail??''));}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL',name,e.message);await page.screenshot({path:join(root,'failure-'+results.length+'.png'),scale:'css'});}}
const rect=e=>e.getBoundingClientRect().toJSON();
async function released(){const state=await page.evaluate(()=>({html:getComputedStyle(document.documentElement).overflowY,body:getComputedStyle(document.body).overflowY,inert:document.querySelectorAll('[inert]').length,hidden:document.querySelectorAll('#app-root[aria-hidden=true]').length,overlays:document.querySelectorAll('[data-sheet-open],[data-memo-open],[data-panel-viewer],[data-user-modal]').length}));assert.notEqual(state.html,'hidden');assert.notEqual(state.body,'hidden');assert.equal(state.inert,0);assert.equal(state.overlays,0);await page.evaluate(()=>scrollTo({top:0,behavior:"instant"}));await page.mouse.move(120,300);await page.mouse.wheel(0,200);await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>scrollY)>0);return state;}
await visit(page);
await run('one column, spacing, fonts and five row previews',async()=>{
 const data=await page.evaluate(()=>({columns:getComputedStyle(document.querySelector('.ops-focus-grid')).gridTemplateColumns,padding:getComputedStyle(document.querySelector('.page-content')).padding,gap:getComputedStyle(document.querySelector('.compact-ticket-report-container')).gap,opsGap:getComputedStyle(document.querySelector('.ops-focus-section')).gap,rows:[...document.querySelectorAll('.compact-today-ticket-row')].filter(e=>e.checkVisibility()).map(e=>e.getBoundingClientRect().height),checks:[...document.querySelectorAll('.monitoring-check-card')].filter(e=>e.checkVisibility()).length}));assert.ok(!data.columns.includes(' '));assert.equal(data.gap,'12px');assert.equal(data.opsGap,'12px');assert.equal(data.rows.length,5);assert.equal(data.checks,5);return data;
});
await run('fixed volume axis, native scrolling, legend isolation',async()=>{
 const axis=page.locator('.stacked-chart-container > div > svg').first();
 await axis.scrollIntoViewIfNeeded();const before=await axis.boundingBox();
 const wrap=page.locator('.compact-svg-barchart-wrap').first();
 const initial=await wrap.evaluate(e=>({left:e.scrollLeft,width:e.scrollWidth,client:e.clientWidth,scrollbar:getComputedStyle(e).scrollbarWidth}));
 assert.ok(initial.left>0);assert.equal(initial.scrollbar,'none');
 const plotBox=await wrap.boundingBox(),cdp=await ctx.newCDPSession(page);
 const touchY=plotBox.y+190,touchX=plotBox.x+50;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchX,y:touchY}]});
 for(let step=1;step<=7;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchX+step*20,y:touchY}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);
 assert.ok(await wrap.evaluate(e=>e.scrollLeft)<initial.left,'native horizontal touch scroll must move the plot');
 await wrap.evaluate(e=>e.scrollLeft=0);await page.waitForTimeout(100);const after=await axis.boundingBox();assert.equal(before.x,after.x);assert.equal(before.width,36);
 const today=await page.locator('.ops-count-badge').innerText();const kpis=await page.locator('.velocity-metrics-strip').innerText();
 const chip=page.locator('.project-legend-pill').first();await chip.click();assert.equal(await chip.getAttribute('aria-pressed'),'false');assert.equal(await page.locator('.ops-count-badge').innerText(),today);assert.equal(await page.locator('.velocity-metrics-strip').innerText(),kpis);await chip.click();return initial;
});
await run('chart touch tooltips stay inside chart and viewport; keyboard',async()=>{
 const rows=[];
 for(const [chart,tip] of [['.compact-velocity-chart-container','.velocity-chart-tooltip'],['.compact-shift-traffic-chart-container','.shift-traffic-tooltip']]){
  const el=page.locator(chart);await el.scrollIntoViewIfNeeded();await page.waitForTimeout(100);const bounds=await el.boundingBox();
  for(const x of [bounds.x+2,bounds.x+bounds.width-2]){await page.touchscreen.tap(x,bounds.y+130);await page.locator(tip).waitFor();await page.waitForTimeout(100);const box=await page.locator(tip).boundingBox();assert.ok(box.x>=bounds.x-1&&box.x+box.width<=bounds.x+bounds.width+1);assert.ok(box.y>=bounds.y-1&&box.y+box.height<=bounds.y+bounds.height+1);rows.push({chart,box});}
  await el.focus();await page.keyboard.press('Home');assert.equal(await el.getAttribute('aria-valuenow'),'0');await page.keyboard.press('ArrowRight');assert.equal(await el.getAttribute('aria-valuenow'),'1');await page.keyboard.press('Escape');assert.equal(await page.locator(tip).count(),0);
 }return rows;
});
await run('traffic segmented filtering and category severity tabs',async()=>{
 const controls=page.locator('.shift-filter-buttons button');const boxes=await controls.evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));assert.equal(boxes.length,4);assert.ok(Math.max(...boxes.map(b=>b.w))-Math.min(...boxes.map(b=>b.w))<1);assert.ok(boxes.every(b=>b.h>=40));
 for(const button of await controls.all()){await button.click();await page.waitForFunction(el=>el.getAttribute('aria-pressed')==='true',await button.elementHandle());assert.equal(await button.getAttribute('aria-pressed'),'true');}await controls.first().click();
 await page.getByRole('button',{name:'Severity',exact:true}).click();assert.equal(await page.locator('.priority-spec-box:visible').count(),4);const heights=await page.locator('.priority-spec-box:visible').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));assert.ok(heights.every(h=>h===heights[0]));await page.getByRole('button',{name:'Kategori',exact:true}).click();return {boxes,severityHeights:heights};
});
await run('FAB direction, idle, keyboard focus, bottom content clearance',async()=>{
 const fab=page.locator('.fab-new-ticket');await page.evaluate(()=>scrollTo({top:0,behavior:"instant"}));await page.waitForTimeout(240);assert.equal(await fab.getAttribute('data-scroll-hidden'),'false');
 await page.mouse.move(120,300);await page.mouse.wheel(0,400);await page.waitForFunction(()=>document.querySelector('.fab-new-ticket').dataset.scrollHidden==='true');await page.waitForFunction(()=>getComputedStyle(document.querySelector('.fab-new-ticket')).opacity==='0');assert.equal(await fab.getAttribute('data-scroll-hidden'),'true');const opacity=await fab.evaluate(e=>getComputedStyle(e).opacity);assert.equal(opacity,'0');
 await page.mouse.wheel(0,-80);await page.waitForTimeout(80);assert.equal(await fab.getAttribute('data-scroll-hidden'),'false');
 await page.mouse.wheel(0,180);await page.waitForTimeout(1000);assert.equal(await fab.getAttribute('data-scroll-hidden'),'false');
 await page.mouse.wheel(0,180);await page.waitForTimeout(60);await fab.focus();assert.equal(await fab.getAttribute('data-scroll-hidden'),'false');
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(1000);
 const clearance=await page.evaluate(()=>{const fab=document.querySelector('.fab-new-ticket').getBoundingClientRect(),last=document.querySelector('.shift-traffic-filter-bar').getBoundingClientRect(),nav=document.querySelector('nav[aria-label="Navigasi bawah mobile"]').getBoundingClientRect();return {fab:fab.toJSON(),last:last.toJSON(),nav:nav.toJSON(),transition:getComputedStyle(document.querySelector('.fab-new-ticket')).transitionDuration};});assert.ok(clearance.last.bottom<=clearance.fab.top);assert.ok(clearance.fab.bottom<clearance.nav.top);return clearance;
});
await run('visualViewport keyboard emulation hides nav and FAB',async()=>{
 await page.locator('.ops-shift-panel .panel-view-action-btn').click();await page.locator('[data-memo-open]').waitFor();
 const input=page.locator('[data-memo-open] textarea');await input.focus();
 await page.evaluate(()=>{window.__r2ViewportHeight=visualViewport.height;Object.defineProperty(visualViewport,'height',{configurable:true,get:()=>420});visualViewport.dispatchEvent(new Event('resize'));});await page.waitForTimeout(100);
 assert.equal(await page.locator('nav[aria-label="Navigasi bawah mobile"]').getAttribute('data-keyboard-open'),'true');assert.equal(await page.locator('.fab-new-ticket').getAttribute('data-keyboard-open'),'true');
 assert.equal(await page.locator('nav[aria-label="Navigasi bawah mobile"]').evaluate(e=>getComputedStyle(e).visibility),'hidden');
 await page.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'));});await page.keyboard.press('Escape');await page.waitForTimeout(100);assert.equal(await page.locator('nav[aria-label="Navigasi bawah mobile"]').getAttribute('data-keyboard-open'),'false');return released();
});
await run('20 rapid sheet cycles, focus trap, scroll restoration',async()=>{
 const more=page.getByRole('button',{name:'Lainnya',exact:true}),sheet=page.locator('[data-sheet-open]');
 for(let i=0;i<20;i++){await more.click();await sheet.waitFor();if(i===0){const buttons=sheet.locator('button,a,input,select').filter({visible:true});await buttons.last().focus();await page.keyboard.press('Tab');assert.equal(await buttons.first().evaluate(e=>e===document.activeElement),true);}if(i%3===0)await sheet.getByRole('button',{name:'Tutup sheet'}).click();else if(i%3===1)await page.mouse.click(5,65);else await page.keyboard.press('Escape');await sheet.waitFor({state:'detached'});}
 assert.equal(await more.evaluate(e=>e===document.activeElement),true);return released();
});
await run('memo, panel viewer and staff detail retain scroll after close',async()=>{
 const states=[];
 for(let i=0;i<20;i++){
  await page.locator('.ops-shift-panel .panel-view-action-btn').click();await page.locator('[data-memo-open]').waitFor();await page.keyboard.press('Escape');await page.locator('[data-memo-open]').waitFor({state:'detached'});
 }states.push(await released());
 await page.locator('.primary-chart-panel .panel-view-action-btn').click();await page.locator('[data-panel-viewer]').waitFor();await page.keyboard.press('Escape');await page.locator('[data-panel-viewer]').waitFor({state:'detached'});states.push(await released());
 await page.locator('.user-summary-card:visible').first().click();await page.locator('[data-user-modal]').waitFor();await page.keyboard.press('Escape');await page.locator('[data-user-modal]').waitFor({state:'detached'});states.push(await released());return states;
});
await run('pressed state, focus ring and reduced motion',async()=>{
 const button=page.getByRole('button',{name:'Ubah',exact:true});await button.scrollIntoViewIfNeeded();await page.keyboard.press('Tab');await button.focus();const outline=await button.evaluate(e=>({width:getComputedStyle(e).outlineWidth,color:getComputedStyle(e).outlineColor}));assert.equal(outline.width,'2px');
 const box=await button.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(120);const pressed=await button.evaluate(e=>({bg:getComputedStyle(e).backgroundColor,scale:getComputedStyle(e).scale}));assert.equal(pressed.bg,'rgb(36, 48, 68)');await page.mouse.move(0,0);await page.mouse.up();
 await page.emulateMedia({reducedMotion:'reduce'});const transition=await page.locator('.fab-new-ticket').evaluate(e=>getComputedStyle(e).transitionProperty);assert.equal(transition,'none');await page.emulateMedia({reducedMotion:'no-preference'});return {outline,pressed,transition};
});
await run('landscape short navigation without labels',async()=>{
 const {ctx:c,page:p}=await open(browser,844,390);await visit(p);const result=await p.locator('nav[aria-label="Navigasi bawah mobile"]').evaluate(e=>({height:e.getBoundingClientRect().height,visible:e.checkVisibility(),labels:[...e.querySelectorAll('.bottom-nav-label')].filter(e=>e.checkVisibility()).length}));assert.equal(result.height,45);assert.equal(result.visible,true);assert.equal(result.labels,0);await c.close();return result;
});
writeFileSync(join(root,process.env.R2_TEST_FILTER?'interaction-selected.json':'interactions.json'),JSON.stringify({results,errors},null,2));console.log('ERRORS',JSON.stringify(errors));await browser.close();
