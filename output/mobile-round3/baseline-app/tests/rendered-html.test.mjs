import assert from 'node:assert/strict';
import test from 'node:test';
const {default:worker} = await import('../dist/server/index.js');
const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}};
const ctx={waitUntil(){},passThroughOnException(){}};
const render=path=>worker.fetch(new Request('http://localhost'+path,{headers:{accept:'text/html'}}),env,ctx);
test('production root and casing/alias/slash redirect in one response',async()=>{
  for(const [from,to,status] of [['/','/dashboard',307],['/MONITORING/','/monitoring',308],['/reports/overview/','/reports',308]]){
    const response=await render(from);assert.equal(response.status,status);assert.equal(new URL(response.headers.get('location')).pathname,to);
    assert.equal((await render(to)).status,200);
  }
});
test('production pages render the shared shell, route metadata and robots policy',async()=>{
  for(const [path,title] of [['/dashboard','Dashboard'],['/reports/ticket-log','Ticket log'],['/monitoring/history','History'],['/tickets/inc-001','Detail tiket']]){
    const response=await render(path);assert.equal(response.status,200);
    const html=await response.text();assert.match(html,/data-shell="persistent"/);assert.ok(html.includes(title));assert.match(html,/noindex[^<]*nofollow/);
  }
});
test('production unknown path returns the designed 404',async()=>{
  const response=await render('/does-not-exist');assert.equal(response.status,404);assert.match(await response.text(),/404|tidak ditemukan/i);
});
