import {chromium,open,visit} from './r2-audit.mjs';import {writeFileSync,readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'}),rows=process.env.R4_EXIT_RESUME?JSON.parse(readFileSync('output/mobile-round4/exit-tests.json','utf8')).rows:[],errors=[];
for(const width of [390,1920]){
 const {ctx,page}=await open(browser,width,width===390?844:1080),cdp=await ctx.newCDPSession(page);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 for(const [panel,name] of [['category','Perbesar panel Distribusi Kategori'],['recap','Perbesar panel Rekap Tiket per User']])for(const method of ['Escape','back button','close button','browser back']){
  if(rows.some(r=>r.width===width&&r.panel===panel&&r.method===method))continue;
  if(method==='browser back')await visit(page,'/tickets');
  await visit(page);await page.getByRole('button',{name,exact:true}).click();await page.locator('[data-panel-viewer]').waitFor();await page.waitForURL(u=>u.searchParams.has('panel'));
  if(width===390&&panel==='recap'&&method==='Escape'){
   await page.locator('[data-recap-row]').first().click();await page.waitForTimeout(220);await page.screenshot({path:'output/mobile-round4/scenarios/recap-expanded-390.png',scale:'css',animations:'disabled'});
   await page.getByRole('searchbox',{name:'Cari nama atau peran staf',exact:true}).fill('Tahan');await page.screenshot({path:'output/mobile-round4/scenarios/recap-search-390.png',scale:'css',animations:'disabled'});
  }
  if(method==='Escape')await page.keyboard.press('Escape');else if(method==='browser back')await page.goBack();else await page.getByRole('button',{name:method==='back button'?'Kembali ke Dashboard':'Tutup Tampilan Penuh',exact:true}).click();
  await page.locator('[data-panel-viewer]').waitFor({state:'detached'});
  if(method==='browser back'){await page.locator('.page-content h1').waitFor();await page.waitForFunction(()=>!document.querySelector('.page-content [aria-busy="true"]'));await page.evaluate(()=>document.fonts.ready);}
  await page.waitForTimeout(250);
  const release=await page.evaluate(()=>({html:getComputedStyle(document.documentElement).overflowY,body:getComputedStyle(document.body).overflowY,inert:document.querySelectorAll('[inert]').length,hiddenRoot:document.querySelector('#app-root')?.getAttribute('aria-hidden')}));assert.notEqual(release.html,'hidden');assert.notEqual(release.body,'hidden');assert.equal(release.inert,0);assert.notEqual(release.hiddenRoot,'true');
  const documentRange=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
  await page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'})});await page.mouse.move(width-5,120);await page.mouse.wheel(0,500);await page.waitForTimeout(150);const wheel=await page.evaluate(()=>scrollY);if(documentRange>0)assert.ok(wheel>0, width+" "+panel+" "+method+" wheel");
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.keyboard.press('PageDown');await page.waitForTimeout(300);const keyboard=await page.evaluate(()=>scrollY);if(documentRange>0)assert.ok(keyboard>0);
  let touch=null;if(width===390){await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width-5,y:650}]});for(let y=620;y>=290;y-=30){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width-5,y}]});await page.waitForTimeout(16)}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(180);touch=await page.evaluate(()=>scrollY);assert.ok(touch>0);}
  rows.push({width,panel,method,release,documentRange,wheel,keyboard,touch});writeFileSync('output/mobile-round4/exit-tests.json',JSON.stringify({rows,errors},null,2));console.log('PASS',width,panel,method);
 }
 await ctx.close();
}
await browser.close();
