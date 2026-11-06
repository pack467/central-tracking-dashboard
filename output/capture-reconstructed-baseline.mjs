import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const require=createRequire('C:/Users/GALIH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const results=[];
mkdirSync('output/routing/reconstructed',{recursive:true});
for(const width of [1280,390]){
  const ctx=await browser.newContext({viewport:{width,height:900},timezoneId:'Asia/Jakarta',storageState:'output/routing/storage-390.json'});
  await ctx.addInitScript(()=>sessionStorage.setItem('ctd_splash_seen','1'));
  await ctx.route('**/api/handovers**',async route=>{const url=new URL(route.request().url());url.port='3000';const response=await ctx.request.fetch(url.href);await route.fulfill({response});});
  const p=await ctx.newPage();p.setDefaultTimeout(20000);p.setDefaultNavigationTimeout(60000);
  await p.clock.setFixedTime(new Date('2026-10-11T03:00:00Z'));
  await p.goto('http://localhost:3002');await p.waitForTimeout(7500);
  await p.evaluate(()=>document.getElementById('__vinext_dev_error_overlay_root')?.remove());
  for(const label of ['Dashboard','Tickets','Monitoring','Shift Log','Reports','Team Roster','Runbooks']){
    if(width===390){await p.getByRole('button',{name:/menu|navigasi mobile/i}).first().click();await p.locator('.mobile-drawer').getByRole('button',{name:new RegExp('^'+label)}).click();}
    else await p.locator('nav').getByRole('button',{name:new RegExp('^'+label)}).first().click();
    await p.locator('.page-content h1').filter({hasText:label}).waitFor();await p.waitForTimeout(1500);
    const heading=await p.locator('.page-content h1').innerText();if(!heading.startsWith(label))throw new Error('Wrong baseline '+label+': '+heading);
    const key=`${width}-${label.replaceAll(' ','-').toLowerCase()}.png`;
    await p.screenshot({path:'output/routing/reconstructed/'+key,fullPage:true,animations:'disabled',style:'#__vinext_dev_error_overlay_root { display:none; }'});
    results.push({width,label,heading});
  }
  await ctx.close();
}
writeFileSync('output/routing/reconstructed-baseline.json',JSON.stringify(results,null,2));
await browser.close();
const {PNG}=require('pngjs');const pixelmatch=(await import(pathToFileURL(require.resolve('pixelmatch')).href)).default;
const comparisons=results.filter(r=>r.width===1280).map(({width,label})=>{
 const key=`${width}-${label.replaceAll(' ','-').toLowerCase()}.png`;
 const a=PNG.sync.read(readFileSync('output/routing/before/'+key)),b=PNG.sync.read(readFileSync('output/routing/reconstructed/'+key));
 return {label,percent:a.width===b.width&&a.height===b.height?100*pixelmatch(a.data,b.data,null,a.width,a.height,{threshold:.1})/(a.width*a.height):100};
});
writeFileSync('output/routing/reconstruction-validation.json',JSON.stringify(comparisons,null,2));console.log(comparisons);
