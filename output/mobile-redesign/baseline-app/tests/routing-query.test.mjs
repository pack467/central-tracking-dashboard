import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery, serializeQuery, ticketsSchema, reportsSchema, rosterSchema, validWeek, isoWeek, weekStart, search } from '../app/lib/query-state.ts';
import { safeNext, routes } from '../app/lib/routes.ts';
import { canonicalRoute } from '../app/lib/canonical-route.ts';
test('defaults, unknown keys and invalid enums have one idempotent canonical representation',()=>{
  const schema=ticketsSchema(['SM/ActiveMQ','APH']);
  for(const raw of ['status=ngawur&size=nan&other=1','page=-1&status=all','page=2&size=30&project=sm-activemq']){
    const parsed=parseQuery(schema,new URLSearchParams(raw));
    const canonical=serializeQuery(schema,parsed);
    assert.equal(serializeQuery(schema,parseQuery(schema,new URLSearchParams(canonical))),canonical);
  }
  assert.equal(serializeQuery(schema,parseQuery(schema,new URLSearchParams('status=all&page=1&size=10'))),'');
  assert.equal(parseQuery(schema,new URLSearchParams('project=sm-activemq')).project,'SM/ActiveMQ');
});
test('report date formats and reversed ranges are validated',()=>{
  const s=reportsSchema('2026-09-05','2026-09-11',['APH']);
  assert.deepEqual(parseQuery(s,new URLSearchParams('from=abc&to=2026-02-30')).from,'2026-09-05');
  const q=parseQuery(s,new URLSearchParams('from=2026-09-11&to=2026-09-05'));
  assert.equal(q.from,'2026-09-05'); assert.equal(q.to,'2026-09-11');
});
test('ISO week roundtrip and calendar validation',()=>{
  assert.equal(validWeek('2026-W34'),true); assert.equal(validWeek('2025-W53'),false);
  assert.equal(isoWeek(weekStart('2026-W34')),'2026-W34');
  assert.equal(weekStart('2026-W34').toISOString().slice(0,10),'2026-08-17');
  assert.equal(serializeQuery(rosterSchema,parseQuery(rosterSchema,new URLSearchParams('view=weekly&week=2026-W34'))),'view=weekly&week=2026-W34');
});
test('personal searches and unsafe redirects never become operational URLs',()=>{
  for(const s of ['galih@example.com','Mhd Galih Khairi','password123','catatan pribadi'])assert.equal(search.parse(s),'');
  assert.equal(search.parse('APH'),'APH');
  for(const s of ['//evil.com','https://evil.com','javascript:alert(1)','/\\evil.com','/%2f%2fevil.com','/login','/%5cevil.com'])assert.equal(safeNext(s),'/dashboard');
  assert.equal(safeNext('/reports/ticket-log?project=aph'),'/reports/ticket-log?project=aph');
  assert.equal(routes.ticket('ABC/123'),'/tickets/abc%2F123');
});
test('combined alias, casing and slash canonicalization takes one redirect',()=>{
  for(const [from,to,status] of [['/','/dashboard',307],['/Monitor/','/monitoring',308],['/REPORTS/OVERVIEW/','/reports',308],['/?tab=profile','/profile',307]]){
    const result=canonicalRoute(new URL(from,'https://internal.test'));
    assert.equal(result.url.pathname,to);assert.equal(result.status,status);assert.equal(canonicalRoute(result.url),null);
  }
  assert.equal(canonicalRoute(new URL('/reports/template.pdf','https://internal.test')),null);
});
