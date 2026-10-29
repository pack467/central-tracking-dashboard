import test from 'node:test';
import assert from 'node:assert/strict';
import { masterRepository as repo } from '../app/services/master-data-repository.ts';
import { SEED_MASTER_CLIENTS, SEED_MASTER_PROJECTS, SEED_MASTER_SYSTEMS } from '../app/lib/masterDataSeeds.ts';
import { migrateMasterV1, isMasterV2, projectToLegacy, systemToLegacy, resolveMasterProject, CATEGORY_KEYS } from '../app/lib/master-data-model.ts';
import { canMaster } from '../app/lib/permissions.ts';
import { masterDataV2 } from '../app/services/master-data-v2.ts';
import { apiClient } from '../app/lib/api/client.ts';

const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
const browser = new EventTarget();
Object.assign(browser, { localStorage: storage, location: { search: '?mock=instant' }, __TEST_CLOCK__: '2026-10-27T01:00:00.000Z' });
globalThis.window = browser;
globalThis.localStorage = storage;
const v1 = () => structuredClone({ version: 1, clients: SEED_MASTER_CLIENTS, projects: SEED_MASTER_PROJECTS, systems: SEED_MASTER_SYSTEMS, lastSaved: '2026-10-01T00:00:00.000Z' });
function reset() { values.clear(); repo.reset(); delete process.env.NEXT_PUBLIC_MOCK_ROLE; repo.setActor({ id: 'tester', name: 'Penguji', role: 'manager' }); browser.__TEST_CLOCK__ = '2026-10-27T01:00:00.000Z'; }
const orgInput = (code = 'QA') => ({ kind: 'client', name: 'Organisasi uji', code, status: 'active' });
const status = code => error => error.status === code;

test('v1 migration preserves IDs/order, legacy operational keys and condition statuses', () => {
  const old = v1(); old.systems[0].status = 'maintenance'; old.systems[1].status = 'deprecated';
  old.projects[0].name = 'Nama yang pernah diubah';
  const next = migrateMasterV1(old, SEED_MASTER_PROJECTS);
  assert.ok(isMasterV2(next));
  assert.deepEqual(next.organizations.map(o => o.id), old.clients.map(o => o.id));
  assert.ok(next.organizations.every(o => o.kind === 'client'));
  assert.equal(next.projects[0].legacyKey, SEED_MASTER_PROJECTS[0].name);
  assert.equal(projectToLegacy(next.projects[0]).name, SEED_MASTER_PROJECTS[0].name);
  assert.equal(next.systems[0].status, 'active'); assert.equal(next.systems[0].legacyCondition, 'maintenance');
  assert.equal(systemToLegacy(next.systems[0], next.projects).status, 'maintenance');
  assert.equal(next.systems[1].status, 'archived');
  assert.deepEqual(next.categories.map(c => c.key), [...CATEGORY_KEYS]);
});
test('migration persists v2 once, preserves v1 backup and uses actual save clock', () => {
  reset(); const raw = JSON.stringify(v1()); values.set('ctd.masterData.v1', raw);
  const data = repo.bootstrap(); assert.equal(data.organizations.length, 8); assert.equal(data.projects.length, 47);
  assert.equal(values.get('ctd.masterData.v1'), raw); assert.equal(repo.getSync().lastSavedAt, browser.__TEST_CLOCK__);
  browser.__TEST_CLOCK__ = '2026-10-27T02:00:00.000Z'; repo.bootstrap();
  assert.equal(repo.getSync().lastSavedAt, '2026-10-27T01:00:00.000Z');
  const corrupted = structuredClone(data); corrupted.systems[0].projectId = 'missing'; assert.equal(isMasterV2(corrupted), false);
});
test('administrative edits preserve a migrated maintenance condition for legacy readers', () => {
  reset(); const old = v1(); old.systems[0].status = 'maintenance'; values.set('ctd.masterData.v1', JSON.stringify(old));
  const data = repo.bootstrap(), system = data.systems[0]; repo.update('system', system.id, { name: 'Nama sistem baru', status: 'active' });
  assert.equal(repo.get('system', system.id).legacyCondition, 'maintenance');
  assert.equal(repo.legacySystems().find(s => s.id === system.id).status, 'maintenance');
});
test('legacy all-inactive organizations remain recoverable without discarding data', () => {
  reset(); const old = v1(); old.clients.forEach(o => { o.status = 'inactive'; }); old.clients[0].name = 'Legacy organization';
  values.set('ctd.masterData.v1', JSON.stringify(old)); const next = repo.bootstrap();
  assert.ok(isMasterV2(next)); assert.equal(next.organizations[0].name, 'Legacy organization');
  assert.ok(next.organizations.every(o => o.status === 'inactive')); assert.equal(next.projects.length, 47);
  repo.setStatus('organization', next.organizations[0].id, 'active'); assert.equal(repo.get('organization', next.organizations[0].id).status, 'active');
});
test('CRUD, case-insensitive scoped uniqueness, pagination, audit, idempotency and immutable keys', () => {
  reset(); const a = repo.create('organization', orgInput(), undefined, 'create-a');
  assert.equal(repo.create('organization', orgInput(), undefined, 'create-a').id, a.id);
  assert.throws(() => repo.create('organization', orgInput('OTHER'), undefined, 'create-a'), status(409));
  assert.throws(() => repo.create('organization', orgInput('qa')), status(409));
  const p = repo.create('project', { organizationId: a.id, name: 'Proyek awal', code: 'P1', status: 'active' });
  assert.throws(() => repo.update('project', p.id, { relatedClientIds: [a.id] }), status(422));
  const s = repo.create('system', { projectId: p.id, name: 'Sistem baru', code: '', environment: 'Production', criticality: 'high', status: 'active' });
  assert.equal(s.code, 'SISTEM-BARU');
  repo.update('project', p.id, { name: 'Nama baru', code: 'P2' });
  assert.equal(repo.get('project', p.id).legacyKey, 'Proyek awal'); assert.equal(repo.get('system', s.id).projectId, p.id);
  assert.throws(() => repo.create('project', { organizationId: a.id, name: 'Duplikat', code: 'p2', status: 'active' }), status(409));
  assert.throws(() => repo.update('project', p.id, { organizationId: 'tritronik' }), status(422));
  assert.equal(repo.list('system', { projectId: p.id }).meta.total, 1);
  const page = repo.list('project', { page: 2, pageSize: 10 }); assert.equal(page.data.length, 10); assert.equal(page.meta.total, 48);
  const audit = repo.listAudit('project', p.id); assert.equal(audit.data.length, 2); assert.equal(audit.data[0].byUserId, 'tester');
  assert.ok(audit.data[0].changes.some(c => c.field === 'name' && c.from === 'Proyek awal' && c.to === 'Nama baru'));
  const category = repo.create('category', { name: 'Kategori baru', active: true, sortOrder: 7 });
  repo.update('category', category.id, { name: 'Nama kategori baru' });
  assert.equal(repo.get('category', category.id).key, category.key);
  assert.equal('usageCount' in repo.snapshot().categories.find(c => c.id === category.id), false);
});
test('impact uses full stored tickets, archive preserves history and restore checks parents', () => {
  reset(); const all = repo.bootstrap(); const p = all.projects[0];
  values.set('ctd.tickets.v4', JSON.stringify(Array.from({ length: 81 }, (_, i) => ({ id: `T${i}`, project: p.legacyKey, clientId: p.organizationId, severity: 'High', type: 'Incident', status: i ? 'Open' : 'Closed' }))));
  assert.equal(repo.impact('project', p.id).tickets, 81); assert.equal(repo.impact('project', p.id).activeTickets, 80);
  assert.equal(repo.list('category').data.find(c => c.key === 'Incident').usageCount, 81);
  repo.setStatus('project', p.id, 'archived'); repo.setStatus('organization', p.organizationId, 'archived');
  assert.equal(repo.get('project', p.id).status, 'archived');
  assert.throws(() => repo.setStatus('project', p.id, 'active'), status(422));
  repo.setStatus('organization', p.organizationId, 'active'); repo.setStatus('project', p.id, 'active');
  for (const org of all.organizations.slice(1)) repo.setStatus('organization', org.id, 'archived');
  assert.throws(() => repo.setStatus('organization', all.organizations[0].id, 'inactive'), status(422));
});
test('all mock roles enforce adapter permissions and fixed severity capabilities', () => {
  reset();
  for (const role of ['manager', 'lead', 'operator', 'viewer']) {
    process.env.NEXT_PUBLIC_MOCK_ROLE = role;
    assert.equal(repo.list('organization').meta.total, 8);
    assert.equal(canMaster(role, 'organization', 'create'), role === 'manager');
    if (role !== 'manager') {
      assert.throws(() => repo.create('organization', orgInput()), status(403));
      assert.throws(() => repo.update('organization', 'tritronik', { name: 'X' }), status(403));
      assert.throws(() => repo.setStatus('organization', 'tritronik', 'archived'), status(403));
    }
    assert.throws(() => repo.create('severity', { displayName: 'X' }), status(403));
    assert.throws(() => repo.setStatus('severity', 'critical', 'archived'), status(403));
  }
  delete process.env.NEXT_PUBLIC_MOCK_ROLE;
});
test('scoped EPC/SM aliases resolve to immutable IDs and impact survives renaming', () => {
  reset(); const data = repo.bootstrap(), epc = resolveMasterProject(data.projects, 'EPC Tools', 'tritronik'), sm = resolveMasterProject(data.projects, 'SM / ActiveMQ', 'tritronik');
  assert.equal(epc.id, 'proj-tritronik-epc'); assert.equal(sm.id, 'proj-tritronik-sm');
  const before = repo.impact('project', epc.id); assert.ok(before.tickets > 0); assert.ok(before.checkpoints > 0);
  repo.update('project', epc.id, { name: 'Nama EPC baru', code: 'EPC-NEW' });
  const after = repo.impact('project', epc.id); assert.equal(after.tickets, before.tickets); assert.equal(after.checkpoints, before.checkpoints);
  assert.equal(resolveMasterProject(repo.snapshot().projects, 'EPC Tools', 'tritronik').id, epc.id);
  assert.equal(resolveMasterProject(data.projects, 'APH', 'tritronik'), undefined);
});
test('storage event reloads another tab and corrupted v2 recovers without touching v1', () => {
  reset(); repo.bootstrap(); let events = 0; const unsub = repo.subscribe(() => events++);
  const remote = repo.snapshot(); remote.organizations[0].name = 'Nama dari tab lain'; remote.revision++;
  values.set('ctd.masterData.v2', JSON.stringify(remote)); const event = new Event('storage'); Object.assign(event, { key: 'ctd.masterData.v2' }); browser.dispatchEvent(event);
  assert.equal(repo.get('organization', remote.organizations[0].id).name, 'Nama dari tab lain'); assert.ok(events > 0);
  values.set('ctd.masterData.v1', 'backup'); values.set('ctd.masterData.v2', '{broken');
  const warn = console.warn; const warnings = []; console.warn = message => warnings.push(message);
  try { browser.dispatchEvent(event); assert.equal(repo.snapshot().organizations.length, 8); assert.equal(values.get('ctd.masterData.v1'), 'backup'); assert.equal(warnings.length, 1); } finally { console.warn = warn; unsub(); }
});
test('blocked storage retains session mutations and warns once', () => {
  reset(); const warn = console.warn; const warnings = []; console.warn = message => warnings.push(message);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  browser.localStorage = blocked; globalThis.localStorage = blocked;
  const unsubscribe = repo.subscribe(() => { repo.snapshot(); repo.legacyClients(); });
  try {
    repo.bootstrap(); const org = repo.create('organization', orgInput()); repo.update('organization', org.id, { name: 'Sesi baru' });
    assert.equal(repo.get('organization', org.id).name, 'Sesi baru'); assert.equal(repo.getSync().status, 'session'); assert.equal(warnings.length, 1);
  } finally { unsubscribe(); browser.localStorage = storage; globalThis.localStorage = storage; console.warn = warn; }
});
test('API mode loads every page and uses server metadata, without making network requests', async () => {
  reset(); const data = repo.bootstrap(), originalGet = apiClient.get, priorMock = process.env.NEXT_PUBLIC_USE_MOCK, requests = [];
  for (let i = 0; i < 21; i++) data.projects.push({ id: `server-${i}`, organizationId: 'tritronik', code: `API-${i}`, name: `Server project ${i}`, legacyKey: `Server project ${i}`, status: 'active', createdAt: '2026-10-15T00:00:00.000Z', updatedAt: '2026-10-15T00:00:00.000Z' });
  const collections = { organizations: data.organizations, projects: data.projects, systems: data.systems, categories: data.categories, severities: data.severities };
  apiClient.get = async (path, options) => {
    requests.push({ path, page: options?.params?.page || 1 });
    if (path === '/master/meta') return { data: { lastSavedAt: '2026-10-27T04:00:00.000Z', revision: 81 } };
    const rows = collections[path.split('/').at(-1)], page = options?.params?.page || 1;
    return { data: rows.slice((page - 1) * 50, page * 50), meta: { page, pageSize: 50, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / 50)) } };
  };
  process.env.NEXT_PUBLIC_USE_MOCK = 'false';
  try {
    const catalog = await masterDataV2.catalog(); assert.equal(catalog.projects.length, 68);
    assert.ok(requests.some(r => r.path === '/master/projects' && r.page === 2));
    assert.equal(repo.getSync().lastSavedAt, '2026-10-27T04:00:00.000Z');
    assert.ok(catalog.organizations.every(o => o.updatedAt < repo.getSync().lastSavedAt));
  } finally { apiClient.get = originalGet; if (priorMock === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK; else process.env.NEXT_PUBLIC_USE_MOCK = priorMock; reset(); }
});
