import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMasterRoute, masterRouteUrl, sortOptions, defaultSort } from '../app/lib/master-data-route.ts';
import { MASTER_DATA_P0_ENABLED } from '../app/lib/master-data-flags.ts';

const parse = query => parseMasterRoute(new URLSearchParams(query));

test('the cancelled P0 features stay behind one flag, off by default', () => {
  assert.equal(MASTER_DATA_P0_ENABLED, false);
});
test('hidden P0 URL params fall back to the default list', () => {
  const route = parse('group=services&tab=projects&view=review&ref=abc&type=pic_missing&review=1');
  assert.equal(route.view, 'list'); assert.equal(route.referenceId, ''); assert.equal(route.reviewType, 'all'); assert.equal(route.query.review, false);
  const url = masterRouteUrl(route);
  assert.ok(!/view=|ref=|type=|review=/.test(url), url);
});
test('team group routes to people by default and to roles by tab', () => {
  assert.equal(parse('group=team').entity, 'person'); assert.equal(parse('group=team').group, 'team');
  assert.equal(parse('group=team&tab=people').entity, 'person');
  assert.equal(parse('group=team&tab=roles').entity, 'role');
  assert.equal(parse('tab=roles').group, 'team');
  assert.equal(parse('group=tickets').entity, 'category');
  assert.equal(parse('').entity, 'organization');
});
test('people filters: status, role and sort are validated per entity', () => {
  const people = parse('tab=people&status=inactive&role=Shift%20Lead&sort=-updated&q=galih');
  assert.equal(people.query.status, 'inactive'); assert.equal(people.query.roleKey, 'Shift Lead'); assert.equal(people.query.sort, '-updated'); assert.equal(people.query.q, 'galih');
  assert.equal(parse('tab=organizations&role=Shift%20Lead').query.roleKey, 'all');
  assert.equal(parse('tab=roles&status=archived').query.status, 'all');
  assert.equal(parse('tab=people&sort=order').query.sort, undefined);
  assert.equal(parse('tab=people&sort=name').query.sort, undefined);
  assert.equal(parse('tab=roles&sort=name').query.sort, 'name');
  assert.equal(parse('tab=categories&sort=order').query.sort, undefined);
});
test('every list offers A-Z, Z-A and last changed; ordered lists also keep their manual order', () => {
  for (const entity of ['organization', 'project', 'system', 'person']) assert.deepEqual(sortOptions(entity), ['name', '-name', '-updated']);
  for (const entity of ['severity', 'role']) assert.deepEqual(sortOptions(entity), ['order', 'name', '-name', '-updated']);
  assert.deepEqual(sortOptions('category'), ['order', 'name', '-name', '-usage', '-updated']);
  assert.equal(defaultSort('role'), 'order'); assert.equal(defaultSort('person'), 'name');
});
test('team URLs round trip', () => {
  const route = parse('group=team&tab=people&role=Shift%20Lead&status=active&sort=-name&page=2&size=25&detail=mem-1');
  const url = masterRouteUrl(route);
  assert.deepEqual(parse(new URL(url, 'https://x').searchParams), route);
});
