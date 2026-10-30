import test from 'node:test';
import assert from 'node:assert/strict';
import { canDeleteHandover, isInHandoverShift, parseHandoverContent, updateHandoverRecord, validateDraft } from '../app/lib/handover.ts';

const receiver = { id: 'u-budi', name: 'Budi', email: 'budi@x.id' };
const other = { id: 'u-sari', name: 'Sari', email: 'sari@x.id' };
const record = () => parseHandoverContent(JSON.stringify({
  sourceShift: 'Subuh', targetShift: 'Pagi', sourcePic: 'Andi', targetPic: 'Budi', monitoringOwner: 'Andi', monitoringSummary: 's',
  validationNote: 'v', monitoredProjects: ['SM'], findings: [], receiverEmail: '',
  tasks: [1, 2].map(id => ({ id, title: `t${id}`, project: 'SM', detail: 'd', state: 'repeat', completed: false })),
}));
const save = value => parseHandoverContent(JSON.stringify(value));

test('who confirmed a task, and when, survives saving and loading the note', () => {
  const ticked = save(updateHandoverRecord(record(), receiver, 'task', { taskId: 1, completed: true }, '2026-10-31T01:00:00.000Z'));
  assert.equal(ticked.tasks[0].confirmedBy, 'Budi');
  assert.equal(ticked.tasks[0].confirmedAt, '2026-10-31T01:00:00.000Z');
  const next = save(updateHandoverRecord(ticked, receiver, 'task', { taskId: 2, completed: true }, '2026-10-31T02:00:00.000Z'));
  assert.equal(next.tasks[0].confirmedAt, '2026-10-31T01:00:00.000Z', 'the first confirmation is kept by the next change');
});

test('an unticked task carries no confirmer', () => {
  const loaded = save({ ...record(), tasks: [{ id: 1, title: 't', project: 'SM', detail: 'd', state: 'repeat', completed: false, confirmedBy: 'X', confirmedAt: 'now' }] });
  assert.equal(loaded.tasks[0].confirmedBy, undefined);
});

test('a sender cannot write who confirmed the tasks into a new or revised note', () => {
  const draft = { ...record(), date: '2026-10-31', monitoredProjects: 'SM', tasks: [{ id: 1, title: 't', project: 'SM', detail: 'd', state: 'repeat', completed: true, confirmedBy: 'Budi', confirmedAt: '2026-10-31T01:00:00.000Z' }] };
  const validated = save(validateDraft(draft));
  assert.equal(validated.tasks[0].confirmedBy, undefined);
  assert.equal(validated.tasks[0].confirmedAt, undefined);
});

test('ticking and unticking the same box leaves no audit lines, so the note cannot be filled up by clicking', () => {
  let current = record();
  for (let i = 0; i < 50; i++) {
    current = save(updateHandoverRecord(current, receiver, 'task', { taskId: 1, completed: true }));
    current = save(updateHandoverRecord(current, receiver, 'task', { taskId: 1, completed: false }));
  }
  assert.equal(current.auditTrail.length, 0);
  current = save(updateHandoverRecord(current, receiver, 'task', { taskId: 1, completed: true }));
  assert.deepEqual(current.auditTrail.map(entry => entry.action), ['task-confirmed']);
});

test('real changes are still logged: another task in between, or another person', () => {
  let current = record();
  current = save(updateHandoverRecord(current, receiver, 'task', { taskId: 1, completed: true }));
  current = save(updateHandoverRecord(current, receiver, 'task', { taskId: 2, completed: true }));
  current = save(updateHandoverRecord(current, receiver, 'task', { taskId: 1, completed: false }));
  assert.equal(current.auditTrail.length, 3);
  current = save(updateHandoverRecord(current, other, 'task', { taskId: 1, completed: true }));
  current = save(updateHandoverRecord(current, receiver, 'task', { taskId: 1, completed: false }));
  assert.deepEqual(current.auditTrail.map(entry => `${entry.action}:${entry.actor.id}`).slice(-2), ['task-confirmed:u-sari', 'task-unconfirmed:u-budi']);
});

test('team rule: people on the shift handing over or taking over may add and delete; others, and people on leave, may not', () => {
  const subuhToPagi = { sourceShift: 'Subuh', targetShift: 'Pagi' };
  assert.equal(isInHandoverShift('Shift Subuh', subuhToPagi), true, 'the shift handing over');
  assert.equal(isInHandoverShift('Pagi', subuhToPagi), true, 'the shift taking over');
  assert.equal(isInHandoverShift('Shift Malam', subuhToPagi), false);
  assert.equal(isInHandoverShift('Cuti', subuhToPagi), false);
  assert.equal(isInHandoverShift('Belum dijadwalkan', subuhToPagi), true, 'no known shift (people from the backend) is not held back');
  assert.equal(isInHandoverShift(null, subuhToPagi), true);
});

test('the sender and the receiver may delete a task or a note; with a named receiving account, nobody else may', () => {
  const sender = { id: 'u-andi', name: 'Andi', email: 'andi@x.id' };
  const named = { ...record(), createdBy: sender, receiverEmail: 'budi@x.id' };
  assert.equal(canDeleteHandover(named, sender), true);
  assert.equal(canDeleteHandover(named, receiver), true);
  assert.equal(canDeleteHandover(named, other), false);
  assert.equal(updateHandoverRecord(named, sender, 'delete-task', { taskId: 1 }).tasks.length, 1, 'the sender can remove a task too');
  assert.throws(() => updateHandoverRecord(named, other, 'delete-task', { taskId: 1 }), { status: 403 });
  assert.equal(canDeleteHandover({ ...named, receiverEmail: '' }, other), true, 'no receiving account named: anyone may receive, so anyone may delete');
});
