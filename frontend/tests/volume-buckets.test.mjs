import test from 'node:test';
import assert from 'node:assert/strict';
import { barCounts, chooseGranularity, bucketVolume, bucketRanges, bucketKeyOf, bucketAxisLabel, bucketTitle, granularityNote, granularityBadge, axisLabelStride, showAxisLabel, maxPointsFor } from '../app/lib/volume-buckets.ts';

const day = (date, counts) => ({ date, created: Object.values(counts).reduce((a, b) => a + b, 0), projectCounts: counts });

test('bar counts per granularity', () => {
  assert.deepEqual(barCounts('2026-09-01', '2026-09-30'), { day: 30, week: 5, month: 1 }, 'September 2026 starts on a Tuesday: 5 Monday weeks');
  assert.deepEqual(barCounts('2026-10-30', '2026-10-30'), { day: 1, week: 1, month: 1 });
  assert.deepEqual(barCounts('2025-08-01', '2026-10-04'), { day: 430, week: 62, month: 15 });
});

test('the finest granularity that fits is chosen', () => {
  assert.equal(chooseGranularity('2026-09-01', '2026-09-30', 50), 'day', 'a month of days fits 50 bars');
  assert.equal(chooseGranularity('2026-07-01', '2026-09-30', 50), 'week', '92 days do not, 14 weeks do');
  assert.equal(chooseGranularity('2025-08-01', '2026-10-04', 50), 'month', '62 weeks do not, 15 months do');
  assert.equal(chooseGranularity('2020-01-01', '2026-10-04', 50), null, '82 months do not fit at all');
});

test('days are summed into weeks and months, gaps become empty bars', () => {
  const days = [day('2026-09-01', { SM: 2, APH: 1 }), day('2026-09-02', { SM: 1 }), day('2026-09-10', { MB: 4 })];
  const daily = bucketVolume(days, 'day');
  assert.equal(daily.length, 10, '1st to 10th, the empty days included');
  assert.deepEqual(daily[4], { date: '2026-09-05', to: '2026-09-05', created: 0, projectCounts: {}, closed: 0, resolutionSum: 0, resolvedCount: 0 });

  const weekly = bucketVolume(days, 'week');
  assert.deepEqual(weekly.map(b => [b.date, b.to, b.created]), [['2026-09-01', '2026-09-06', 4], ['2026-09-07', '2026-09-10', 4]], 'the first week is cut at the 1st, the last at the 10th');
  assert.deepEqual(weekly[0].projectCounts, { SM: 3, APH: 1 });

  const monthly = bucketVolume([day('2026-08-30', { SM: 1 }), day('2026-10-02', { SM: 2 })], 'month');
  assert.deepEqual(monthly.map(b => [b.date, b.to, b.created]), [['2026-08-30', '2026-08-31', 1], ['2026-09-01', '2026-09-30', 0], ['2026-10-01', '2026-10-02', 2]]);
  assert.deepEqual(bucketVolume([], 'week'), []);
});

test('resolution times are summed, so a week\'s average weighs every closed ticket', () => {
  const days = [
    { ...day('2026-09-01', { SM: 3 }), closed: 2, resolutionSum: 60, resolvedCount: 2 },
    { ...day('2026-09-02', { SM: 1 }), closed: 1, resolutionSum: 120, resolvedCount: 1 },
    { ...day('2026-09-08', { SM: 1 }) },
  ];
  const [first, second] = bucketVolume(days, 'week');
  assert.deepEqual([first.closed, first.resolutionSum, first.resolvedCount], [3, 180, 3], '60 min average, not the mean of 30 and 120');
  assert.deepEqual([second.closed, second.resolvedCount], [0, 0], 'a week with no closed ticket has nothing to average');
});

test('ranges and the bucket a day belongs to', () => {
  assert.deepEqual(bucketRanges('2026-09-03', '2026-09-15', 'week'), [{ date: '2026-09-03', to: '2026-09-06' }, { date: '2026-09-07', to: '2026-09-13' }, { date: '2026-09-14', to: '2026-09-15' }]);
  assert.equal(bucketRanges('2026-09-01', '2026-09-30', 'day').length, 30);
  assert.equal(bucketKeyOf('2026-09-04', 'week', '2026-09-03'), '2026-09-03', 'the first, cut week is keyed by the range start');
  assert.equal(bucketKeyOf('2026-09-10', 'week', '2026-09-03'), '2026-09-07');
  assert.equal(bucketKeyOf('2026-09-10', 'month', '2026-08-20'), '2026-09-01');
  assert.equal(bucketKeyOf('2026-08-25', 'month', '2026-08-20'), '2026-08-20');
});

test('axis labels never touch, and the last point always has one', () => {
  assert.equal(axisLabelStride(20, 'day'), 3, '46 px for "09-01" over 20 px steps');
  assert.equal(axisLabelStride(80, 'week'), 1);
  assert.equal(axisLabelStride(0, 'month'), 56, 'no division by zero');
  const shown = Array.from({ length: 10 }, (_, idx) => idx).filter(idx => showAxisLabel(idx, 10, 3));
  assert.deepEqual(shown, [0, 3, 6, 9]);
  const crowded = Array.from({ length: 11 }, (_, idx) => idx).filter(idx => showAxisLabel(idx, 11, 3));
  assert.deepEqual(crowded, [0, 3, 6, 10], '9 would sit next to 10, so it steps aside');
  assert.equal(maxPointsFor(1800, 24), 75);
  assert.equal(maxPointsFor(100, 24), 7, 'never fewer than 7');
});

test('a year boundary', () => {
  const weekly = bucketVolume([day('2025-12-31', { SM: 1 }), day('2026-01-05', { SM: 1 })], 'week');
  assert.deepEqual(weekly.map(b => [b.date, b.to]), [['2025-12-31', '2026-01-04'], ['2026-01-05', '2026-01-05']]);
  const monthly = bucketVolume([day('2025-12-15', { SM: 1 }), day('2026-01-15', { SM: 1 })], 'month');
  assert.deepEqual(monthly.map(b => b.date), ['2025-12-15', '2026-01-01']);
});

test('labels', () => {
  const [week] = bucketVolume([day('2026-09-28', { SM: 1 }), day('2026-10-04', { SM: 1 })], 'week');
  assert.equal(bucketAxisLabel(week, 'week'), '28 Sep');
  assert.equal(bucketTitle(week, 'week'), '28 Sep – 4 Okt 2026');
  const [d] = bucketVolume([day('2026-09-30', { SM: 1 })], 'day');
  assert.equal(bucketAxisLabel(d, 'day'), '09-30');
  assert.equal(bucketTitle(d, 'day'), '2026-09-30');
  const months = bucketVolume([day('2026-08-30', { SM: 1 }), day('2026-10-31', { SM: 1 })], 'month');
  assert.equal(bucketAxisLabel(months[1], 'month'), 'Sep 26');
  assert.equal(bucketTitle(months[1], 'month'), 'September 2026', 'a whole month');
  assert.equal(bucketTitle(months[0], 'month'), 'Agustus 2026 (30 Agu – 31 Agu)', 'a month cut by the range');
  assert.equal(bucketTitle(months[2], 'month'), 'Oktober 2026');
  const [crossing] = bucketVolume([day('2025-12-31', { SM: 1 }), day('2026-01-02', { SM: 1 })], 'week');
  assert.equal(bucketTitle(crossing, 'week'), '31 Des 2025 – 2 Jan 2026');
  assert.equal(granularityNote('2026-07-01', '2026-09-30', 'week'), '92 hari dikelompokkan per minggu (Senin–Minggu) agar grafik tetap terbaca.');
  assert.equal(granularityNote('2025-05-01', '2026-10-04', 'month'), '522 hari dikelompokkan per bulan agar grafik tetap terbaca.');
  assert.equal(granularityNote('2026-09-01', '2026-09-30', 'day'), '30 hari, satu titik per hari.');
  assert.equal(granularityBadge('day'), 'Per hari');
  assert.equal(granularityBadge('week'), 'Per minggu');
  assert.equal(granularityBadge('month'), 'Per bulan');
});
