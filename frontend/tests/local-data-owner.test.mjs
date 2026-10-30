import test from 'node:test';
import assert from 'node:assert/strict';
import { claimLocalData, PER_USER_KEYS } from '../app/lib/local-data-owner.ts';

const memoryStore = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: k => (data.has(k) ? data.get(k) : null), setItem: (k, v) => void data.set(k, String(v)), removeItem: k => void data.delete(k), dump: () => Object.fromEntries(data) };
};

test('the first person to log in keeps the data that was already there', () => {
  const store = memoryStore({ 'ctd.memo.v2': 'catatan lama', 'ctd.checkpoints': '{"a":1}', 'ctd.sidebarCollapsed': 'true' });
  assert.equal(claimLocalData(store, '1'), 'claimed');
  assert.equal(store.getItem('ctd.memo.v2'), 'catatan lama', 'untouched');
  assert.equal(claimLocalData(store, '1'), 'same');
});

test('another person does not see it, and it is not lost', () => {
  const store = memoryStore({ 'ctd.memo.v2': 'memo Ani', 'ctd.checkpoints': '{"ani":1}', 'ctd.sidebarCollapsed': 'true', 'ctd.masterData.v2': '{}' });
  claimLocalData(store, 'ani');
  assert.equal(claimLocalData(store, 'budi'), 'switched');
  assert.equal(store.getItem('ctd.memo.v2'), null, 'Budi starts clean');
  assert.equal(store.getItem('ctd.checkpoints'), null);
  assert.equal(store.getItem('ctd.stash.ani.ctd.memo.v2'), 'memo Ani', 'Ani\'s memo is kept under her id');
  assert.equal(store.getItem('ctd.sidebarCollapsed'), 'true', 'a device setting is not personal');
  assert.equal(store.getItem('ctd.masterData.v2'), '{}', 'Master Data is not personal');
});

test('the first person gets their own data back when they return', () => {
  const store = memoryStore({ 'ctd.memo.v2': 'memo Ani' });
  claimLocalData(store, 'ani');
  claimLocalData(store, 'budi');
  store.setItem('ctd.memo.v2', 'memo Budi');
  assert.equal(claimLocalData(store, 'ani'), 'switched');
  assert.equal(store.getItem('ctd.memo.v2'), 'memo Ani');
  assert.equal(store.getItem('ctd.stash.ani.ctd.memo.v2'), null, 'the stash is emptied once it is back');
  assert.equal(store.getItem('ctd.stash.budi.ctd.memo.v2'), 'memo Budi');
  assert.equal(claimLocalData(store, 'budi'), 'switched');
  assert.equal(store.getItem('ctd.memo.v2'), 'memo Budi');
});

test('only the listed personal keys are moved, and an absent key stays absent', () => {
  const store = memoryStore({ 'ctd.memo.v2': 'x' });
  claimLocalData(store, 'ani');
  claimLocalData(store, 'budi');
  for (const key of PER_USER_KEYS) if (key !== 'ctd.memo.v2') assert.equal(store.getItem(key), null, key);
  assert.deepEqual(Object.keys(store.dump()).sort(), ['ctd.dataOwner', 'ctd.stash.ani.ctd.memo.v2']);
});

test('the list covers the memo, verdicts, hand-over notes, notifications and status, and not the device or login keys', () => {
  for (const key of ['ctd.memo.v2', 'ctd.memo.draft.v1', 'ctd.checkpoints', 'ctd.handover.notes', 'ctd.notifications.v6', 'ctd.user.status']) assert.ok(PER_USER_KEYS.includes(key), key);
  for (const key of ['ctd.auth_token', 'ctd.auth_user', 'ctd.is_logged_out', 'ctd.sidebarCollapsed', 'ctd_splash_seen', 'ctd.activeClientId', 'ctd.masterData.v2']) assert.ok(!PER_USER_KEYS.includes(key), key);
});
