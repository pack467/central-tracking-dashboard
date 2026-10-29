import test from 'node:test';
import assert from 'node:assert/strict';
import { notesStore, resetNotesStore, parseState, nextTitle, readDrafts, writeDrafts, NOTES_KEY, LEGACY_MEMO_KEY, INVALID_NOTES_KEY, DRAFT_KEY, SEED_MEMO_TEXT, MAX_NOTES } from '../app/lib/shift-notes.ts';
import { cleanDoc, docFromText, docToText, countItems, isEmptyDoc, emptyDoc, docToHtml } from '../app/lib/shift-notes-doc.ts';

const values = new Map();
let blocked = false;
const storage = {
  getItem: key => { if (blocked) throw new Error('blocked'); return values.get(key) ?? null; },
  setItem: (key, value) => { if (blocked) throw new Error('blocked'); values.set(key, String(value)); },
  removeItem: key => { if (blocked) throw new Error('blocked'); values.delete(key); },
};
const browser = new EventTarget();
Object.assign(browser, { localStorage: storage, __TEST_CLOCK__: '2026-10-29T03:00:00.000Z' });
globalThis.window = browser;
function fresh() { values.clear(); blocked = false; resetNotesStore(); }
function load() { notesStore.subscribe(() => {}); return notesStore.getSnapshot(); }
const doc = text => docFromText(text);

test('seed: four bullet points, shown exactly as the old memo text', () => {
  fresh();
  const snap = load();
  assert.equal(snap.notes.length, 1);
  assert.equal(snap.notes[0].title, 'Catatan 1');
  assert.equal(snap.notes[0].doc.blocks.length, 4);
  assert.ok(snap.notes[0].doc.blocks.every(block => block.k === 'li' && block.l === 'ul' && block.d === 0));
  assert.equal(docToText(snap.notes[0].doc), SEED_MEMO_TEXT);
  assert.equal(countItems(snap.notes[0].doc), 4, 'the counter still reads 4 butir');
  assert.equal(values.get(NOTES_KEY), undefined, 'the seed is not written until something changes');
});

test('migration: the old memo string becomes "Catatan 1" without losing a character, and its key stays', () => {
  fresh();
  const old = '• Satu\n  • bersarang\n• Dua\n\nCatatan bebas tanpa poin\n1. angka\n- [ ] belum\n- [x] sudah';
  values.set(LEGACY_MEMO_KEY, old);
  const snap = load();
  assert.equal(snap.notes.length, 1);
  assert.equal(snap.notes[0].title, 'Catatan 1');
  assert.equal(docToText(snap.notes[0].doc), '• Satu\n  • bersarang\n• Dua\n\nCatatan bebas tanpa poin\n1. angka\n[ ] belum\n[x] sudah');
  assert.equal(values.get(LEGACY_MEMO_KEY), old, 'the legacy key is untouched');
  assert.ok(parseState(values.get(NOTES_KEY)), 'ctd.memo.v2 was written');
});

test('migration: an empty old memo stays empty instead of coming back as the seed', () => {
  fresh();
  values.set(LEGACY_MEMO_KEY, '');
  const snap = load();
  assert.equal(snap.notes.length, 1);
  assert.ok(isEmptyDoc(snap.notes[0].doc));
});

test('a damaged ctd.memo.v2 falls back (legacy memo, else seed) and is copied aside', () => {
  fresh();
  values.set(NOTES_KEY, '{"v":2,"notes":"rusak"');
  assert.equal(docToText(load().notes[0].doc), SEED_MEMO_TEXT);
  assert.equal(JSON.parse(values.get(INVALID_NOTES_KEY)).raw, '{"v":2,"notes":"rusak"');
  fresh();
  values.set(NOTES_KEY, JSON.stringify({ v: 2, notes: [{ id: 'a', title: '', doc: { v: 1, blocks: [] }, createdAt: '', updatedAt: '' }], activeId: 'a', rev: 1 }));
  values.set(LEGACY_MEMO_KEY, '• dari memo lama');
  assert.equal(docToText(load().notes[0].doc), '• dari memo lama');
});

test('blocked storage: everything still works, in memory', () => {
  fresh();
  blocked = true;
  const snap = load();
  assert.equal(snap.persistent, false);
  const id = notesStore.addNote(doc('• sementara'));
  assert.ok(id);
  assert.equal(notesStore.getSnapshot().notes.length, 2);
  assert.equal(docToText(notesStore.getSnapshot().notes[1].doc), '• sementara');
  assert.equal(notesStore.getSnapshot().persistent, false);
});

test('two tabs: a change written elsewhere shows up here, a bad one is ignored', () => {
  fresh();
  load();
  const seen = [];
  notesStore.subscribe(() => seen.push(notesStore.getSnapshot().notes.length));
  const other = { v: 2, notes: [{ id: 'x1', title: 'Dari tab lain', doc: { v: 1, blocks: [{ k: 'p', r: [{ t: 'halo' }] }] }, createdAt: 'a', updatedAt: 'b' }, { id: 'x2', title: 'Kedua', doc: { v: 1, blocks: [] }, createdAt: 'a', updatedAt: 'b' }], activeId: 'x2', rev: 5 };
  values.set(NOTES_KEY, JSON.stringify(other));
  browser.dispatchEvent(Object.assign(new Event('storage'), { key: NOTES_KEY }));
  assert.equal(notesStore.getSnapshot().notes.length, 2);
  assert.equal(notesStore.getSnapshot().activeId, 'x2');
  values.set(NOTES_KEY, '{kotor');
  browser.dispatchEvent(Object.assign(new Event('storage'), { key: NOTES_KEY }));
  assert.equal(notesStore.getSnapshot().notes.length, 2, 'a damaged value written by another tab is ignored');
  assert.ok(seen.length >= 1);
});

test('titles: "Catatan N" never clash; renaming needs 1 to 40 characters', () => {
  fresh();
  load();
  const a = notesStore.addNote(), b = notesStore.addNote();
  assert.deepEqual(notesStore.getSnapshot().notes.map(note => note.title), ['Catatan 1', 'Catatan 2', 'Catatan 3']);
  notesStore.removeNote(a);
  assert.equal(nextTitle(notesStore.getSnapshot().notes), 'Catatan 2', 'the freed number is reused');
  assert.equal(notesStore.renameNote(b, '   '), false);
  assert.equal(notesStore.renameNote(b, 'x'.repeat(41)), false);
  assert.equal(notesStore.renameNote(b, '  Serah terima  '), true);
  assert.equal(notesStore.getSnapshot().notes.find(note => note.id === b).title, 'Serah terima');
});

test('limit: 20 notes, then adding and duplicating are refused', () => {
  fresh();
  load();
  for (let i = 1; i < MAX_NOTES; i++) assert.ok(notesStore.addNote());
  assert.equal(notesStore.getSnapshot().notes.length, MAX_NOTES);
  assert.equal(notesStore.addNote(), null);
  assert.equal(notesStore.duplicateNote(notesStore.getSnapshot().notes[0].id), null);
});

test('pin keeps pinned notes first; duplicate sits next to its source; move stays inside the group', () => {
  fresh();
  load();
  const [first] = notesStore.getSnapshot().notes.map(note => note.id);
  const b = notesStore.addNote(), c = notesStore.addNote();
  notesStore.togglePin(c);
  assert.deepEqual(notesStore.getSnapshot().notes.map(note => note.id), [c, first, b]);
  assert.equal(notesStore.moveNote(c, -1), false, 'cannot leave the pinned group');
  assert.equal(notesStore.moveNote(first, -1), false, 'an unpinned note cannot pass a pinned one');
  assert.equal(notesStore.moveNote(first, 1), true);
  assert.deepEqual(notesStore.getSnapshot().notes.map(note => note.id), [c, b, first]);
  const copy = notesStore.duplicateNote(b);
  const ids = notesStore.getSnapshot().notes.map(note => note.id);
  assert.equal(ids[ids.indexOf(b) + 1], copy);
  assert.match(notesStore.getSnapshot().notes.find(note => note.id === copy).title, /\(salinan\)$/);
  notesStore.togglePin(c);
  assert.equal(notesStore.getSnapshot().notes.some(note => note.pinned), false);
});

test('delete can be undone; the last note is emptied, not deleted', () => {
  fresh();
  load();
  const second = notesStore.addNote(doc('• penting'));
  const removed = notesStore.removeNote(second);
  assert.equal(notesStore.getSnapshot().notes.length, 1);
  assert.equal(notesStore.getSnapshot().activeId, notesStore.getSnapshot().notes[0].id);
  assert.equal(notesStore.undoRemove(removed), true);
  assert.equal(docToText(notesStore.getSnapshot().notes[1].doc), '• penting');
  assert.equal(notesStore.getSnapshot().activeId, second);
  notesStore.removeNote(second);
  const last = notesStore.removeNote(notesStore.getSnapshot().notes[0].id);
  assert.equal(last.cleared, true);
  assert.equal(notesStore.getSnapshot().notes.length, 1);
  assert.ok(isEmptyDoc(notesStore.getSnapshot().notes[0].doc));
  notesStore.undoRemove(last);
  assert.equal(countItems(notesStore.getSnapshot().notes[0].doc), 4);
});

test('save, clear and tick a checklist item; every write is a valid v2 state', () => {
  fresh();
  load();
  const id = notesStore.getSnapshot().notes[0].id;
  assert.equal(notesStore.saveDoc(id, doc('[ ] satu\n[x] dua')), true);
  assert.equal(notesStore.toggleTodo(id, 0), true);
  assert.equal(notesStore.toggleTodo(id, 1), true);
  assert.equal(docToText(notesStore.getSnapshot().notes[0].doc), '[x] satu\n[ ] dua');
  assert.equal(notesStore.toggleTodo(id, 5), false, 'no such item');
  assert.ok(parseState(values.get(NOTES_KEY)), 'what was written reads back');
  assert.equal(notesStore.saveDoc(id, { v: 1, blocks: [{ k: 'zzz' }] }), false, 'an invalid document is refused');
  notesStore.clearNote(id);
  assert.ok(isEmptyDoc(notesStore.getSnapshot().notes[0].doc));
});

test('documents: strict validation, depth rule, text export of every list kind', () => {
  assert.equal(cleanDoc({ v: 2, blocks: [] }), null);
  assert.equal(cleanDoc({ v: 1, blocks: [{ k: 'p', r: [{ t: 1 }] }] }), null);
  assert.equal(cleanDoc({ v: 1, blocks: [{ k: 'li', l: 'ul', d: 2, r: [] }] }), null);
  assert.equal(cleanDoc({ v: 1, blocks: [{ k: 'p', r: [{ t: 'x', m: ['b', 'script'] }] }] }), null);
  const fixed = cleanDoc({ v: 1, blocks: [{ k: 'li', l: 'ul', d: 1, r: [{ t: 'a' }] }] });
  assert.equal(fixed.blocks[0].d, 0, 'a nested item without a parent is lifted');
  const mixed = cleanDoc({ v: 1, blocks: [
    { k: 'h', r: [{ t: 'Judul', m: ['b'] }] },
    { k: 'li', l: 'ol', d: 0, r: [{ t: 'satu' }] }, { k: 'li', l: 'ul', d: 1, r: [{ t: 'anak' }] }, { k: 'li', l: 'ol', d: 0, r: [{ t: 'dua' }] },
    { k: 'li', l: 'todo', d: 0, c: true, r: [{ t: 'selesai' }] }, { k: 'p', r: [{ t: 'tebal ', m: ['b'] }, { t: 'biasa' }] },
  ] });
  assert.equal(docToText(mixed), 'Judul\n1. satu\n  • anak\n2. dua\n[x] selesai\ntebal biasa');
  const html = docToHtml(mixed);
  assert.match(html, /<h3><b>Judul<\/b><\/h3>/);
  assert.match(html, /<ol><li>satu<ul><li>anak<\/li><\/ul><\/li><li>dua<\/li><\/ol>/);
  assert.match(html, /<ul data-todo><li data-checked>selesai<\/li><\/ul>/);
  const hostile = cleanDoc({ v: 1, blocks: [{ k: 'p', r: [{ t: '<img src=x onerror=alert(1)><script>alert(1)</script>' }] }] });
  assert.ok(!/<img|<script/.test(docToHtml(hostile)), 'text is escaped in generated markup');
  assert.deepEqual(emptyDoc().blocks, []);
});

test('drafts: stored under their own key, validated on read, removed when empty', () => {
  fresh();
  writeDrafts({ a: doc('• belum disimpan') });
  assert.equal(docToText(readDrafts().a), '• belum disimpan');
  values.set(DRAFT_KEY, JSON.stringify({ v: 1, drafts: { good: { v: 1, blocks: [] }, bad: { v: 1, blocks: [{ k: 'x' }] } } }));
  assert.deepEqual(Object.keys(readDrafts()), ['good']);
  writeDrafts({});
  assert.equal(values.get(DRAFT_KEY), undefined);
  values.set(DRAFT_KEY, 'bukan json');
  assert.deepEqual(readDrafts(), {});
});
