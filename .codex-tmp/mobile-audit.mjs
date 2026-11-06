import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
const require = createRequire(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));
const { chromium } = require('playwright');
const phase = process.argv[2] ?? 'before';
const base = process.env.CTD_BASE_URL ?? 'http://localhost:3000';
const out = resolve('output/mobile-redesign', phase);
mkdirSync(out, {recursive:true});
const browser = await chromium.launch({headless:true, channel:'chrome'});
const sizes = [[320,568],[360,740],[375,667],[390,844],[412,915],[430,932],[768,1024],[844,390],[1024,768],[1280,800],[1440,900],[1920,1080]];
const routes = ['/dashboard','/tickets','/monitoring','/shift-log','/reports','/team-roster','/master-data','/runbooks'];
const errors = [], rows = [];
for (const [width,height] of sizes.filter(([w])=>!process.env.CTD_WIDTHS||process.env.CTD_WIDTHS.split(',').includes(String(w)))) {
  const ctx = await browser.newContext({viewport:{width,height}, deviceScaleFactor:width<=844?3:1, hasTouch:width<=844, isMobile:width<768, timezoneId:'Asia/Jakarta'});
  await ctx.addInitScript(() => {sessionStorage.setItem('ctd_splash_seen','1');});
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(120000);
  page.on('pageerror', e=>errors.push({width,message:e.message}));
  page.on('console', m=>{ if(m.type()==='error') errors.push({width,type:'console',message:m.text().slice(0,1600)}); });
  await page.clock.setFixedTime(new Date('2026-10-23T00:17:00Z'));
  for (const route of routes.filter(r=>(r==='/dashboard'||width===390||width>=1280)&&(!process.env.CTD_DASHBOARD_ONLY||r==='/dashboard')&&(!process.env.CTD_ROUTE_ONLY||r===process.env.CTD_ROUTE_ONLY))) {
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.locator('.page-content h1').first().waitFor({timeout:30000});
    if(route==='/dashboard') await page.locator('.compact-ticket-report-container, .ticket-report-container').waitFor({state:'visible',timeout:30000});
    await page.waitForTimeout(1500);
    await page.waitForFunction(()=>document.querySelectorAll('.page-content [aria-busy="true"]').length===0,{},{timeout:25000}).catch(()=>{});
    if (route==='/dashboard') await page.locator('.ops-today-panel .panel-view-action-btn').count().then(async n=> { if(n) await page.locator('.ops-today-panel .panel-view-action-btn:not([disabled])').waitFor({timeout:25000}); });
    await page.waitForTimeout(700);
    if(process.env.CTD_EXTRA_STABLE_WAIT) await page.waitForTimeout(Number(process.env.CTD_EXTRA_STABLE_WAIT));
    await page.evaluate(()=>document.fonts.ready);
    const data = await page.evaluate(()=>{
      const visible = el => { const r=el.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'&&el.checkVisibility(); };
      const name = el => ({tag:el.tagName,cls:typeof el.className==='string'?el.className.slice(-150):el.getAttribute('class'),text:(el.textContent??'').trim().slice(0,80)});
      const all=[...document.querySelectorAll('.page-content *, .topbar *, .app-topbar *, nav *, .fab-new-ticket, .shift-panel-toggle-tab')].filter(visible);
      return {height:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,
        smallText:all.filter(el=>[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(el).fontSize)<11).map(el=>({...name(el),font:getComputedStyle(el).fontSize})),
        smallTargets:all.filter(el=>el.matches('button,a,input,select,textarea,[role="button"]')&&(el.getBoundingClientRect().width<40||el.getBoundingClientRect().height<40)).map(el=>({...name(el),w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})),
        overflow:all.filter(el=>{const r=el.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5}).map(name),
        panels:[...document.querySelectorAll('.page-content article')].map(el=>({title:el.querySelector('.panel-title')?.textContent??el.textContent?.slice(0,70),height:el.getBoundingClientRect().height})),
        charts:[...document.querySelectorAll('.page-content svg[viewBox]')].map(el=>({cls:el.getAttribute('class'),w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,viewBox:el.getAttribute('viewBox'),fonts:[...new Set([...el.querySelectorAll('text')].map(t=>getComputedStyle(t).fontSize))]})),
        shell:['.app-topbar','.hamburger-button','.fab-new-ticket','.shift-panel-toggle-tab','.sidebar'].map(s=>{const el=document.querySelector(s);return {s,visible:el&&visible(el),rect:el?.getBoundingClientRect().toJSON()}})};
    });
    rows.push({width,height,route,...data});
    await page.screenshot({path:join(out,route.slice(1)+'-'+width+'.png'),fullPage:true,scale:'css',animations:'disabled'});
    console.log(phase,width,route,JSON.stringify({height:data.height,width:data.scrollWidth,smallText:data.smallText.length,smallTargets:data.smallTargets.length}));
  }
  await ctx.close();
}
writeFileSync(join(out,'audit.json'),JSON.stringify({rows,errors},null,2));
await browser.close();
