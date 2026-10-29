import test from 'node:test';
import assert from 'node:assert/strict';
import { masterRepository as repo } from '../app/services/master-data-repository.ts';
import { MASTER_LOGO_MAX_LENGTH, isSafeLogo, isSafeReferenceUrl, masterId, randomUuid, safeHref, safeLogo } from '../app/lib/master-data-model.ts';

const KEY = 'ctd.masterData.v2';
const INVALID_KEY = 'ctd.masterData.invalid.v1';
const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
const browser = new EventTarget();
Object.assign(browser, { localStorage: storage, location: { search: '?mock=instant' }, __TEST_CLOCK__: '2026-10-27T01:00:00.000Z' });
globalThis.window = browser;
globalThis.localStorage = storage;
function reset() { values.clear(); repo.reset(); delete process.env.NEXT_PUBLIC_MOCK_ROLE; repo.setActor({ id: 'tester', name: 'Penguji', role: 'manager' }); browser.__TEST_CLOCK__ = '2026-10-27T01:00:00.000Z'; }
const status = code => error => error.status === code;
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function withCrypto(value, run) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value, configurable: true, writable: true });
  try { return run(); } finally { if (original) Object.defineProperty(globalThis, 'crypto', original); else delete globalThis.crypto; }
}

test('C1: ids are still created where crypto.randomUUID is missing (http over a LAN address)', () => {
  const insecure = { getRandomValues: bytes => { for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37 + 11) % 256; return bytes; } };
  withCrypto(insecure, () => assert.match(randomUuid(), V4));
  withCrypto(undefined, () => {
    const ids = new Set(Array.from({ length: 500 }, () => randomUuid()));
    assert.equal(ids.size, 500);
    for (const id of ids) assert.match(id, V4);
    assert.match(masterId('person'), /^person-[0-9a-f]{8}-/);
  });
  assert.match(randomUuid(), V4);
});

test('C1: creating records works end to end without randomUUID', () => {
  reset();
  withCrypto({ getRandomValues: bytes => { for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256); return bytes; } }, () => {
    const org = repo.create('organization', { kind: 'client', name: 'Organisasi LAN', code: 'LAN', status: 'active' });
    assert.match(org.id, /^org-|^organization-|^[a-z]+-[0-9a-f]{8}-/);
    const person = repo.createPerson({ fullName: 'Orang LAN', employeeId: 'EMP-LAN1', email: 'lan@company.id', roleKey: 'Operator NOC', joinDate: '2026-10-01', status: 'active' });
    assert.ok(person.id);
  });
});

test('C5: only http(s) and app paths are safe reference URLs', () => {
  for (const ok of ['https://grafana.example.com/d/1', 'HTTP://x.test', '/runbooks/jaringan', '/tickets?id=1']) assert.equal(isSafeReferenceUrl(ok), true, ok);
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>', '//evil.example', '/\\evil.example', '\\\\evil.example', 'ftp://x', '', 'vbscript:x']) assert.equal(isSafeReferenceUrl(bad), false, bad);
  assert.equal(safeHref('  https://ok.test/a  '), 'https://ok.test/a');
  assert.equal(safeHref('javascript:alert(1)'), undefined);
  assert.equal(safeHref(undefined), undefined);
});

test('C5: the adapter rejects unsafe URLs on write and stored ones are dropped on load', () => {
  reset();
  const system = repo.bootstrap().systems[0];
  for (const bad of ['javascript:alert(1)', '//evil.example', '/\\evil.example']) assert.throws(() => repo.update('system', system.id, { referenceUrl: bad }), status(422), bad);
  repo.update('system', system.id, { referenceUrl: '/runbooks/aman' });
  // tamper with storage: one unsafe, one safe
  const data = JSON.parse(values.get(KEY));
  data.systems[0].referenceUrl = 'javascript:alert(document.cookie)';
  data.systems[1].referenceUrl = 'https://aman.example/dashboard';
  values.set(KEY, JSON.stringify(data));
  repo.reset(); values.set(KEY, JSON.stringify(data));
  const loaded = repo.bootstrap();
  assert.equal(loaded.systems[0].referenceUrl, undefined, 'unsafe URL dropped');
  assert.equal(loaded.systems[1].referenceUrl, 'https://aman.example/dashboard', 'safe URL kept');
  assert.equal(loaded.systems.length, data.systems.length, 'the rest of the dataset is untouched');
});

test('C2: invalid stored data is copied aside before it is replaced', () => {
  reset();
  const bad = JSON.stringify({ version: 2, organizations: 'bukan array', catatan: 'data penting pengguna' });
  values.set(KEY, bad);
  const data = repo.bootstrap();
  assert.ok(data.organizations.length > 0, 'seed is used');
  const copy = JSON.parse(values.get(INVALID_KEY));
  assert.equal(copy.raw, bad, 'the original text survives byte for byte');
  assert.ok(copy.at);
  assert.notEqual(values.get(KEY), bad, 'a valid dataset replaced it');
});

test('C2: unparsable JSON and data from a newer version are also preserved', () => {
  for (const bad of ['{"version": 2, "organi', JSON.stringify({ version: 3, organizations: [], future: true })]) {
    reset(); values.set(KEY, bad);
    repo.bootstrap();
    assert.equal(JSON.parse(values.get(INVALID_KEY)).raw, bad);
  }
});

test('C2: a tab that only notices another tab\'s bad write does not overwrite it', () => {
  reset();
  repo.bootstrap();
  const unsubscribe = repo.subscribe(() => {});
  const bad = JSON.stringify({ version: 2, rusak: true });
  values.set(KEY, bad);
  browser.dispatchEvent(Object.assign(new Event('storage'), { key: KEY }));
  assert.equal(values.get(KEY), bad, 'reading from a storage event never writes back');
  assert.equal(values.get(INVALID_KEY), undefined, 'nothing is copied until something is written');
  // the first real write from this tab saves the copy, then replaces the bad data
  repo.create('organization', { kind: 'client', name: 'Setelah rusak', code: 'SR', status: 'active' });
  assert.equal(JSON.parse(values.get(INVALID_KEY)).raw, bad);
  assert.notEqual(values.get(KEY), bad);
  unsubscribe();
});

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

test('logo: only small base64 PNG/JPEG/WebP images or https URLs are accepted', () => {
  for (const ok of [PNG, 'data:image/jpeg;base64,/9j/4AAQ', 'data:image/webp;base64,UklGRg==', 'https://cdn.example.com/logo.png']) assert.equal(isSafeLogo(ok), true, ok.slice(0, 30));
  for (const bad of ['data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PHNjcmlwdD4=', 'javascript:alert(1)', 'http://plain.example/logo.png', 'data:image/png;base64,abc"onerror="x', '', `data:image/png;base64,${'A'.repeat(MASTER_LOGO_MAX_LENGTH)}`])
    assert.equal(isSafeLogo(bad), false, bad.slice(0, 40));
  assert.equal(safeLogo('javascript:alert(1)'), undefined);
  assert.equal(safeLogo(PNG), PNG);
});

test('logo: saved, replaced and removed on Organisasi, Proyek and Sistem; history keeps no image data', () => {
  reset();
  const data = repo.bootstrap();
  const org = repo.create('organization', { kind: 'client', name: 'Logo Uji', code: 'LGU', status: 'active', logoUrl: PNG });
  assert.equal(org.logoUrl, PNG);
  const project = repo.update('project', data.projects[0].id, { logoUrl: PNG });
  assert.equal(project.logoUrl, PNG);
  const system = repo.update('system', data.systems[0].id, { logoUrl: PNG });
  assert.equal(system.logoUrl, PNG);
  assert.throws(() => repo.update('organization', org.id, { logoUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }), status(422));
  assert.equal(repo.update('organization', org.id, { logoUrl: '' }).logoUrl, undefined, 'an empty value removes the logo');
  const changes = repo.listAudit('organization', org.id).data.flatMap(entry => entry.changes).filter(change => change.field === 'logoUrl');
  assert.deepEqual(changes.map(change => [change.from, change.to]), [['Logo lama', null], [null, 'Logo baru']]);
  assert.ok(!values.get(KEY).split('"audit"')[1].includes('iVBORw0KGgo'), 'the audit trail never stores the image');
});

test('logo: search ignores image data, and an unsafe stored logo is dropped on load', () => {
  reset();
  const data = repo.bootstrap();
  repo.update('organization', data.organizations[0].id, { logoUrl: PNG });
  assert.equal(repo.list('organization', { q: 'iVBORw0KGgo' }).meta.total, 0, 'base64 text is not searchable');
  const stored = JSON.parse(values.get(KEY));
  stored.organizations[1].logoUrl = 'javascript:alert(1)';
  repo.reset(); values.set(KEY, JSON.stringify(stored));
  const loaded = repo.bootstrap();
  assert.equal(loaded.organizations[0].logoUrl, PNG, 'a safe logo is kept');
  assert.equal(loaded.organizations[1].logoUrl, undefined, 'an unsafe logo is dropped');
  assert.equal(loaded.organizations.length, stored.organizations.length);
});

test('C2: valid data is never copied to the invalid key', () => {
  reset();
  repo.bootstrap();
  repo.create('organization', { kind: 'client', name: 'Valid', code: 'VLD', status: 'active' });
  repo.reset(); // wipes keys
  repo.bootstrap();
  assert.equal(values.get(INVALID_KEY), undefined);
});
