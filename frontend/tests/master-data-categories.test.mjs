import test from 'node:test';
import assert from 'node:assert/strict';
import { masterRepository as repo } from '../app/services/master-data-repository.ts';
import { CATEGORY_PALETTE, NEUTRAL_CATEGORY_COLOR, baselineColorFor, nextFreeColor, resolveCategoryColor } from '../app/lib/category-colors.ts';
import { categoryKey } from '../app/lib/master-data-model.ts';

const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => values.delete(key) };
const browser = new EventTarget();
Object.assign(browser, { localStorage: storage, location: { search: '?mock=instant' }, __TEST_CLOCK__: '2026-10-28T03:00:00.000Z' });
globalThis.window = browser;
globalThis.localStorage = storage;
function reset() { values.clear(); repo.reset(); delete process.env.NEXT_PUBLIC_MOCK_ROLE; repo.setActor({ id: 'tester', name: 'Penguji', role: 'manager' }); repo.bootstrap(); }
const stored = () => JSON.parse(values.get('ctd.masterData.v2'));

test('every seed category gets the colour it is drawn with today', () => {
  reset();
  const snapshot = repo.snapshot();
  assert.deepEqual(snapshot.categories.map(category => category.color), ['sky', 'emerald', 'purple', 'amber', 'cyan', 'rose', 'lime']);
  assert.deepEqual(snapshot.categories.map(category => resolveCategoryColor(category.key, snapshot.categories).hex), ['#38bdf8', '#10b981', '#a855f7', '#f59e0b', '#06b6d4', '#f43f5e', '#84cc16']);
  assert.equal(baselineColorFor(7), 'slate');
});

test('data stored before colours existed is migrated without changing what is shown', () => {
  reset();
  const old = stored();
  old.schemaRevision = 4;
  for (const category of old.categories) delete category.color;
  repo.reset(); values.clear(); repo.setActor({ id: 'tester', name: 'Penguji', role: 'manager' });
  values.set('ctd.masterData.v2', JSON.stringify(old));
  const migrated = repo.bootstrap();
  assert.deepEqual(migrated.categories.map(category => category.color), ['sky', 'emerald', 'purple', 'amber', 'cyan', 'rose', 'lime']);
  assert.equal(stored().schemaRevision, 6);
});

test('the resolver finds a category by id, key or name and falls back to neutral grey', () => {
  reset();
  const { categories } = repo.snapshot();
  const sky = resolveCategoryColor('category-1', categories), byKey = resolveCategoryColor('Maintenance', categories), byName = resolveCategoryColor('  maintenance ', categories);
  assert.equal(sky.key, 'sky'); assert.equal(byKey.key, 'sky'); assert.equal(byName.key, 'sky');
  for (const unknown of ['Tidak Ada', '', undefined, null]) assert.equal(resolveCategoryColor(unknown, categories), NEUTRAL_CATEGORY_COLOR);
});

test('a new category gets a fixed readable key, an unused colour and goes last; the key survives a rename', () => {
  reset();
  const created = repo.create('category', { name: 'Gangguan Jaringan', description: '', active: true });
  assert.equal(created.key, 'GANGGUAN-JARINGAN');
  assert.equal(created.sortOrder, 7);
  assert.ok(!['sky', 'emerald', 'purple', 'amber', 'cyan', 'rose', 'lime'].includes(created.color), 'unused colour first');
  const renamed = repo.update('category', created.id, { name: 'Gangguan Jaringan Utama' });
  assert.equal(renamed.key, 'GANGGUAN-JARINGAN');
  assert.equal(renamed.name, 'Gangguan Jaringan Utama');
  const second = repo.create('category', { name: 'gangguan jaringan!', description: '', active: true, color: 'red' });
  assert.equal(second.key, 'GANGGUAN-JARINGAN-2');
  assert.equal(second.color, 'red');
  assert.equal(categoryKey('Maintenance', ['MAINTENANCE']), 'MAINTENANCE-2');
});

test('category names are unique ignoring case, limited to 40 characters, and the colour must be in the palette', () => {
  reset();
  assert.throws(() => repo.create('category', { name: 'incident', description: '', active: true }), error => error.status === 409);
  assert.throws(() => repo.create('category', { name: 'x'.repeat(41), description: '', active: true }), error => error.status === 422);
  assert.throws(() => repo.create('category', { name: 'Warna Aneh', description: '', active: true, color: 'hotpink' }), error => error.status === 422);
  assert.equal(nextFreeColor([{ color: 'sky' }]), 'blue');
  assert.equal(CATEGORY_PALETTE.length, 12);
});

test('renaming or changing the colour of a category is one audit entry with readable fields', () => {
  reset();
  const before = repo.snapshot().audit.length;
  repo.update('category', 'category-1', { color: 'red' });
  const snapshot = repo.snapshot();
  assert.equal(snapshot.categories[0].color, 'red');
  assert.equal(snapshot.audit.length, before + 1);
  assert.deepEqual(snapshot.audit[0].changes.map(change => change.field), ['color']);
});

test('"Atur urutan" writes every active category in one operation and leaves inactive ones in place', () => {
  reset();
  repo.setStatus('category', 'category-3', 'inactive');
  const active = repo.snapshot().categories.filter(category => category.active).map(category => category.id);
  const reversed = [...active].reverse();
  const writes = [];
  const original = storage.setItem;
  storage.setItem = (key, value) => { writes.push(key); original(key, value); };
  repo.reorderCategories(reversed);
  storage.setItem = original;
  assert.equal(writes.filter(key => key === 'ctd.masterData.v2').length, 1, 'one storage write');
  const after = repo.snapshot().categories;
  assert.equal(after.find(category => category.id === 'category-3').sortOrder, 2, 'inactive category keeps its place');
  assert.deepEqual([...after].sort((a, b) => a.sortOrder - b.sortOrder).filter(category => category.active).map(category => category.id), reversed);
  assert.deepEqual([...after.map(category => category.sortOrder)].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
});

test('a bad order is refused and nothing changes', () => {
  reset();
  const before = values.get('ctd.masterData.v2');
  assert.throws(() => repo.reorderCategories(['category-1', 'category-2']), error => error.status === 422);
  assert.throws(() => repo.reorderCategories(['category-1', 'category-1', 'category-2', 'category-3', 'category-4', 'category-5', 'category-6']), error => error.status === 422);
  assert.equal(values.get('ctd.masterData.v2'), before);
});

test('systems no longer store Environment or Criticality, and old stored values stay untouched', () => {
  reset();
  const system = repo.snapshot().systems[0];
  const raw = stored();
  raw.systems[0].environment = 'DRC'; raw.systems[0].criticality = 'critical';
  repo.reset(); values.clear(); repo.setActor({ id: 'tester', name: 'Penguji', role: 'manager' });
  values.set('ctd.masterData.v2', JSON.stringify(raw));
  const loaded = repo.bootstrap();
  assert.equal(loaded.systems[0].environment, 'DRC');
  assert.equal(loaded.systems[0].criticality, 'critical');
  repo.update('system', system.id, { name: `${system.name} baru`, environment: 'Staging', criticality: 'low' });
  const after = stored().systems[0];
  assert.equal(after.name, `${system.name} baru`);
  assert.equal(after.environment, 'DRC', 'a write never changes the deprecated value');
  assert.equal(after.criticality, 'critical');
  const created = repo.create('system', { projectId: system.projectId, name: 'Sistem Tanpa Env', code: 'STE', status: 'active', environment: 'Staging', criticality: 'low' });
  const saved = stored().systems.find(item => item.id === created.id);
  assert.equal(saved.environment, undefined);
  assert.equal(saved.criticality, undefined);
});

test('a backup made before colours existed restores with the colours shown today', async () => {
  const { buildBackup } = await import('../app/lib/master-backup.ts');
  const { buildLegacyReferences } = await import('../app/lib/master-review.ts');
  const { masterSourceRecords } = await import('../app/services/master-data-repository.ts');
  reset();
  const current = repo.snapshot();
  const backup = buildBackup(current, buildLegacyReferences(current, masterSourceRecords(current)), '2026-10-27T02:00:00.000Z');
  assert.deepEqual(backup.data.categories.map(category => category.color), ['sky', 'emerald', 'purple', 'amber', 'cyan', 'rose', 'lime'], 'new backups carry the colour');
  for (const category of backup.data.categories) delete category.color;
  repo.restoreBackup(JSON.stringify(backup), 'lama.json');
  assert.deepEqual(repo.snapshot().categories.map(category => category.color), ['sky', 'emerald', 'purple', 'amber', 'cyan', 'rose', 'lime']);
});

test('severities get the default guidance once: seed, old storage, and a cleared description stays cleared', () => {
  reset();
  const seeded = repo.snapshot().severities;
  assert.deepEqual(seeded.map(severity => severity.description), ['Layanan utama mati total', 'Fungsi penting terganggu', 'Sebagian fungsi terganggu, ada solusi sementara', 'Dampak kecil, tidak mendesak']);
  // storage saved before the descriptions existed: filled on the first read, revision 6
  const old = stored();
  old.schemaRevision = 5;
  for (const severity of old.severities) delete severity.description;
  repo.reset(); values.clear(); repo.setActor({ id: 'tester', name: 'Penguji', role: 'manager' });
  values.set('ctd.masterData.v2', JSON.stringify(old));
  assert.equal(repo.bootstrap().severities[0].description, 'Layanan utama mati total');
  assert.equal(stored().schemaRevision, 6);
  // a description the user wrote is never replaced, and clearing one is not undone by a later read
  repo.update('severity', 'critical', { displayName: 'Critical (Kritis)', description: 'Tulisan sendiri' });
  assert.equal(repo.snapshot().severities[0].description, 'Tulisan sendiri');
  repo.update('severity', 'high', { displayName: 'High (Tinggi)', description: '' });
  const cleared = stored();
  repo.reset(); values.clear(); repo.setActor({ id: 'tester', name: 'Penguji', role: 'manager' });
  values.set('ctd.masterData.v2', JSON.stringify(cleared));
  const after = repo.bootstrap().severities;
  assert.equal(after[0].description, 'Tulisan sendiri');
  assert.ok(!after[1].description, 'cleared stays cleared');
});
