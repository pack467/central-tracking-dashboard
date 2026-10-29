import test from 'node:test';
import assert from 'node:assert/strict';
import { masterRepository as repo } from '../app/services/master-data-repository.ts';
import { seedRosterMembers } from '../app/lib/data.ts';
import { formatRosterDate, parseRosterDate, seedPeople } from '../app/lib/master-people.ts';
import { canMaster, MASTER_PERMISSION_CATALOG } from '../app/lib/permissions.ts';

const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
const browser = new EventTarget();
Object.assign(browser, { localStorage: storage, location: { search: '?mock=instant' }, __TEST_CLOCK__: '2026-10-27T01:00:00.000Z' });
globalThis.window = browser;
globalThis.localStorage = storage;
const manager = { id: 'tester', name: 'Penguji', role: 'manager' };
function reset(role = 'manager') { values.clear(); repo.reset(); delete process.env.NEXT_PUBLIC_MOCK_ROLE; process.env.NEXT_PUBLIC_MOCK_ROLE = role; repo.setActor({ ...manager, role }); browser.__TEST_CLOCK__ = '2026-10-27T01:00:00.000Z'; }
const input = (suffix = '1', extra = {}) => ({ fullName: `Orang Uji ${suffix}`, employeeId: `EMP-9${suffix}`, email: `uji${suffix}@company.id`, roleKey: 'Operator NOC', joinDate: '2026-10-01', defaultShift: 'pagi', ...extra });
const code = value => error => error.status === value;
const stored = () => JSON.parse(values.get('ctd.masterData.v2'));

test('roster dates round trip in the exact seed format', () => {
  assert.equal(parseRosterDate('15 Jan 2024'), '2024-01-15');
  assert.equal(parseRosterDate('01 Mar 2023'), '2023-03-01');
  assert.equal(formatRosterDate('2023-03-01'), '01 Mar 2023');
  assert.equal(parseRosterDate('bukan tanggal'), undefined);
  for (const member of seedRosterMembers) assert.equal(formatRosterDate(parseRosterDate(member.joinDate)), member.joinDate);
});

test('seed people reuse roster ids and keep stored extras; seed roles keep their historical keys', () => {
  reset(); const data = repo.bootstrap();
  assert.equal(data.people.length, seedRosterMembers.length);
  assert.deepEqual(data.people.map(person => person.id), seedRosterMembers.map(member => member.id));
  assert.deepEqual(data.roles.map(role => role.key), ['Operator NOC', 'Shift Lead', 'Incident Coordinator', 'L2 Specialist', 'Infrastructure Engineer']);
  assert.ok(data.roles.every(role => role.protected && role.active));
  assert.equal(data.schemaRevision, 6);
  const extra = { ...seedRosterMembers[0], id: 'mem-ekstra', name: 'Anggota Tersimpan', employeeId: 'EMP-7000', email: 'tersimpan@company.id', role: 'Peran Lama' };
  const merged = seedPeople([extra, { ...seedRosterMembers[1], name: 'Nama Disunting' }], seedRosterMembers, '2026-10-15T00:00:00.000Z');
  assert.equal(merged.people.length, seedRosterMembers.length + 1);
  assert.equal(merged.people.find(person => person.id === 'mem-2').fullName, 'Nama Disunting');
  assert.deepEqual(merged.extraRoleKeys, ['Peran Lama']);
});

test('schemaRevision 3 data migrates to the current revision without touching other collections or the roster key', () => {
  reset(); const base = repo.bootstrap(); repo.reset(); values.clear();
  const old = { ...base, schemaRevision: 3 }; delete old.people; delete old.roles; delete old.tombstones;
  old.categories = [...old.categories, { id: 'category-x', key: 'Kustom', name: 'Kustom', active: true, sortOrder: 99 }];
  values.set('ctd.masterData.v2', JSON.stringify(old));
  const roster = JSON.stringify([{ ...seedRosterMembers[2], id: 'mem-baru', name: 'Dari Roster Lama', employeeId: 'EMP-8001', email: 'lama@company.id', role: 'Operator NOC' }]);
  values.set('ctd.roster.members', roster);
  const data = repo.bootstrap();
  assert.equal(data.schemaRevision, 6);
  assert.ok(data.people.some(person => person.id === 'mem-baru' && person.fullName === 'Dari Roster Lama'));
  assert.equal(data.people.length, seedRosterMembers.length + 1);
  const json = value => JSON.parse(JSON.stringify(value));
  assert.deepEqual(json(data.organizations), json(old.organizations)); assert.deepEqual(json(data.projects), json(old.projects)); assert.deepEqual(json(data.systems), json(old.systems));
  assert.ok(data.categories.some(category => category.key === 'Kustom'));
  assert.equal(values.get('ctd.roster.members'), roster);
  assert.equal(stored().schemaRevision, 6);
});

test('corrupted people data falls back to the seed', () => {
  reset(); const data = repo.bootstrap(); repo.reset();
  values.set('ctd.masterData.v2', JSON.stringify({ ...data, people: [{ id: 'x' }] }));
  const recovered = repo.bootstrap();
  assert.equal(recovered.people.length, seedRosterMembers.length);
});

test('create validates required fields, email format, and unique employee ID / email (case-insensitive)', () => {
  reset();
  const person = repo.createPerson(input('1'));
  assert.equal(person.status, 'active'); assert.ok(person.id.startsWith('person-'));
  assert.throws(() => repo.createPerson(input('2', { fullName: ' ' })), code(422));
  assert.throws(() => repo.createPerson(input('2', { email: 'tanpa-at' })), error => error.status === 422 && error.code === 'INVALID_EMAIL');
  assert.throws(() => repo.createPerson(input('2', { joinDate: '' })), code(422));
  assert.throws(() => repo.createPerson(input('2', { roleKey: 'Tidak Ada' })), code(422));
  assert.throws(() => repo.createPerson(input('2', { employeeId: person.employeeId.toLowerCase() })), error => error.status === 409 && error.code === 'DUPLICATE_EMPLOYEE_ID');
  assert.throws(() => repo.createPerson(input('2', { email: person.email.toUpperCase() })), error => error.status === 409 && error.code === 'DUPLICATE_EMAIL');
  assert.equal(repo.listPeople({ q: 'orang uji' }).meta.total, 1);
  assert.equal(repo.listPeople({ roleKey: 'Shift Lead' }).meta.total, 3);
  assert.equal(repo.listPeople({ status: 'inactive' }).meta.total, 0);
});

test('legacy members without employee ID keep working and require it only when edited from the form', () => {
  reset(); const data = repo.bootstrap(); repo.reset();
  const legacy = structuredClone(data); legacy.people[0] = { ...legacy.people[0], employeeId: undefined, email: undefined, joinDate: undefined };
  values.set('ctd.masterData.v2', JSON.stringify(legacy)); repo.bootstrap();
  const person = repo.getPerson(legacy.people[0].id);
  assert.equal(person.employeeId, undefined);
  assert.equal(repo.updatePerson(person.id, { notes: 'catatan' }).notes, 'catatan');
  assert.throws(() => repo.updatePerson(person.id, { employeeId: '' }), code(422));
});

test('rename keeps relations; audit records who and what changed', () => {
  reset(); const person = repo.createPerson(input('3'));
  const system = repo.snapshot().systems[0]; repo.update('system', system.id, { picUserId: person.id });
  const renamed = repo.updatePerson(person.id, { fullName: 'Nama Baru' });
  assert.equal(renamed.fullName, 'Nama Baru');
  assert.equal(repo.get('system', system.id).picUserId, person.id);
  const audit = repo.listTeamAudit('person', person.id).data;
  assert.equal(audit[0].byName, 'Penguji'); assert.equal(audit[0].changes[0].field, 'fullName'); assert.equal(audit[1].kind, 'create');
});

test('deactivated people cannot be newly assigned as PIC but an existing assignment stays valid', () => {
  reset(); const person = repo.createPerson(input('4')), other = repo.createPerson(input('5'));
  const system = repo.snapshot().systems[0]; repo.update('system', system.id, { picUserId: person.id });
  repo.setPersonStatus(person.id, 'inactive');
  assert.equal(repo.update('system', system.id, { description: 'masih boleh' }).picUserId, person.id);
  const second = repo.snapshot().systems[1];
  assert.throws(() => repo.update('system', second.id, { picUserId: person.id }), error => error.code === 'INACTIVE_USER');
  assert.equal(repo.update('system', second.id, { picUserId: other.id }).picUserId, other.id);
  assert.equal(repo.setPersonStatus(person.id, 'active').status, 'active');
});

test('hard delete: allowed for a new unused person, blocked with a reason for used and edited people, adapter enforced', () => {
  reset(); const fresh = repo.createPerson(input('6'));
  assert.equal(repo.personUsage(fresh.id).canDelete, true);
  repo.deletePerson(fresh.id);
  assert.equal(repo.listPeople({ q: 'orang uji 6' }).meta.total, 0);
  assert.equal(repo.snapshot().tombstones[0].nameSnapshot, 'Orang Uji 6'); assert.equal(repo.snapshot().tombstones[0].type, 'person');
  const used = repo.getPerson('mem-4'), usage = repo.personUsage('mem-4');
  assert.equal(usage.canDelete, false); assert.match(usage.deleteReason, /Sudah dipakai di .*Gunakan Nonaktifkan\.$/);
  assert.throws(() => repo.deletePerson(used.id), error => error.status === 409 && error.code === 'IN_USE');
  const edited = repo.createPerson(input('7')); repo.updatePerson(edited.id, { notes: 'diubah' });
  assert.match(repo.personUsage(edited.id).deleteReason, /Sudah pernah diubah/);
  assert.throws(() => repo.deletePerson(edited.id), code(409));
  assert.throws(() => repo.deletePerson('tidak-ada'), code(404));
});

test('usage counts PIC links by id and ticket/checkpoint references by name text', () => {
  reset(); const person = repo.createPerson(input('8')), system = repo.snapshot().systems[0], project = repo.snapshot().projects[0];
  repo.update('system', system.id, { picUserId: person.id }); repo.update('project', project.id, { leadUserId: person.id });
  const usage = repo.personUsage(person.id);
  assert.equal(usage.systems.length, 1); assert.equal(usage.projects.length, 1); assert.equal(usage.canDelete, false);
  const galih = repo.personUsage('mem-1'); assert.ok(galih.tickets > 0 || galih.checkpoints > 0);
});

test('loss prevention: last active holder of a protected role, the signed-in user and role moves', () => {
  reset(); const data = repo.bootstrap();
  const leads = data.people.filter(person => person.roleKey === 'Shift Lead');
  repo.setPersonStatus(leads[0].id, 'inactive'); repo.setPersonStatus(leads[1].id, 'archived');
  assert.throws(() => repo.setPersonStatus(leads[2].id, 'inactive'), error => error.status === 409 && error.code === 'LAST_ACTIVE_HOLDER');
  assert.throws(() => repo.updatePerson(leads[2].id, { roleKey: 'Operator NOC' }), error => error.code === 'LAST_ACTIVE_HOLDER');
  assert.throws(() => repo.deletePerson(leads[2].id), code(409));
  assert.equal(repo.personUsage(leads[2].id).lastHolderOf, 'Shift Lead');
  repo.setPersonStatus(leads[0].id, 'active'); repo.setPersonStatus(leads[2].id, 'inactive');
  repo.setActor({ id: 'op-1', name: 'Mhd. Galih Khairi', role: 'manager', email: 'galih.khairi@company.id' });
  assert.throws(() => repo.setPersonStatus('mem-1', 'inactive'), error => error.code === 'SELF_PROTECTED');
  assert.equal(repo.personUsage('mem-1').isSelf, true);
  assert.throws(() => repo.deletePerson('mem-1'), code(409));
});

test('roles: add, rename (key immutable), deactivate rules, protected and in-use roles', () => {
  reset();
  const role = repo.createRole({ name: 'Analis Data', description: 'Analisis', active: true });
  assert.ok(role.key.startsWith('role-')); assert.equal(role.protected, false); assert.equal(role.usageCount, 0);
  assert.throws(() => repo.createRole({ name: 'analis data', active: true }), error => error.status === 409);
  const renamed = repo.updateRole(role.key, { name: 'Analis' }); assert.equal(renamed.key, role.key); assert.equal(renamed.name, 'Analis');
  assert.throws(() => repo.updateRole('Shift Lead', { active: false }), error => error.code === 'ROLE_PROTECTED');
  assert.equal(repo.updateRole('Shift Lead', { name: 'Pemimpin Shift' }).name, 'Pemimpin Shift');
  assert.equal(repo.getRole('Shift Lead').key, 'Shift Lead');
  assert.throws(() => repo.deleteRole('Shift Lead'), error => error.code === 'ROLE_PROTECTED');
  const holder = repo.createPerson(input('9', { roleKey: role.key }));
  assert.equal(repo.getRole(role.key).usageCount, 1);
  assert.throws(() => repo.setRoleStatus(role.key, 'inactive'), error => error.code === 'ROLE_IN_USE');
  assert.throws(() => repo.deleteRole(role.key), code(409));
  repo.setPersonStatus(holder.id, 'inactive');
  assert.equal(repo.setRoleStatus(role.key, 'inactive').active, false);
  assert.throws(() => repo.createPerson(input('10', { roleKey: role.key })), error => error.code === 'INACTIVE_ROLE');
  assert.throws(() => repo.setPersonStatus(holder.id, 'active'), error => error.code === 'INACTIVE_ROLE');
  const unused = repo.createRole({ name: 'Sementara', active: true }); repo.deleteRole(unused.key);
  assert.equal(repo.snapshot().tombstones[0].type, 'role');
});

test('role reordering is one atomic write', () => {
  reset(); repo.bootstrap(); const before = repo.snapshot().revision, writes = [];
  const set = storage.setItem; storage.setItem = (key, value) => { writes.push(key); set(key, value); };
  repo.reorderRole('Shift Lead', 1);
  storage.setItem = set;
  assert.equal(writes.length, 1); assert.equal(repo.snapshot().revision, before + 1);
  assert.deepEqual(repo.listRoles({ pageSize: 50 }).data.map(role => role.key).slice(0, 3), ['Operator NOC', 'Incident Coordinator', 'Shift Lead']);
  repo.reorderCategory(repo.snapshot().categories[0].id, 1);
  assert.equal(repo.snapshot().revision, before + 2);
});

test('permissions: only the manager writes people and roles; the adapter answers 403', () => {
  for (const role of ['lead', 'operator', 'viewer']) {
    reset(role);
    assert.equal(repo.listPeople().meta.total, seedRosterMembers.length);
    assert.throws(() => repo.createPerson(input('11')), code(403));
    assert.throws(() => repo.updatePerson('mem-1', { notes: 'x' }), code(403));
    assert.throws(() => repo.setPersonStatus('mem-1', 'inactive'), code(403));
    assert.throws(() => repo.deletePerson('mem-1'), code(403));
    assert.throws(() => repo.createRole({ name: 'Peran Baru', active: true }), code(403));
    assert.throws(() => repo.reorderRole('Shift Lead', 1), code(403));
    assert.throws(() => repo.deleteRole('Shift Lead'), code(403));
    assert.throws(() => repo.remove('system', repo.snapshot().systems[0].id), code(403));
  }
  assert.equal(canMaster('manager', 'person', 'delete'), true); assert.equal(canMaster('lead', 'role', 'update'), false);
  assert.equal(canMaster('manager', 'severity', 'delete'), false);
  for (const name of ['master.person.read', 'master.person.create', 'master.person.update', 'master.person.archive', 'master.person.delete', 'master.role.delete', 'master.organization.delete', 'master.ticketRef.delete']) assert.ok(MASTER_PERMISSION_CATALOG.includes(name), name);
  assert.ok(MASTER_PERMISSION_CATALOG.includes('master.review.read'));
});

test('safe delete rules: used records are blocked with a reason, unused ones are removed with a tombstone', () => {
  reset(); const data = repo.bootstrap();
  const usedOrg = data.organizations.find(org => data.projects.some(project => project.organizationId === org.id));
  assert.equal(repo.impact('organization', usedOrg.id).canDelete, false);
  assert.match(repo.impact('organization', usedOrg.id).deleteReason, /proyek/);
  assert.throws(() => repo.remove('organization', usedOrg.id), error => error.status === 409 && error.code === 'IN_USE');
  const seedCategory = data.categories[0];
  assert.match(repo.impact('category', seedCategory.id).deleteReason, /Nonaktifkan/);
  assert.throws(() => repo.remove('severity', 'critical'), code(403));
  const category = repo.create('category', { name: 'Kategori Uji', active: true, sortOrder: 20 });
  assert.equal(repo.impact('category', category.id).canDelete, true);
  repo.remove('category', category.id);
  assert.ok(!repo.snapshot().categories.some(item => item.id === category.id));
  assert.deepEqual(repo.snapshot().tombstones[0], { type: 'category', id: category.id, nameSnapshot: 'Kategori Uji', at: '2026-10-27T01:00:00.000Z', by: 'tester' });
  const org = repo.create('organization', { kind: 'client', name: 'Org Uji', code: 'UJI', status: 'active' });
  const project = repo.create('project', { organizationId: org.id, name: 'Proyek Uji', code: 'PUJI', status: 'active' });
  assert.throws(() => repo.remove('organization', org.id), code(409));
  repo.remove('project', project.id); repo.remove('organization', org.id);
  assert.ok(!repo.snapshot().organizations.some(item => item.id === org.id));
  const edited = repo.create('category', { name: 'Diubah', active: true, sortOrder: 21 }); repo.update('category', edited.id, { description: 'x' });
  assert.match(repo.impact('category', edited.id).deleteReason, /Sudah pernah diubah/);
});
