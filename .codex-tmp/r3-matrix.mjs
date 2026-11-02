import {chromium,open,visit,measure} from './r2-audit.mjs';import {mkdirSync,writeFileSync} from 'node:fs';import {resolve,join} from 'node:path';
const root=resolve('output/mobile-round3'),out=join(root,'after');mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:'chrome'}),rows=[],errors=[];
const widths=[320,360,375,390,412,430,768,844,1024,1280,1440,1920];
async function captureStates(page,name,control){
 const folder=join(out,name);mkdirSync(folder,{recursive:true});const notes={};
 await control.scrollIntoViewIfNeeded();await control.focus();await page.screenshot({path:join(folder,'focus.png'),scale:'css',animations:'disabled'});
 await control.click();await page.getByRole('listbox').filter({visible:true}).waitFor();await page.waitForTimeout(250);
 const list=page.getByRole('listbox').filter({visible:true});notes.listbox=await list.evaluate(e=>({role:e.role,rect:e.getBoundingClientRect().toJSON(),heights:[...e.querySelectorAll('[role=option]')].map(o=>o.getBoundingClientRect().height)}));
 await page.screenshot({path:join(folder,'open-selected.png'),scale:'css',animations:'disabled'});
 const options=list.getByRole('option').filter({hasNot:page.locator('[aria-disabled=true]')});const count=await options.count();
 if(count>1){await options.nth(1).hover();await page.screenshot({path:join(folder,'hover.png'),scale:'css',animations:'disabled'});await options.nth(1).click();if(await list.count())await page.keyboard.press('Escape');await page.waitForTimeout(400);await page.screenshot({path:join(folder,'active.png'),scale:'css',animations:'disabled'});await control.click();await page.getByRole('listbox').filter({visible:true}).waitFor();await page.waitForTimeout(180);await page.keyboard.press('ArrowDown');await page.screenshot({path:join(folder,'keyboard.png'),scale:'css',animations:'disabled'});await page.keyboard.press('Escape');}
 else await page.keyboard.press('Escape');
 notes.disabled=await page.locator('[data-select-trigger]:disabled').count();return notes;
}
for(const width of widths.filter(w=>!process.env.R3_WIDTHS||process.env.R3_WIDTHS.split(',').includes(String(w)))){
 const height=width===844?390:width===320?568:width>=1024?900:844;const {ctx,page}=await open(browser,width,height);page.on('pageerror',e=>errors.push({width,error:e.message}));page.on('console',m=>{if(m.type()==='error')errors.push({width,error:m.text()})});
 for(const route of ['/dashboard',...([390,768,1024,1440,1920].includes(width)?['/tickets','/monitoring','/shift-log','/reports','/team-roster','/master-data','/runbooks']:[])]){
  try{await visit(page,route);const data=await measure(page);const controls=await page.locator('[data-select-trigger]').evaluateAll(es=>es.filter(e=>e.checkVisibility()).map(e=>({name:e.getAttribute('aria-label'),id:e.id,rect:e.getBoundingClientRect().toJSON()})));const row={width,height,route,data,controls,native:await page.locator('select,datalist').count()};rows.push(row);await page.screenshot({path:join(out,`${route.slice(1)}-${width}.png`),fullPage:true,scale:'css',animations:'disabled'});
  if([390,768,1024,1440,1920].includes(width)){
   if(route==='/dashboard'&&width===390)await page.getByRole('button',{name:'Ubah',exact:true}).click();
   if(route==='/tickets'&&width<901)await page.getByRole('button',{name:'Toggle filter panel',exact:true}).click();
   let control=route==='/dashboard'?page.getByRole('combobox',{name:'Filter proyek',exact:true}):page.locator('.page-content [data-select-trigger]:visible:not(:disabled)').first();if(!await control.count())control=page.locator('[data-select-trigger]:visible:not(:disabled)').first();
   row.states=await captureStates(page,`${route.slice(1)}-${width}`,control);
  }
  console.log(width,route,JSON.stringify({height:data.height,overflow:data.width-width,native:row.native}));
  }catch(e){console.log('FAIL',width,route,e.message);errors.push({width,route,error:e.message});await page.keyboard.press('Escape').catch(()=>{});}
 }
 if([390,768,1024,1440,1920].includes(width))for(const form of ['client','project','system','ticket']){
  try{await visit(page,form==='ticket'?'/tickets':'/master-data');if(form==='ticket')await page.locator('.fab-new-ticket').click();else if(form==='client')await page.getByRole('button',{name:'Klien Baru',exact:true}).click();else{await page.getByRole('tab',{name:form==='project'?/Proyek & Layanan/:/Sistem/}).click();await page.getByRole('button',{name:form==='project'?'Proyek Baru':'Sistem Baru',exact:true}).click();}
   const dialog=page.getByRole('dialog').filter({visible:true});await dialog.waitFor();await page.waitForTimeout(200);const control=dialog.locator('[data-select-trigger]:visible:not(:disabled)').first();await page.screenshot({path:join(out,`form-${form}-${width}.png`),scale:'css',animations:'disabled'});const states=await captureStates(page,`form-${form}-${width}`,control);rows.push({width,form,states});await page.keyboard.press('Escape');
  }catch(e){console.log('FORM FAIL',width,form,e.message);errors.push({width,form,error:e.message});await page.keyboard.press('Escape').catch(()=>{});}
 }
 await ctx.close();writeFileSync(join(root,(process.env.R3_PHASE??'final')+'-audit.json'),JSON.stringify({rows,errors},null,2));
}
await browser.close();
