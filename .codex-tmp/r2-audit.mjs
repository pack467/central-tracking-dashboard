import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));
export const { chromium } = require('playwright');
export const sizes = [[320,568],[360,740],[375,667],[390,844],[412,915],[430,932],[768,1024],[844,390],[1024,768],[1280,800],[1440,900],[1920,1080]];
export const root = resolve('output/mobile-round2');
export async function open(browser, width=390,height=844) {
 const ctx = await browser.newContext({viewport:{width,height}, deviceScaleFactor:width<=844?3:1, hasTouch:width<=844, isMobile:width<768, timezoneId:'Asia/Jakarta'});
 await ctx.addInitScript(()=>sessionStorage.setItem('ctd_splash_seen','1'));
 const page=await ctx.newPage();
 await page.clock.setFixedTime(new Date('2026-10-26T13:17:00Z'));
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(90000);
 return {ctx,page};
}
export async function visit(page,route='/dashboard') {
 await page.goto('http://localhost:3000'+route,{waitUntil:'domcontentloaded'});
 await page.locator('.page-content h1').first().waitFor();
 if(route!=='/dashboard') await page.waitForTimeout(1600);
 await page.waitForFunction(()=>!document.querySelector('.page-content [aria-busy="true"]'),{},{timeout:30000});
 if(route==='/dashboard') await page.locator('.compact-shift-traffic-chart-svg').waitFor();
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(800);
}
export async function measure(page) { return page.evaluate(()=>{
 const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&e.checkVisibility()&&!e.closest('[aria-hidden="true"]');};
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,w:r.width,h:r.height};};
 const name=e=>({tag:e.tagName,cls:e.getAttribute('class')?.slice(0,240),text:e.textContent?.trim().slice(0,120)});
 const all=[...document.querySelectorAll('.page-content *, .topbar *, nav[aria-label="Navigasi bawah mobile"] *')].filter(visible);
 const panelEls=[...document.querySelectorAll('.compact-ticket-report-container article')].filter(visible);
 const fab=document.querySelector('.fab-new-ticket');
 return {
  height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,clientWidth:innerWidth,
  grids:[...document.querySelectorAll('.ops-focus-grid,.report-primary-chart-grid,.ops-right-column')].map(e=>({...name(e),...rect(e),columns:getComputedStyle(e).gridTemplateColumns,gap:getComputedStyle(e).gap})),
  panels:panelEls.map(e=>({title:e.querySelector('.panel-title')?.textContent.trim(),...rect(e),body:e.querySelector('.report-panel-body')?rect(e.querySelector('.report-panel-body')):null})),
  sections:[...document.querySelector('.compact-ticket-report-container')?.children??[]].filter(visible).map(e=>({...name(e),...rect(e)})),
  smallText:all.filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<11).map(e=>({...name(e),font:getComputedStyle(e).fontSize,...rect(e)})),
  smallTargets:all.filter(e=>e.matches('button,a,input,select,[role="button"]')&&(e.getBoundingClientRect().width<40||e.getBoundingClientRect().height<40)).map(e=>({...name(e),...rect(e)})),
  ellipsis:all.filter(e=>(getComputedStyle(e).textOverflow==='ellipsis'||getComputedStyle(e).webkitLineClamp!=='none')&&(e.scrollWidth>e.clientWidth||e.scrollHeight>e.clientHeight)).map(e=>({...name(e),title:e.getAttribute('title'),...rect(e)})),
  scrollers:all.filter(e=>e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflowX==='auto').map(e=>({...name(e),...rect(e),scrollWidth:e.scrollWidth,scrollLeft:e.scrollLeft,scrollbar:getComputedStyle(e).scrollbarWidth})),
  charts:[...document.querySelectorAll('.compact-ticket-report-container svg[viewBox]')].filter(visible).map(e=>({...name(e),...rect(e),viewBox:e.getAttribute('viewBox'),minFont:Math.min(...[...e.querySelectorAll('text')].map(t=>parseFloat(getComputedStyle(t).fontSize)))})),
  fab:fab?rect(fab):null,
  nav:[...document.querySelectorAll('nav[aria-label="Navigasi bawah mobile"] a,nav[aria-label="Navigasi bawah mobile"] button')].filter(visible).map(e=>({...name(e),...rect(e)})),
 };
 });}
if (process.argv[1]===import.meta.filename) {
 const phase=process.argv[2]??'before',out=join(root,phase);mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'chrome'});const rows=[],errors=[];
 for(const [width,height] of sizes.filter(([w])=>!process.env.R2_WIDTHS||process.env.R2_WIDTHS.split(',').includes(String(w)))) {
  const {ctx,page}=await open(browser,width,height);
  page.on('pageerror',e=>errors.push({width,message:e.message}));
  page.on('console',m=>{if(m.type()==='error')errors.push({width,message:m.text()});});
  for(const route of ['/dashboard',...(width===390&&!process.env.R2_DASHBOARD_ONLY?['/tickets','/monitoring','/shift-log','/reports','/team-roster','/master-data','/runbooks']:[])]){
   await visit(page,route);const data=await measure(page);rows.push({width,height,route,...data});
   await page.screenshot({path:join(out,`${route.slice(1)}-${width}.png`),fullPage:true,scale:'css',animations:'disabled'});
   console.log(phase,width,route,JSON.stringify({height:data.height,width:data.width,smallText:data.smallText.length,smallTargets:data.smallTargets.length,columns:data.grids[0]?.columns}));
  }await ctx.close();
 }writeFileSync(join(out,'audit.json'),JSON.stringify({rows,errors},null,2));await browser.close();
}
