import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMasterRoute, masterRouteUrl } from '../app/lib/master-data-route.ts';
test('master URL defaults and invalid values are normalized', () => {
  const route = parseMasterRoute(new URLSearchParams('tab=unknown&kind=xxx&page=-8&size=9&status=xyz'));
  assert.equal(route.entity,'organization'); assert.equal(route.query.page,1); assert.equal(route.query.pageSize,10); assert.equal(route.query.kind,'all'); assert.equal(route.query.status,'all');
  assert.equal(parseMasterRoute(new URLSearchParams('group=tickets')).entity,'category');
});
test('detail URL retains filters and legacy links map to organization IDs', () => {
  const route = parseMasterRoute(new URLSearchParams('tab=systems&client=bni&project=P1&q=Auth&page=2&size=25&detail=S1'));
  assert.equal(route.query.organizationId,'bni');
  const url = masterRouteUrl(route); assert.ok(url.includes('org=bni')); assert.ok(url.includes('project=P1')); assert.ok(url.includes('detail=S1'));
  route.detail=''; const closed=masterRouteUrl(route); assert.ok(closed.includes('q=Auth')); assert.ok(closed.includes('page=2')); assert.equal(closed.includes('detail='),false);
  assert.equal(parseMasterRoute(new URLSearchParams('tab=severities&status=archived')).query.status,'all');
});
