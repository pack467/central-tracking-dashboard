import test from 'node:test';
import assert from 'node:assert/strict';
import { backendTicketToModel } from '../app/services/backend-tickets.ts';
import { backendUserToPerson, backendRoleToRole } from '../app/services/backend-team.ts';
import { apiModuleEnabled } from '../app/lib/config.ts';

const ticket = (over = {}) => ({
  id: '3640', third_party_ticket_id: 'REQ-2997', project_id: '6', client_id: '1', tenant_id: '1', user_id: '6', severity_id: '1', category_id: '3', requester: null,
  subject: '[USIEM] Restart Service OpenSearch NEW (Down) | 20261004', description: 'Service up kembali', status: 'Closed',
  open_at: '2026-10-04T02:00:00.000Z', closed_at: '2026-10-04T02:20:00.000Z', created_at: '2026-10-29T16:13:43.970Z', updated_at: '2026-10-29T16:13:43.970Z',
  project: { id: '6', name: 'Umbrella SIEM', code_prefix: 'USIEM' }, tenant: { id: '1', name: 'Telkomsel' }, client: { id: '1', name: 'Tritronik' },
  user: { id: '6', name: 'Mhd. Galih Khairi', email: 'galih.khairi@hutabyte.com' }, severity: { id: '1', code_name: 'Low', name: 'Low' }, category: { id: '3', name: 'Incident & Issue Handling' }, ...over,
});

test('a backend ticket becomes the ticket the UI shows, in WIB', () => {
  const model = backendTicketToModel(ticket());
  assert.equal(model.id, '3640');
  assert.equal(model.project, 'USIEM', 'the project code the UI already uses');
  assert.equal(model.date, '2026-10-04');
  assert.equal(model.requestTime, '09:00', '02:00 UTC is 09:00 WIB');
  assert.equal(model.completionTime, '09:20');
  assert.equal(model.resolutionMinutes, 20);
  assert.equal(model.owner, 'Mhd. Galih Khairi');
  assert.equal(model.clientId, 'tritronik');
  assert.equal(model.shift, 'Pagi');
  assert.equal(model.type, 'Incident & Issue Handling');
  assert.equal(model.isStillOpen, false);
});

test('statuses, severities, shifts and missing parts map safely', () => {
  assert.equal(backendTicketToModel(ticket({ status: 'ReOpen', closed_at: null })).status, 'Re-Open');
  assert.equal(backendTicketToModel(ticket({ status: 'Open', closed_at: null })).isStillOpen, true);
  assert.equal(backendTicketToModel(ticket({ severity: { id: '2', code_name: 'Med', name: 'Medium' } })).severity, 'Medium');
  assert.equal(backendTicketToModel(ticket({ severity: { id: '3', code_name: 'High', name: 'High' } })).severity, 'High');
  assert.equal(backendTicketToModel(ticket({ severity: null })).severity, 'Medium');
  assert.equal(backendTicketToModel(ticket({ open_at: '2026-10-04T18:00:00.000Z' })).shift, 'Subuh', '01:00 WIB next day');
  assert.equal(backendTicketToModel(ticket({ open_at: '2026-10-04T10:00:00.000Z' })).shift, 'Malam', '17:00 WIB');
  const bare = backendTicketToModel(ticket({ user: null, requester: 'Pelapor', project: null, category: null, client: null, description: null, closed_at: null }));
  assert.equal(bare.owner, 'Pelapor'); assert.equal(bare.project, '—'); assert.equal(bare.clientId, 'tritronik'); assert.equal(bare.type, undefined); assert.equal(bare.description, undefined);
  assert.equal(backendTicketToModel(ticket({ user: null, requester: null })).owner, '—');
  assert.equal(backendTicketToModel(ticket({ open_at: 'bukan tanggal' })).date, undefined, 'a bad date does not crash');
});

test('users and roles map to Personel and Peran', () => {
  const roles = [{ id: '1', name: 'SUPER_ADMIN', description: null, permissions: ['*'], user_count: 4, created_at: 'a', updated_at: 'b' }, { id: '4', name: 'AGENT', description: 'Operator', permissions: [], user_count: 9, created_at: 'a', updated_at: 'b' }];
  const person = backendUserToPerson({ id: '1', name: 'Agnes Yolanda Siahaan', nik: '2025-8007', email: 'agnes.siahaan@hutabyte.com', role_id: '4', is_active: true, photo_url: null, department: null, created_at: 'c', updated_at: 'd' }, roles);
  assert.deepEqual({ id: person.id, fullName: person.fullName, employeeId: person.employeeId, roleKey: person.roleKey, status: person.status }, { id: '1', fullName: 'Agnes Yolanda Siahaan', employeeId: '2025-8007', roleKey: 'AGENT', status: 'active' });
  assert.equal(backendUserToPerson({ id: '2', name: null, nik: null, email: 'x@y.z', role_id: null, is_active: false, photo_url: null, department: null, created_at: 'c', updated_at: 'd' }, roles).fullName, 'x@y.z');
  assert.equal(backendUserToPerson({ id: '2', name: 'A', nik: null, email: null, role_id: '99', is_active: false, photo_url: null, department: null, created_at: 'c', updated_at: 'd' }, roles).status, 'inactive');
  const role = backendRoleToRole(roles[1], 1);
  assert.deepEqual({ key: role.key, name: role.name, usageCount: role.usageCount, sortOrder: role.sortOrder }, { key: 'AGENT', name: 'Operator NOC', usageCount: 9, sortOrder: 1 });
});

test('modules switch on one by one, and USE_MOCK=false turns them all on', () => {
  const keys = ['NEXT_PUBLIC_USE_MOCK', 'NEXT_PUBLIC_API_MODULES'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    delete process.env.NEXT_PUBLIC_USE_MOCK; delete process.env.NEXT_PUBLIC_API_MODULES;
    assert.equal(apiModuleEnabled('auth'), false, 'default: everything is mock');
    process.env.NEXT_PUBLIC_API_MODULES = 'auth, Tickets';
    assert.deepEqual(['auth', 'tickets', 'people', 'roles'].map(apiModuleEnabled), [true, true, false, false]);
    process.env.NEXT_PUBLIC_USE_MOCK = 'false';
    assert.deepEqual(['auth', 'tickets', 'people', 'roles'].map(apiModuleEnabled), [true, true, true, true]);
  } finally { for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } }
});

import { ticketCode } from '../app/lib/ticket-code.ts';
import { fetchAllTickets, mergeRecentTickets, rememberTickets, setTicketCacheOwner, backendProjects, ticketToCreateBody, ticketToUpdateBody } from '../app/services/backend-tickets.ts';
import { localDataNotice } from '../app/lib/local-data-notice.ts';
import { bindSessionData } from '../app/lib/session-data.ts';

const withEnv = (values, run) => {
  const saved = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  try { for (const [key, value] of Object.entries(values)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } return run(); }
  finally { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
};
const shown = (id, date, requestTime, extra = {}) => ({ id, date, requestTime, status: 'Open', subject: id, ...extra });

test('recent changes replace known tickets, add new ones and keep newest first', () => {
  const current = [shown('3', '2026-10-03', '10:00'), shown('2', '2026-10-02', '10:00'), shown('1', '2026-10-01', '10:00')];
  const merged = mergeRecentTickets(current, [shown('2', '2026-10-02', '10:00', { status: 'Closed' }), shown('4', '2026-10-04', '08:30')]);
  assert.deepEqual(merged.map(ticket => ticket.id), ['4', '3', '2', '1']);
  assert.equal(merged.find(ticket => ticket.id === '2').status, 'Closed', 'an edited ticket is replaced');
  assert.equal(current.length, 3, 'the list it was given is not changed');
  assert.equal(mergeRecentTickets(current, []), current, 'nothing new: the same list, so nothing re-renders');
  assert.equal(mergeRecentTickets(current, [shown('3', '2026-10-03', '10:00')]).length, 3, 'a ticket already there is not duplicated');
});

// GET /ticket-categories and /ticket-severities as seeded (prisma/seed-data)
const lookups = {
  categories: [{ id: '1', name: 'Ad-hoc Request' }, { id: '3', name: 'Incident & Issue Handling' }],
  severities: [{ id: '1', code_name: 'Low', name: 'Low' }, { id: '2', code_name: 'Med', name: 'Medium' }, { id: '3', code_name: 'High', name: 'High' }],
};

test('a backend ticket shows its third-party number and keeps its id as the key', () => {
  const model = backendTicketToModel(ticket());
  assert.equal(model.id, '3640', 'URLs and PATCH use the id');
  assert.equal(ticketCode(model), 'REQ-2997', 'what the operator sees, as in the database');
  assert.equal(ticketCode(backendTicketToModel(ticket({ third_party_ticket_id: null }))), '3640', 'no third-party id: the id');
  assert.equal(ticketCode({ id: 'TICK-0001' }), 'TICK-0001', 'tickets the app keeps itself are unchanged');
});

test('a backend ticket keeps the backend ids behind its names', () => {
  assert.deepEqual(backendTicketToModel(ticket()).backend, { projectId: '6', projectName: 'Umbrella SIEM', clientId: '1', userId: '6', thirdPartyId: 'REQ-2997' });
  const projects = backendProjects([ticket(), ticket({ id: '2', project_id: '1', project: { id: '1', name: 'Single Mediation', code_prefix: 'SM' } }), ticket({ id: '3' })].map(backendTicketToModel));
  assert.deepEqual(projects, [{ id: '1', name: 'Single Mediation' }, { id: '6', name: 'Umbrella SIEM' }], 'one per project id, by name');
});

test('a new ticket from the form becomes the body of POST /tickets', () => {
  const draft = { id: '86d4abcde', subject: 'Cek SM', project: 'Single Mediation', severity: 'Medium', category: 'Ad-hoc Request', status: 'Re-Open', owner: 'A', ownerIds: ['7', 'local-x'], created: '10:00', description: 'catatan', requestTime: '09:30', completionTime: '10:15', backend: { projectId: '1', clientId: '1', thirdPartyId: '86d4abcde' } };
  const body = ticketToCreateBody(draft, lookups);
  assert.equal(body.project_id, '1'); assert.equal(body.client_id, '1'); assert.equal(body.severity_id, '2'); assert.equal(body.category_id, '1');
  assert.equal(body.status, 'ReOpen'); assert.equal(body.user_id, '7', 'the first PIC that is a backend user');
  assert.equal(body.third_party_ticket_id, '86d4abcde'); assert.equal(body.description, 'catatan');
  assert.match(body.open_at, /^\d{4}-\d{2}-\d{2}T09:30:00\+07:00$/, 'WIB time with its offset'); assert.match(body.closed_at, /T10:15:00\+07:00$/);
  const plain = ticketToCreateBody({ ...draft, ownerIds: undefined, requestTime: undefined, completionTime: undefined, description: undefined, status: 'Open' }, lookups);
  for (const key of ['user_id', 'open_at', 'closed_at', 'description']) assert.equal(key in plain, false, `${key} left to the backend's default`);
  assert.throws(() => ticketToCreateBody({ ...draft, status: 'RCA' }, lookups), /Status "RCA" belum ada di backend/);
  assert.throws(() => ticketToCreateBody({ ...draft, category: 'Maintenance' }, lookups), /Kategori "Maintenance" tidak dikenal/);
  assert.throws(() => ticketToCreateBody({ ...draft, backend: undefined }, lookups), /Pilih proyek/);
});

test('an edit sends only what changed, and escalation is refused rather than lost', () => {
  const before = backendTicketToModel(ticket({ status: 'Open', closed_at: null }));
  assert.deepEqual(ticketToUpdateBody({ ...before, description: before.description }, before, lookups), {}, 'nothing changed');
  assert.deepEqual(ticketToUpdateBody({ ...before, status: 'Closed' }, before, lookups), { status: 'Closed' }, 'Close Ticket');
  assert.deepEqual(ticketToUpdateBody({ ...before, severity: 'High', category: 'Ad-hoc Request', subject: 'Baru', backend: { ...before.backend, projectId: '1' } }, before, lookups),
    { subject: 'Baru', project_id: '1', severity_id: '3', category_id: '1' });
  assert.deepEqual(ticketToUpdateBody({ ...before, ownerIds: ['6'] }, before, lookups), {}, 'the same assignee is not sent (no "reassigning" for an operator)');
  assert.deepEqual(ticketToUpdateBody({ ...before, ownerIds: ['9'] }, before, lookups), { user_id: '9' });
  assert.deepEqual(ticketToUpdateBody({ ...before, description: '' }, before, lookups), { description: null });
  assert.throws(() => ticketToUpdateBody({ ...before, status: 'Escalated' }, before, lookups), /Status "Escalated" belum ada di backend/);
});

test('pages that are not connected say so, only while the app is partly connected', () => {
  const hybrid = { NEXT_PUBLIC_USE_MOCK: 'true', NEXT_PUBLIC_API_MODULES: 'auth,tickets,people,roles' };
  assert.match(withEnv(hybrid, () => localDataNotice('/monitoring')), /browser ini, tidak dibagikan ke operator lain/);
  assert.equal(withEnv(hybrid, () => localDataNotice('/runbooks')), null, 'Runbooks no longer exists');
  assert.match(withEnv(hybrid, () => localDataNotice('/monitoring/history')), /monitoring belum tersambung/);
  assert.match(withEnv(hybrid, () => localDataNotice('/shift-log')), /Shift Log dan handover/);
  assert.match(withEnv(hybrid, () => localDataNotice('/master-data')), /Selain Personel dan Peran, Master Data belum tersambung/);
  assert.match(withEnv({ ...hybrid, NEXT_PUBLIC_API_MODULES: 'auth,tickets' }, () => localDataNotice('/master-data')), /^Master Data belum tersambung/, 'nothing of it connected: no "selain"');
  assert.match(withEnv(hybrid, () => localDataNotice('/dashboard')), /Memo & Catatan Shift dan List Monitoring Shift belum tersambung.*browser ini/, 'the dashboard mixes real tickets with local memo and monitoring');
  for (const page of ['/tickets', '/team-roster', '/reports']) assert.equal(withEnv(hybrid, () => localDataNotice(page)), null, page);
  assert.equal(withEnv({ NEXT_PUBLIC_USE_MOCK: undefined, NEXT_PUBLIC_API_MODULES: undefined }, () => localDataNotice('/monitoring')), null, 'fully mock: no note');
  assert.equal(withEnv({ NEXT_PUBLIC_USE_MOCK: 'false', NEXT_PUBLIC_API_MODULES: undefined }, () => localDataNotice('/monitoring')), null, 'fully connected: no note');
});

test('changing the logged-in person is safe to repeat and never throws without a browser', () => {
  setTicketCacheOwner('1'); setTicketCacheOwner('1'); setTicketCacheOwner(null);
  bindSessionData('7'); bindSessionData('7'); bindSessionData('8'); bindSessionData(null);
});

test('the cached tickets belong to one person and survive a reload, not a change of person', async () => {
  const store = new Map();
  globalThis.window = { sessionStorage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key) } };
  const KEY = 'ctd.backendTickets.v2';
  const stored = () => JSON.parse(store.get(KEY) ?? 'null');
  try {
    bindSessionData(null);
    rememberTickets([shown('1', '2026-10-01', '10:00')]);
    assert.equal(store.has(KEY), false, 'nobody logged in: nothing is stored');

    // a person logs in and the tickets are cached for them
    bindSessionData('7');
    rememberTickets([shown('1', '2026-10-01', '10:00')]);
    assert.equal(stored().owner, '7');

    // a reload: the module starts empty ("nobody known yet"), the same person is found again. The stored copy is kept and used.
    store.set(KEY, JSON.stringify({ at: Date.now(), owner: '7', tickets: [shown('9', '2026-10-09', '10:00')] }));
    bindSessionData(null); // what a fresh page load amounts to for the module state
    assert.equal(store.has(KEY), false, 'no session found on start: nothing is left behind');
    store.set(KEY, JSON.stringify({ at: Date.now(), owner: '7', tickets: [shown('9', '2026-10-09', '10:00')] }));
    setTicketCacheOwner('7'); // first knowledge of the person after "nobody"
    assert.equal(stored().tickets[0].id, '9', 'the stored copy is kept when the same person shows up');
    assert.deepEqual((await fetchAllTickets()).map(ticket => ticket.id), ['9'], 'and it is what loads, without any request');

    // someone else on this tab: their copy is not used, and the previous one is gone
    setTicketCacheOwner('8');
    assert.equal(store.has(KEY), false, 'another person: the previous copy is dropped');
    rememberTickets([shown('3', '2026-10-03', '10:00')]);
    assert.equal(stored().owner, '8');
    store.set(KEY, JSON.stringify({ at: Date.now(), owner: '7', tickets: [shown('9', '2026-10-09', '10:00')] }));
    setTicketCacheOwner(null); setTicketCacheOwner('8');
    assert.equal(stored(), null, 'a copy stored for another person is never kept for this one');

    // logout or an ended session
    bindSessionData('8'); rememberTickets([shown('4', '2026-10-04', '10:00')]);
    bindSessionData(null);
    assert.equal(store.has(KEY), false, 'nothing is left behind');
  } finally { delete globalThis.window; bindSessionData(null); }
});

import { ACTION_PERMISSION } from '../app/lib/access.ts';
test('every UI action maps to a permission the backend really has (GET /permissions)', () => {
  const catalog = ['monitorings.delete', 'monitorings.read', 'monitorings.write', 'monitorings.write.any', 'roles.manage', 'roles.read', 'ticket-lookups.manage', 'tickets.delete', 'tickets.read', 'tickets.write', 'tickets.write.any', 'users.manage', 'users.manage.all', 'users.read'];
  for (const [action, permission] of Object.entries(ACTION_PERMISSION)) assert.ok(catalog.includes(permission), `${action} -> ${permission}`);
  // what a Viewer has: it can read tickets and users, nothing else
  const viewer = ['tickets.read', 'users.read'];
  const can = action => viewer.includes(ACTION_PERMISSION[action]);
  assert.deepEqual(['tickets.view', 'people.view'].map(can), [true, true]);
  assert.deepEqual(['tickets.create', 'tickets.update', 'tickets.delete', 'people.manage', 'roles.view', 'roles.manage'].map(can), [false, false, false, false, false, false]);
});
