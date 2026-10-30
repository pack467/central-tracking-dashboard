import test from 'node:test';
import assert from 'node:assert/strict';
import { slaTargetFor, isTicketDone, ticketDateOf, slaStatus, slaCompliance, newestFirst, normalizeName, matchesPerson, periodCounts, previousMonthKey, weekStartOf, SLA_MINUTES } from '../app/lib/ticket-metrics.ts';

test('a ticket is done when Closed or when it has a completion time', () => {
  assert.equal(isTicketDone({ status: 'Closed' }), true);
  assert.equal(isTicketDone({ status: 'ditutup' }), true);
  assert.equal(isTicketDone({ status: 'Activity', isStillOpen: false }), true, 'the 122 imported Activity/Meeting tickets with a closed_at');
  assert.equal(isTicketDone({ status: 'Meeting', isStillOpen: false }), true);
  assert.equal(isTicketDone({ status: 'Activity', isStillOpen: true }), false);
  assert.equal(isTicketDone({ status: 'Open' }), false, 'no information: not done');
  assert.equal(isTicketDone({ status: 'Pending' }), false);
});

test('the SLA target follows the severity, unless the ticket brings its own', () => {
  assert.equal(slaTargetFor({ severity: 'Critical' }), SLA_MINUTES.strict);
  assert.equal(slaTargetFor({ severity: 'High' }), 60);
  assert.equal(slaTargetFor({ severity: 'kritis' }), 60);
  assert.equal(slaTargetFor({ severity: 'Medium' }), 120);
  assert.equal(slaTargetFor({ severity: 'Low' }), 120);
  assert.equal(slaTargetFor({ severity: 'whatever' }), 120);
  assert.equal(slaTargetFor({ severity: 'Low', slaTargetMinutes: 45 }), 45);
  assert.equal(slaTargetFor({ severity: 'High', slaTargetMinutes: 0 }), 60, 'a zero target is no target');
});

test('SLA status: nothing is guessed for open tickets or tickets without a duration', () => {
  const done = { status: 'Closed', severity: 'Medium' };
  assert.equal(slaStatus({ ...done, resolutionMinutes: 120 }), 'met', 'exactly the target is met');
  assert.equal(slaStatus({ ...done, resolutionMinutes: 121 }), 'breached');
  assert.equal(slaStatus({ ...done, severity: 'High', resolutionMinutes: 90 }), 'breached', 'High has 60 minutes');
  assert.equal(slaStatus({ status: 'Open', severity: 'Low' }), 'pending');
  assert.equal(slaStatus({ status: 'Open', severity: 'Low', resolutionMinutes: 5 }), 'pending', 'not done yet');
  assert.equal(slaStatus({ ...done }), 'pending', 'closed but no duration');
  assert.equal(slaStatus({ status: 'Activity', isStillOpen: false, severity: 'Low', resolutionMinutes: 30 }), 'met');
});

test('compliance counts only evaluated tickets and is null when there are none', () => {
  const list = [
    { status: 'Closed', severity: 'Low', resolutionMinutes: 100 },
    { status: 'Closed', severity: 'Low', resolutionMinutes: 300 },
    { status: 'Open', severity: 'Low' },
    { status: 'Closed', severity: 'Low' },
  ];
  assert.deepEqual(slaCompliance(list), { rate: 50, evaluated: 2, met: 1 });
  assert.deepEqual(slaCompliance([{ status: 'Open', severity: 'Low' }]), { rate: null, evaluated: 0, met: 0 });
  assert.deepEqual(slaCompliance([]), { rate: null, evaluated: 0, met: 0 });
});

test('a ticket without a day has no day (no made-up date)', () => {
  assert.equal(ticketDateOf({ date: '2026-09-30', created: '10:00' }), '2026-09-30');
  assert.equal(ticketDateOf({ created: '2026-09-29T10:00:00Z' }), '2026-09-29');
  assert.equal(ticketDateOf({ created: '10:00' }), '');
  assert.equal(ticketDateOf({ created: '' }), '');
});

test('newest first sorts by day, then by time', () => {
  const list = [{ date: '2026-09-29', created: '23:00' }, { date: '2026-09-30', created: '08:00' }, { date: '2026-09-30', created: '17:30' }];
  assert.deepEqual([...list].sort(newestFirst).map(t => `${t.date} ${t.created}`), ['2026-09-30 17:30', '2026-09-30 08:00', '2026-09-29 23:00']);
});

test('names match exactly after normalising, never by "contains"', () => {
  assert.equal(normalizeName('  Mhd.  Galih   Khairi '), 'galih khairi');
  assert.equal(normalizeName('M. Galih Khairi'), 'galih khairi');
  assert.equal(normalizeName(undefined), '');
  const person = { id: '7', name: 'Ade Yuri F. Damanik' };
  assert.equal(matchesPerson({ owner: 'Ade Yuri F. Damanik' }, person), true);
  assert.equal(matchesPerson({ owner: 'ade yuri f. damanik' }, person), true);
  assert.equal(matchesPerson({ owner: 'Ade' }, person), false, 'a first name alone is not the person');
  assert.equal(matchesPerson({ owner: 'Ade Yuri F. Damanik Jr' }, person), false);
  assert.equal(matchesPerson({ owner: '' }, person), false, 'an empty owner matches nobody');
  assert.equal(matchesPerson({ owner: '—' }, person), false);
  assert.equal(matchesPerson({ owner: 'Someone', ownerIds: ['7'] }, person), true, 'the id wins');
  assert.equal(matchesPerson({ owner: 'Ade Yuri F. Damanik', ownerIds: ['9'] }, { name: 'Ade Yuri F. Damanik' }), true);
  assert.equal(matchesPerson({ owner: 'X', owners: ['Y', 'Ade Yuri F. Damanik'] }, person), true, 'any of several owners');
  assert.equal(matchesPerson({ owner: 'Ade' }, { name: '' }), false);
});

test('period counts: today, this month and this year by the ticket day, per project', () => {
  const list = [
    { date: '2026-10-30', created: '09:00', project: 'SM' },
    { date: '2026-10-30', created: '10:00', project: 'APH' },
    { date: '2026-10-04', created: '10:00', project: 'SM' },
    { date: '2026-09-30', created: '10:00', project: 'SM' },
    { date: '2025-12-31', created: '10:00', project: 'SM' },
    { created: '10:00', project: 'SM' },
  ];
  const counts = periodCounts(list, '2026-10-30');
  assert.deepEqual([counts.today, counts.month, counts.year, counts.total], [2, 3, 4, 6], 'the ticket without a day is only in the total');
  assert.deepEqual(counts.byProject.today, { SM: 1, APH: 1 });
  assert.deepEqual(counts.byProject.month, { SM: 2, APH: 1 });
  assert.deepEqual(counts.byProject.year, { SM: 3, APH: 1 });
  assert.deepEqual(counts.byProject.total, { SM: 5, APH: 1 });
  assert.deepEqual(periodCounts([], '2026-10-30'), { today: 0, week: 0, month: 0, year: 0, total: 0, byProject: { today: {}, week: {}, month: {}, year: {}, total: {} } }, 'no tickets: zeros, not made-up baselines');
});

test('this week runs Monday to today (WIB), across a month boundary', () => {
  // 30 Oct 2026 is a Friday: the week started on Monday 26 Oct
  assert.equal(weekStartOf('2026-10-30'), '2026-10-26');
  assert.equal(weekStartOf('2026-10-26'), '2026-10-26', 'a Monday is its own week start');
  assert.equal(weekStartOf('2026-11-01'), '2026-10-26', 'a Sunday belongs to the week before');
  const list = [
    { date: '2026-10-25', created: '23:00', project: 'SM' }, // Sunday before: not this week
    { date: '2026-10-26', created: '00:30', project: 'SM' },
    { date: '2026-10-29', created: '10:00', project: 'APH' },
  ];
  assert.equal(periodCounts(list, '2026-10-30').week, 2);
  assert.equal(periodCounts([{ date: '2026-09-29', created: '10:00', project: 'SM' }], '2026-10-01').week, 1, 'a week that started in the previous month');
});

test('the month before', () => {
  assert.equal(previousMonthKey('2026-10'), '2026-09');
  assert.equal(previousMonthKey('2026-01'), '2025-12');
});
