import test from 'node:test';
import assert from 'node:assert/strict';
import { ORG_KINDS, seedCatalog, addItem, editItem, removeItem, moveItem, assign, itemOf, usage, ordered, parseCatalog, OrgCatalogError } from '../app/lib/org-catalog.ts';

const NOW = '2026-10-30T10:00:00.000Z';
const P = ORG_KINDS.position, D = ORG_KINDS.department;

test('the seeds: office positions and departments in order, nobody assigned', () => {
  const state = seedCatalog(P, NOW);
  assert.deepEqual(ordered(state).map(p => p.name), ['Junior Engineer', 'Engineer', 'Senior Engineer', 'Lead Engineer', 'IT Lead', 'IT Manager']);
  assert.ok(state.items.every(p => p.active));
  assert.deepEqual(state.assignments, {});
  const departments = seedCatalog(D, NOW);
  assert.equal(departments.items[0].id, 'dept-network-operations-center');
  assert.equal(departments.items.length, 6);
  assert.notEqual(P.storageKey, D.storageKey);
});

test('adding: a trimmed, unique name; the new one goes last; messages name the kind', () => {
  const { state, item } = addItem(P, seedCatalog(P, NOW), { name: '  Network   Engineer ', description: 'Jaringan' }, NOW);
  assert.equal(item.name, 'Network Engineer');
  assert.equal(item.id, 'pos-network-engineer');
  assert.equal(ordered(state).at(-1).id, item.id);
  assert.throws(() => addItem(P, state, { name: 'network engineer' }, NOW), OrgCatalogError, 'same name, other case');
  assert.throws(() => addItem(P, state, { name: '   ' }, NOW), /Nama jabatan wajib/);
  assert.throws(() => addItem(D, seedCatalog(D, NOW), { name: '' }, NOW), /Nama departemen wajib/);
  assert.throws(() => addItem(P, state, { name: 'x'.repeat(61) }, NOW), /60/);
});

test('editing keeps the id; renaming onto another name is refused', () => {
  const state = seedCatalog(P, NOW);
  const { state: next, item } = editItem(P, state, 'pos-it-lead', { name: 'IT Team Lead', description: 'baru', active: false }, '2026-10-31T00:00:00.000Z');
  assert.equal(item.id, 'pos-it-lead');
  assert.equal(item.name, 'IT Team Lead');
  assert.equal(item.active, false);
  assert.equal(next.items.find(p => p.id === 'pos-it-lead').updatedAt, '2026-10-31T00:00:00.000Z');
  assert.throws(() => editItem(P, state, 'pos-it-lead', { name: 'Engineer' }, NOW), /sudah ada/);
  assert.doesNotThrow(() => editItem(P, state, 'pos-it-lead', { name: 'it lead' }, NOW), 'its own name in another case is fine');
});

test('assigning: one per person, only active ones, and none', () => {
  let state = seedCatalog(P, NOW);
  state = assign(P, state, '7', 'pos-it-lead');
  assert.equal(itemOf(state, '7').name, 'IT Lead');
  state = assign(P, state, '7', 'pos-engineer');
  assert.equal(itemOf(state, '7').name, 'Engineer', 'replaced, not added');
  state = assign(P, state, '8', 'pos-engineer');
  assert.deepEqual(usage(state), { 'pos-engineer': 2 });
  state = assign(P, state, '7', null);
  assert.equal(itemOf(state, '7'), undefined);
  const inactive = editItem(P, state, 'pos-it-manager', { name: 'IT Manager', active: false }, NOW).state;
  assert.throws(() => assign(P, inactive, '9', 'pos-it-manager'), /nonaktif/);
  assert.throws(() => assign(P, state, '9', 'pos-nope'), /tidak ditemukan/);
});

test('deleting: refused while somebody holds it; the order closes up', () => {
  let state = assign(P, seedCatalog(P, NOW), '7', 'pos-engineer');
  assert.throws(() => removeItem(P, state, 'pos-engineer'), /dipakai 1 personel/);
  state = removeItem(P, state, 'pos-junior-engineer');
  assert.deepEqual(ordered(state).map(p => p.order), [0, 1, 2, 3, 4]);
  assert.equal(ordered(state)[0].name, 'Engineer');
});

test('moving up and down, not past the ends', () => {
  let state = seedCatalog(P, NOW);
  state = moveItem(state, 'pos-it-lead', -1);
  assert.deepEqual(ordered(state).map(p => p.name).slice(3, 5), ['IT Lead', 'Lead Engineer']);
  assert.equal(moveItem(state, 'pos-junior-engineer', -1), state, 'the first cannot go up');
  assert.equal(moveItem(state, 'pos-it-manager', 1), state, 'the last cannot go down');
});

test('reading stored data: valid data survives, broken data falls back to the seed, dangling assignments are dropped', () => {
  const stored = assign(P, seedCatalog(P, NOW), '7', 'pos-it-lead');
  stored.assignments['8'] = 'pos-deleted';
  const read = parseCatalog(P, JSON.stringify(stored), NOW);
  assert.deepEqual(read.assignments, { '7': 'pos-it-lead' });
  assert.equal(parseCatalog(P, '{not json', NOW).items.length, 6);
  assert.equal(parseCatalog(P, JSON.stringify({ version: 2 }), NOW).items.length, 6);
  assert.equal(parseCatalog(D, null, NOW).items[0].name, 'Network Operations Center');
});
