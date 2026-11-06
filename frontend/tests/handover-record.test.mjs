import test from 'node:test';
import assert from 'node:assert/strict';
import { taskSourceTicketId, taskTicketCode, ticketFromTask } from '../app/lib/handover-ticket.ts';
import { buildDashboardHandoverDraft, restartChecklist, canDeleteHandover, canReceiveHandover, isInHandoverShift, parseHandoverContent, updateHandoverRecord, validateDraft, withCurrentChoices } from '../app/lib/handover.ts';

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
  const draft = { ...record(), date: '2026-10-31', monitoredProjects: 'SM', organization: 'Telkomsel', tasks: [{ id: 1, title: 't', project: 'SM', detail: 'd', state: 'repeat', completed: true, confirmedBy: 'Budi', confirmedAt: '2026-10-31T01:00:00.000Z' }] };
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

test('an accepted note is a record: only its sender and the person who accepted it may delete it', () => {
  const sender = { id: 'u-andi', name: 'Andi', email: 'andi@x.id' };
  const accepted = { ...record(), createdBy: sender, acceptance: { actor: receiver, at: '2026-10-31T01:00:00.000Z' } };
  assert.equal(canDeleteHandover(accepted, sender), true);
  assert.equal(canDeleteHandover(accepted, receiver), true);
  assert.equal(canDeleteHandover(accepted, other), false, 'with no receiving account named, anyone could delete it before');
  assert.equal(canDeleteHandover({ ...accepted, createdBy: undefined }, other), false, 'an old note without a sender is not open to everyone once accepted');
  assert.equal(canDeleteHandover(accepted, null), false);
});

test('a note sent by the browser cannot carry its own ticket lists; stored lists keep only known fields of the right type', () => {
  const forged = [{ id: 'FAKE-1', subject: 'Tiket palsu', status: 'Closed' }];
  const draft = { ...record(), date: '2026-10-31', monitoredProjects: 'SM', organization: 'Telkomsel', openTickets: forged, closedTickets: forged };
  const validated = save(validateDraft(draft));
  assert.equal(validated.openTickets, undefined);
  assert.equal(validated.closedTickets, undefined);
  const stored = save({ ...record(), openTickets: [
    { id: 'T-1', subject: 'Queue penuh', status: 'Open', agingHours: 2, extra: 'x', owner: { name: 'nested' } },
    { id: { $ne: 1 }, subject: 'no string id' },
    'not a ticket',
  ] });
  assert.deepEqual(stored.openTickets, [{ id: 'T-1', subject: 'Queue penuh', status: 'Open', agingHours: 2 }]);
});

test('tasks marked Done (completed) or deleted do not appear in the next shift draft, while unfinished tasks carry over', () => {
  let current = parseHandoverContent(JSON.stringify({
    sourceShift: 'Subuh', targetShift: 'Pagi', sourcePic: 'Andi', targetPic: 'Budi', monitoringOwner: 'Andi', monitoringSummary: 's',
    validationNote: 'v', monitoredProjects: ['SM'], findings: [], receiverEmail: '',
    tasks: [
      { id: 1, title: 'Task Selesai', project: 'SM', detail: 'd1', state: 'in-progress', completed: false },
      { id: 2, title: 'Task Belum Selesai', project: 'B2B', detail: 'd2', state: 'waiting', completed: false },
      { id: 3, title: 'Task Salah Input', project: 'DM', detail: 'd3', state: 'in-progress', completed: false },
    ],
  }));
  // Mark task 1 as Done, and delete task 3
  current = updateHandoverRecord(current, receiver, 'task', { taskId: 1, completed: true });
  current = updateHandoverRecord(current, receiver, 'delete-task', { taskId: 3 });
  // Confirm handover even with task 2 still unfinished
  current = updateHandoverRecord(current, receiver, 'confirm', { note: 'OK' });
  assert.ok(current.acceptance, 'handover can be confirmed with unfinished tasks');

  const nextDraft = buildDashboardHandoverDraft({
    tickets: [],
    assessments: {},
    members: [],
    actor: receiver,
    previousRecord: current,
  });
  assert.deepEqual(nextDraft.tasks.map(t => t.title), ['Task Belum Selesai']);
});

test('monitoringCheckpoints with note, shift, and owner survive parseHandoverContent', () => {
  const loaded = save({
    ...record(),
    monitoringCheckpoints: [
      { time: '07:30', project: 'USIEM', task: 'Log audit', verdict: 'nok', note: 'Log tertumpuk', shift: 'Shift Subuh', owner: 'Agnes Siahaan' },
    ],
  });
  assert.deepEqual(loaded.monitoringCheckpoints, [
    { time: '07:30', project: 'USIEM', task: 'Log audit', verdict: 'nok', note: 'Log tertumpuk', shift: 'Shift Subuh', owner: 'Agnes Siahaan' },
  ]);
});

test('any logged-in user can receive and confirm a handover even when receiverEmail is set', () => {
  const sender = { id: 'u-andi', name: 'Andi', email: 'andi@x.id' };
  const named = { ...record(), createdBy: sender, receiverEmail: 'budi@x.id' };
  assert.equal(canReceiveHandover(named, receiver), true);
  assert.equal(canReceiveHandover(named, other), true);
  assert.equal(canReceiveHandover(named, sender), true);
  assert.equal(canReceiveHandover(named, null), false);

  const ticked = updateHandoverRecord(named, other, 'task', { taskId: 1, completed: true });
  assert.equal(ticked.tasks[0].completed, true);
  assert.equal(ticked.tasks[0].confirmedBy, 'Sari');

  const confirmed = updateHandoverRecord(ticked, other, 'confirm', { note: 'Diterima oleh Sari' });
  assert.ok(confirmed.acceptance);
  assert.equal(confirmed.acceptance.actor.name, 'Sari');
});

test('a task keeps its priority when a note is saved and read back; anything else is not kept', () => {
  const draft = { ...record(), date: '2026-10-31', monitoredProjects: 'SM', organization: 'Telkomsel', tasks: [
    { id: 1, title: 't', project: 'SM', detail: 'd', state: 'repeat', priority: 'Critical', completed: false },
    { id: 2, title: 'u', project: 'SM', detail: 'd', state: 'waiting', priority: 'Sangat penting', completed: false },
  ] };
  const saved = save(validateDraft(draft));
  assert.equal(saved.tasks[0].priority, 'Critical');
  assert.equal(saved.tasks[1].priority, undefined);
});

test('a draft follows the form: NOC becomes Umum, Critical becomes High, and the rest is left alone', () => {
  const draft = { tasks: [{ project: 'NOC', priority: 'Critical' }, { project: 'SM', priority: 'Low' }], findings: [{ project: 'NOC' }] };
  const current = withCurrentChoices(draft);
  assert.deepEqual(current.tasks.map(task => [task.project, task.priority]), [['Umum', 'High'], ['SM', 'Low']]);
  assert.equal(current.findings[0].project, 'Umum');
});

test('a note keeps the client or tenant it is for; one without it can still be saved and read', () => {
  const draft = { ...record(), date: '2026-10-31', monitoredProjects: 'SM', organization: 'Telkomsel' };
  assert.equal(save(validateDraft(draft)).organization, 'Telkomsel');
  assert.equal(save(validateDraft({ ...draft, organization: '' })).organization, undefined);
  assert.equal(save(record()).organization, undefined);
});

const madeTicket = { id: '900', code: 'HO-7-1' };

test('a task marked Done with its ticket keeps the ticket when read back, and cannot be undone or deleted', () => {
  const done = save(updateHandoverRecord(record(), receiver, 'task', { taskId: 1, completed: true, ticket: madeTicket }));
  assert.deepEqual([done.tasks[0].completed, done.tasks[0].ticketId, done.tasks[0].ticketCode], [true, '900', 'HO-7-1']);
  assert.throws(() => updateHandoverRecord(done, receiver, 'task', { taskId: 1, completed: false }), /sudah menjadi tiket/);
  assert.throws(() => updateHandoverRecord(done, receiver, 'delete-task', { taskId: 1 }), /sudah menjadi tiket/);
  const again = save(updateHandoverRecord(done, receiver, 'task', { taskId: 1, completed: true, ticket: { id: '901', code: 'X' } }));
  assert.equal(again.tasks[0].ticketId, '900', 'the first ticket stays');
});

test('a ticket reference has to be a real value, and only a ticked task carries one', () => {
  assert.throws(() => updateHandoverRecord(record(), receiver, 'task', { taskId: 1, completed: true, ticket: { id: ' ' } }), /Tiket tugas tidak valid/);
  assert.throws(() => updateHandoverRecord(record(), receiver, 'task', { taskId: 1, completed: true, ticket: 'x' }));
  assert.throws(() => updateHandoverRecord(record(), receiver, 'task', { taskId: 1, completed: true, ticket: { id: 'x'.repeat(201) } }));
  const forged = save({ ...record(), tasks: [{ id: 1, title: 't', project: 'SM', detail: 'd', state: 'repeat', completed: false, ticketId: '900' }] });
  assert.equal(forged.tasks[0].ticketId, undefined);
});

test('a draft cannot claim a ticket, and revising a note keeps only the tickets really made', () => {
  const draft = { ...record(), date: '2026-10-31', monitoredProjects: 'SM', tasks: [{ id: 1, title: 't', project: 'SM', detail: 'd', state: 'repeat', completed: true, ticketId: '666', ticketCode: 'FORGED' }, { id: 2, title: 'u', project: 'SM', detail: 'd', state: 'repeat', completed: true }] };
  const validated = validateDraft(draft);
  assert.equal(save(validated).tasks[0].ticketId, undefined);
  const stored = [{ id: 1, title: 't', project: 'SM', detail: 'd', state: 'repeat', completed: true, confirmedBy: 'Budi', ticketId: '900', ticketCode: 'HO-7-1' }];
  const restarted = restartChecklist(stored, validated.tasks);
  assert.deepEqual([restarted[0].completed, restarted[0].ticketId, restarted[0].confirmedBy], [true, '900', 'Budi']);
  assert.deepEqual([restarted[1].completed, restarted[1].ticketId], [false, undefined]);
});

test('the ticket of a finished task is closed, says where it came from, and its code is the same on every try', () => {
  const task = { id: 3, title: '  Periksa laporan  ', detail: 'Laporan sudah dikirim' };
  const ticket = ticketFromTask({ task, noteId: 7, shifts: 'Pagi → Malam', actorName: 'Budi', clientId: 'tritronik', project: { name: 'SM', backendId: '1' }, severity: 'High', category: 'Others', now: '09:30' });
  assert.equal(ticket.id, taskTicketCode(7, 3));
  assert.equal(ticket.subject, 'Periksa laporan');
  assert.equal(ticket.status, 'Closed');
  assert.equal(ticket.backend.thirdPartyId, 'HO-7-3');
  assert.match(ticket.description, /Laporan sudah dikirim[\s\S]*Shift Pagi → Malam/);
  assert.equal(ticketFromTask({ task: { ...task, title: 'x'.repeat(600), detail: '' }, noteId: 7, shifts: 'a', actorName: 'B', clientId: 'c', project: { name: 'SM' }, severity: 'Low', category: 'Others' }).subject.length, 500);
});

test('a task made from a ticket is recognised, so Done on it makes no other', () => {
  assert.equal(taskSourceTicketId({ sourceRef: 'ticket:86d4' }), '86d4');
  assert.equal(taskSourceTicketId({ sourceRef: 'other:1' }), null);
  assert.equal(taskSourceTicketId({}), null);
});
