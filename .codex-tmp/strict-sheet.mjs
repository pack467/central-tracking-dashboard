import {createRequire} from 'node:module';import {homedir} from 'node:os';import {join,resolve} from 'node:path';import {writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
const require=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));const {chromium}=require('playwright');const b=await chromium.launch({headless:true,channel:'chrome'});const c=await b.newContext({viewport:{width:390,height:844}});const p=await c.newPage();p.setDefaultNavigationTimeout(120000);await p.goto('http://localhost:3000/dashboard',{waitUntil:'domcontentloaded'});await p.locator('.compact-velocity-chart-svg').waitFor();await p.waitForTimeout(700);
const setup=await p.evaluate(async()=>{
 const source=await fetch('/app/components/ui/BottomSheet.tsx').then(r=>r.text());
 const reactUrl=source.match(/from\s+["']([^"']*\/react\.js[^"']*)["']/)?.[1];
 const domUrl=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('react-dom_client.js'));
 if(!reactUrl||!domUrl)return {error:'Could not discover the loaded React runtime',reactUrl,domUrl};
 const reactModule=await import(reactUrl),domModule=await import(domUrl),{BottomSheet}=await import('/app/components/ui/BottomSheet.tsx');const React=reactModule.default??reactModule,ReactDOM=domModule.default??domModule;
 const el=document.createElement('div');el.id='strict-sheet-probe';document.body.append(el);const root=ReactDOM.createRoot(el);
 window.__strictSheetRender=open=>root.render(React.createElement(React.StrictMode,null,React.createElement(BottomSheet,{open,title:'StrictMode',dataSheetId:'strict-probe',onClose:()=>window.__strictSheetRender(false)},React.createElement('button',{type:'button',className:'h-10'},'Uji fokus'))));
 window.__strictSheetCleanup=()=>{root.unmount();el.remove();};return {reactUrl,domUrl};
});
const rows=[];
if(!setup.error){for(let i=0;i<20;i++){await p.evaluate(()=>window.__strictSheetRender(true));await p.locator('[data-sheet-id=strict-probe]').waitFor();assert.equal(await p.locator('[data-sheet-id=strict-probe]').count(),1);await p.keyboard.press('Escape');await p.locator('[data-sheet-id=strict-probe]').waitFor({state:'detached'});assert.notEqual(await p.evaluate(()=>getComputedStyle(document.body).overflowY),'hidden');rows.push({cycle:i+1,pass:true});}await p.evaluate(()=>window.__strictSheetCleanup());}
const result={setup,cycles:rows,pass:!setup.error&&rows.length===20};console.log(JSON.stringify(result));writeFileSync(resolve('output/mobile-redesign/strict-mode.json'),JSON.stringify(result,null,2));await b.close();
