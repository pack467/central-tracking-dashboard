import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire('C:/Users/GALIH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const browser=await chromium.launch({headless:true,channel:'chrome'});
const result={};
for(const width of [1280,390]){
 const ctx=await browser.newContext({viewport:{width,height:900},timezoneId:'Asia/Jakarta',storageState:'output/routing/storage-390.json'});
 await ctx.addInitScript(()=>sessionStorage.setItem('ctd_splash_seen','1'));
 const p=await ctx.newPage();await p.clock.setFixedTime(new Date('2026-10-11T03:00:00Z'));await p.goto('http://localhost:3001');await p.waitForTimeout(7500);await p.evaluate(()=>document.getElementById('__vinext_dev_error_overlay_root')?.remove());
 result[width]={};
 for(const label of ['Tickets','Monitoring']){
  await p.goto("http://localhost:3001/"+label.toLowerCase());
  await p.locator('.page-content h1').filter({hasText:label}).waitFor();await p.waitForTimeout(1200);
  result[width][label]=await p.evaluate(()=>Object.fromEntries(['.page-content h1','.page-content [role=tablist]','.page-content [role=table]','.page-content [role=table] [role=row]', '.page-content [role=table] [role=row]:nth-child(2)', '.page-content [role=table] strong', '.page-content [role=tab]'].map(selector=>{
   const e=document.querySelector(selector);if(!e)return [selector,null];const s=getComputedStyle(e);const r=e.getBoundingClientRect();return [selector,{tag:e.tagName,rect:{x:r.x,y:r.y,width:r.width,height:r.height},style:Object.fromEntries(['fontFamily','fontSize','lineHeight','fontWeight','display','paddingTop','paddingBottom','borderTopWidth','borderBottomWidth','textAlign','transform'].map(key=>[key,s[key]])),text:e.textContent.slice(0,40)}];
  })));
 }
 await ctx.close();
}
writeFileSync('output/routing/styles-after.json',JSON.stringify(result,null,2));await browser.close();

