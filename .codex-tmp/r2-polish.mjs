import {readFileSync,writeFileSync} from 'node:fs';
function edit(p,fn){let s=readFileSync(p,'utf8');const r=(a,b)=>{if(!s.includes(a))throw Error('Missing '+a.slice(0,80));s=s.replaceAll(a,b);};fn(r);writeFileSync(p,s);}
edit('frontend/app/layout.tsx',r=>{
 r('[&_:is(button,a,input,select,textarea,[tabindex]):focus-visible]:outline-2','[&_:is(button,a,input,select,textarea,[tabindex]):focus-visible]:outline-2 [&_:is(button,a,input,select,textarea,[tabindex]):focus-visible]:outline-solid');
 r('max-lg:[&_:is(button,a,[role=button])]:duration-100','max-lg:[&_:is(button,a,[role=button]):not(.fab-new-ticket)]:duration-100');
});
edit('frontend/app/components/tickets/TicketReportView.tsx',r=>{
 r('className="order-last md:hidden min-h-10 px-3','className="order-last md:hidden min-h-11 px-3');
 r('title={shiftMemo} className=', 'title={shiftMemo} className=');
});
edit('.codex-tmp/r2-behavior.mjs',r=>{
 r('try{const detail=await fn();','try{await visit(page); const detail=await fn();');
 r("await page.locator(tip).waitFor();const box=", "await page.locator(tip).waitFor();await page.waitForTimeout(100);const box=");
 r("await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');", "await button.click();await page.waitForFunction(el=>el.getAttribute('aria-pressed')==='true',await button.elementHandle());assert.equal(await button.getAttribute('aria-pressed'),'true');");
 r('scrollTo(0,0)','scrollTo({top:0,behavior:"instant"})');
 r("await page.waitForTimeout(250);assert.equal(await fab.getAttribute('data-scroll-hidden'),'true');", "await page.waitForFunction(()=>document.querySelector('.fab-new-ticket').dataset.scrollHidden==='true');await page.waitForFunction(()=>getComputedStyle(document.querySelector('.fab-new-ticket')).opacity==='0');assert.equal(await fab.getAttribute('data-scroll-hidden'),'true');");
 r("await page.getByRole('button',{name:'Ubah',exact:true}).click();await page.locator('[data-sheet-open]').waitFor();\n+ const input=page.locator('[data-sheet-open] input').first();if(!await input.count())throw Error('Filter input absent');await input.focus();".replace('\n+','\n'),"await page.locator('.ops-shift-panel .panel-view-action-btn').click();await page.locator('[data-memo-open]').waitFor();\n const input=page.locator('[data-memo-open] textarea');await input.focus();");
 r("await button.scrollIntoViewIfNeeded();await button.focus();", "await button.scrollIntoViewIfNeeded();await page.keyboard.press('Tab');await button.focus();");
});
