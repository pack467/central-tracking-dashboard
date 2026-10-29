import test from 'node:test';
import assert from 'node:assert/strict';
import { masterRepository as repo, masterSourceRecords } from '../app/services/master-data-repository.ts';
import { buildReview, buildLegacyReferences, validateMappingDecision } from '../app/lib/master-review.ts';
import { buildBackup } from '../app/lib/master-backup.ts';
import { MASTER_STORAGE_KEY, MASTER_RECOVERY_KEY } from '../app/lib/master-data-model.ts';
import { canMappingDecide, canBackupManage, MASTER_PERMISSION_CATALOG } from '../app/lib/permissions.ts';

const values = new Map();
let failKey = null;
const storage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => { if (key === failKey) throw new Error('quota'); values.set(key, value); },
  removeItem: key => values.delete(key),
};
const browser = new EventTarget();
Object.assign(browser, { localStorage: storage, location: { search: '?mock=instant' }, __TEST_CLOCK__: '2026-10-27T01:00:00.000Z' });
globalThis.window = browser;
globalThis.localStorage = storage;
function reset(role = 'manager') {
  values.clear(); failKey = null; repo.reset(); delete process.env.NEXT_PUBLIC_MOCK_ROLE; repo.setActor({ id: 'tester', name: 'Penguji', role });
}
const clone = value => structuredClone(value);
const json = value => JSON.parse(JSON.stringify(value));

test('review selector counts seed findings and exposes every required type', () => {
  reset(); repo.bootstrap();
  const result = repo.review();
  const count = type => result.findings.filter(finding => finding.type === type).length;
  assert.equal(count('reference_unmapped'), 12);
  assert.equal(count('pic_legacy'), 55);
  assert.equal(count('system_coverage'), 47);
  assert.equal(count('reference_ambiguous'), 0);
  assert.equal(result.references.filter(reference => reference.status === 'unmapped').reduce((sum, reference) => sum + reference.count, 0), 26);
  const catalog = clone(repo.snapshot());
  catalog.organizations[0].picContact = undefined; catalog.organizations[0].picUserId = undefined;
  catalog.projects[0].leadUserId = undefined; catalog.projects[0].legacy = { ...catalog.projects[0].legacy, leadEngineer: undefined };
  catalog.projects.push({ ...catalog.projects[0], id: 'dupe-sm', code: 'SM-DUPE', name: 'SM duplikat', legacyKey: 'SM' });
  catalog.organizations[1].status = 'archived';
  catalog.systems[0].projectId = 'missing-project';
  const catalogResult = buildReview(catalog, masterSourceRecords(catalog), []);
  assert.ok(catalogResult.findings.some(finding => finding.type === 'pic_missing'));
  assert.ok(catalogResult.findings.some(finding => finding.type === 'reference_ambiguous' && finding.recordName === 'SM'));
  assert.ok(catalogResult.findings.some(finding => finding.type === 'parent_inactive'));
  assert.ok(catalogResult.findings.some(finding => finding.type === 'invalid_relation'));
  assert.ok(catalogResult.findings.every(finding => finding.id && finding.summary && typeof finding.referenceCount === 'number'));
});

test('mapping decisions require permissions, notes and valid targets, and version increments', () => {
  reset('lead'); process.env.NEXT_PUBLIC_MOCK_ROLE = 'lead';
  repo.bootstrap();
  const ref = repo.review().references.find(reference => reference.rawValue === 'APH' && reference.sourceType === 'ticket');
  assert.ok(ref);
  assert.equal(canMappingDecide('lead'), false); assert.equal(canBackupManage('lead'), false);
  assert.ok(MASTER_PERMISSION_CATALOG.includes('master.review.read'));
  assert.throws(() => repo.decideMapping(ref.id, { action: 'link', projectId: 'proj-tritronik-sm' }), error => error.status === 403);
  process.env.NEXT_PUBLIC_MOCK_ROLE = 'manager';
  const preview = repo.mappingPreview(ref.id, { action: 'link', projectId: 'proj-tritronik-sm' });
  assert.ok(preview.affected.length > 0); assert.ok(preview.after.project.tickets > preview.before.project.tickets);
  assert.throws(() => repo.decideMapping(ref.id, { action: 'link', projectId: 'proj-bni-bni-mobile' }), error => error.status === 422);
  const first = repo.decideMapping(ref.id, { action: 'link', projectId: 'proj-tritronik-sm' });
  assert.equal(first.version, 1); assert.equal(repo.review().references.find(item => item.id === ref.id).status, 'mapped');
  assert.ok(repo.listMappingAudit(ref.id).length > 0);
  process.env.NEXT_PUBLIC_MOCK_ROLE = 'manager';
  const second = repo.decideMapping(ref.id, { action: 'keepLabel', note: 'Label operasional NOC.' });
  assert.equal(second.version, 2); assert.equal(repo.review().references.find(item => item.id === ref.id).status, 'label');
  delete process.env.NEXT_PUBLIC_MOCK_ROLE;
});

test('system mapping is per record, requires a note and stays inside the project', () => {
  reset(); repo.bootstrap();
  const ref = repo.review().references.find(reference => reference.rawValue === 'APH' && reference.sourceType === 'ticket');
  const project = repo.snapshot().projects.find(item => item.id === 'proj-tritronik-sm');
  const system = repo.snapshot().systems.find(item => item.projectId === project.id);
  assert.throws(() => repo.decideMapping(ref.id, { action: 'link', projectId: project.id, note: 'x', systemMappings: [{ recordRef: ref.examples[0].recordRef, systemId: system.id, note: '' }] }), error => error.status === 422);
  assert.throws(() => repo.decideMapping(ref.id, { action: 'link', projectId: project.id, systemMappings: [{ recordRef: ref.examples[0].recordRef, systemId: system.id, note: 'ok' }] }), error => error.status === 422);
  const decision = repo.decideMapping(ref.id, { action: 'link', projectId: project.id, note: 'Sistem eksplisit untuk record terpilih.', systemMappings: [{ recordRef: ref.examples[0].recordRef, systemId: system.id, note: 'Record ini milik sistem tersebut.' }] });
  assert.equal(decision.systemMappings.length, 1);
  const impact = repo.impact('system', system.id);
  assert.ok(impact.tickets >= 1);
});

test('unknown source organization only allows label or defer', () => {
  reset(); repo.bootstrap();
  const catalog = clone(repo.snapshot()), records = masterSourceRecords(catalog);
  records.push({ recordRef: 'ticket:unknown-1', sourceType: 'ticket', rawValue: 'TANPA-ORG', label: 'Tanpa organisasi', active: true });
  const review = buildReview(catalog, records, []);
  const reference = review.references.find(item => item.rawValue === 'TANPA-ORG');
  assert.equal(reference.organizationId, undefined);
  assert.equal(validateMappingDecision(catalog, reference, { action: 'link', projectId: 'proj-tritronik-sm' }, records).code, 'INVALID_PARENT');
  assert.equal(validateMappingDecision(catalog, reference, { action: 'keepLabel', note: 'Label operasional.' }, records), null);
  assert.equal(validateMappingDecision(catalog, reference, { action: 'defer' }, records), null);
});

test('impact never claims zero usage when coverage is incomplete', () => {
  reset(); repo.bootstrap();
  const system = repo.snapshot().systems[0];
  const impact = repo.impact('system', system.id);
  assert.equal(impact.coverageComplete, false);
  assert.equal(impact.tickets, 0);
  assert.ok(impact.unclearReferences > 0);
});

test('backup round-trip restores master collections and mapping decisions', () => {
  reset(); repo.bootstrap();
  const ref = repo.review().references.find(reference => reference.rawValue === 'APH');
  repo.decideMapping(ref.id, { action: 'keepLabel', note: 'Label operasional.' });
  const before = repo.snapshot(), backup = buildBackup(before, buildLegacyReferences(before, masterSourceRecords(before)), '2026-10-27T02:00:00.000Z'), text = JSON.stringify(backup);
  assert.equal(backup.schemaVersion, 3);
  assert.ok(!text.includes('accessToken')); assert.ok(!text.includes('password'));
  assert.deepEqual(Object.keys(backup.data).filter(key => key !== 'audit' && key !== 'lastSavedAt' && key !== 'revision').sort(), ['aliases', 'categories', 'legacyReferences', 'mappingDecisions', 'organizations', 'projects', 'schemaRevision', 'severities', 'systems', 'version'].sort());
  repo.reset(); repo.bootstrap();
  const preview = repo.previewRestore(text, 'backup.json');
  assert.equal(preview.counts.mappingDecisions, 1);
  repo.restoreBackup(text, 'backup.json');
  const after = repo.snapshot();
  assert.deepEqual(after.organizations, json(before.organizations));
  assert.deepEqual(after.projects, json(before.projects));
  assert.deepEqual(after.systems, json(before.systems));
  assert.deepEqual(after.categories, json(before.categories));
  assert.deepEqual(after.severities, json(before.severities));
  assert.deepEqual(after.mappingDecisions, json(before.mappingDecisions));
  assert.ok(after.audit.some(entry => entry.entityType === 'backup'));
  assert.ok(values.get(MASTER_RECOVERY_KEY));
});

test('old v2 backup is accepted with empty mapping decisions', () => {
  reset(); repo.bootstrap();
  const legacy = clone(repo.snapshot());
  delete legacy.schemaRevision; delete legacy.legacyReferences; delete legacy.mappingDecisions;
  const text = JSON.stringify(legacy);
  const preview = repo.previewRestore(text, 'v2.json');
  assert.equal(preview.backupVersion, 'v2'); assert.equal(preview.counts.mappingDecisions, 0);
  repo.restoreBackup(text, 'v2.json');
  assert.equal(repo.snapshot().mappingDecisions.length, 0);
});

test('invalid backups are rejected without changing current data', () => {
  reset(); repo.bootstrap();
  const before = JSON.stringify(repo.snapshot()), current = repo.snapshot();
  const valid = buildBackup(current, buildLegacyReferences(current, masterSourceRecords(current)), '2026-10-27T02:00:00.000Z');
  const cases = [
    ['not-json', 'bukan json'],
    ['unknown version', JSON.stringify({ ...valid, schemaVersion: 99 })],
    ['orphan project', JSON.stringify({ ...valid, data: { ...valid.data, projects: valid.data.projects.map((project, index) => index ? project : { ...project, organizationId: 'missing' }) } })],
    ['duplicate code', JSON.stringify({ ...valid, data: { ...valid.data, projects: valid.data.projects.map((project, index) => index ? project : { ...project, code: valid.data.projects[1].code }) } })],
    ['bad enum', JSON.stringify({ ...valid, data: { ...valid.data, systems: valid.data.systems.map((system, index) => index ? system : { ...system, status: 'Mars' }) } })],
    ['unsafe key', '{"schemaVersion":3,"data":{"version":2,"organizations":[],"__proto__":{"polluted":true}}}'],
  ];
  for (const [label, text] of cases) {
    assert.throws(() => repo.restoreBackup(text, 'bad.json'), error => [422, 500].includes(error.status), label);
    assert.equal(JSON.stringify(repo.snapshot()), before, label);
  }
  assert.equal(JSON.stringify(repo.snapshot()), before);
  assert.throws(() => repo.previewRestore(' '.repeat(5 * 1024 * 1024 + 1), 'huge.json'), error => error.status === 422);
});

test('write failure keeps current data and recovery copy', () => {
  reset(); repo.bootstrap();
  const current = repo.snapshot(), backup = buildBackup(current, buildLegacyReferences(current, masterSourceRecords(current)), '2026-10-27T02:00:00.000Z'), text = JSON.stringify(backup), before = JSON.stringify(repo.snapshot());
  failKey = MASTER_STORAGE_KEY;
  assert.throws(() => repo.restoreBackup(text, 'fail.json'), error => error.status === 500);
  assert.equal(JSON.stringify(repo.snapshot()), before);
  assert.ok(values.get(MASTER_RECOVERY_KEY));
  failKey = null;
});

test('PIC can be empty, reorder is atomic and stale parent restore is refused', () => {
  reset(); repo.bootstrap();
  const project = repo.create('project', { organizationId: 'tritronik', name: 'Tanpa PIC', code: 'NOPIC', status: 'active' });
  assert.ok(repo.review().findings.some(finding => finding.type === 'pic_missing' && finding.entityId === project.id));
  const categories = repo.snapshot().categories.sort((a, b) => a.sortOrder - b.sortOrder), revision = repo.snapshot().revision, first = categories[0], second = categories[1];
  repo.reorderCategory(first.id, 1);
  const next = repo.snapshot();
  assert.equal(next.revision, revision + 1);
  assert.equal(next.categories.find(item => item.id === first.id).sortOrder, second.sortOrder);
  assert.equal(next.categories.find(item => item.id === second.id).sortOrder, first.sortOrder);
  repo.setStatus('project', 'proj-tritronik-sm', 'archived'); repo.setStatus('organization', 'tritronik', 'archived');
  assert.throws(() => repo.setStatus('project', 'proj-tritronik-sm', 'active'), error => error.status === 422);
});
