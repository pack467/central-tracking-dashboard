import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMomComparison, daysInMonth, formatDeltaPct, monthLabel } from '../app/lib/mom-comparison.ts';

const t = (date, extra = {}) => ({ date, created: '10:00', project: 'SM', status: 'Closed', severity: 'Low', resolutionMinutes: 30, ...extra });

test('this month against the same days of last month', () => {
  const list = [
    t('2026-10-01'), t('2026-10-01'), t('2026-10-04', { project: 'MB' }),
    t('2026-09-01'), t('2026-09-15'), t('2026-09-30', { project: 'MB' }),
    t('2026-08-31'), // two months ago: ignored
  ];
  const mom = buildMomComparison(list, '2026-10-30');
  assert.equal(mom.current.label, 'Oktober 2026');
  assert.equal(mom.previous.label, 'September 2026');
  assert.equal(mom.throughDay, 30);
  assert.equal(mom.current.total, 3);
  assert.equal(mom.previous.total, 3, 'September 1–30: the whole month here');
  assert.equal(mom.previousFullTotal, 3);
});

test('early in the month only the same days of last month count', () => {
  const list = [t('2026-10-03'), t('2026-09-02'), t('2026-09-03'), t('2026-09-20'), t('2026-09-28')];
  const mom = buildMomComparison(list, '2026-10-03');
  assert.equal(mom.throughDay, 3);
  assert.equal(mom.current.total, 1);
  assert.equal(mom.previous.total, 2, 'only 1–3 September');
  assert.equal(mom.previousFullTotal, 4, 'the whole of September is still known, for context');
});

test('days are calendar days; this month stops at today, a shorter month ends early', () => {
  const mom = buildMomComparison([t('2026-03-02'), t('2026-03-02'), t('2026-02-28')], '2026-03-31');
  assert.equal(mom.days.length, 31);
  assert.deepEqual(mom.days[1], { day: 2, curr: 2, prev: 0, currCum: 2, prevCum: 0 });
  assert.equal(mom.days[27].prev, 1, '28 February');
  assert.equal(mom.days[28].prev, null, 'February 2026 has no 29th');
  assert.equal(mom.days[28].prevCum, null);
  const early = buildMomComparison([], '2026-10-05');
  assert.equal(early.days[4].curr, 0, 'today has happened (no ticket yet)');
  assert.equal(early.days[5].curr, null, 'the 6th has not come yet');
  assert.equal(early.days[5].currCum, null);
});

test('done, average resolution and SLA per side; nothing made up when there is nothing', () => {
  const list = [t('2026-10-01', { resolutionMinutes: 20 }), t('2026-10-02', { resolutionMinutes: 200 }), t('2026-10-03', { status: 'Open', resolutionMinutes: undefined })];
  const mom = buildMomComparison(list, '2026-10-30');
  assert.equal(mom.current.resolved, 2);
  assert.equal(mom.current.avgResolution, 110);
  assert.equal(mom.current.slaRate, 50, 'Low: 120 minutes; 20 met, 200 breached');
  assert.equal(mom.previous.avgResolution, null);
  assert.equal(mom.previous.slaRate, null);
});

test('per project, sorted by the bigger month, with the change', () => {
  const list = [t('2026-10-01', { project: 'SM' }), t('2026-09-01', { project: 'SM' }), t('2026-09-02', { project: 'SM' }), t('2026-10-01', { project: 'MB' }), t('2026-10-02', { project: 'L2' })];
  const mom = buildMomComparison(list, '2026-10-30');
  assert.deepEqual(mom.projects, [
    { project: 'SM', curr: 1, prev: 2, delta: -1, deltaPct: -50 },
    { project: 'MB', curr: 1, prev: 0, delta: 1, deltaPct: null },
  ], 'L2 is left out like everywhere else');
});

test('helpers', () => {
  assert.equal(daysInMonth('2026-02'), 28);
  assert.equal(daysInMonth('2024-02'), 29);
  assert.equal(monthLabel('2026-01'), 'Januari 2026');
  assert.equal(formatDeltaPct(54, 442), '−88%');
  assert.equal(formatDeltaPct(12, 10), '+20%');
  assert.equal(formatDeltaPct(5, 0), 'baru');
  assert.equal(formatDeltaPct(0, 0), '0%');
});
