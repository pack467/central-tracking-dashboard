import test from 'node:test';
import assert from 'node:assert/strict';
import { dateFilterMatches, dateFilterToPickerValue, pickerValueToDateFilter, dateFilterLabel, lastSevenDaysFilter } from '../app/lib/date-filter.ts';
import { dashboardSchema, parseQuery, serializeQuery } from '../app/lib/query-state.ts';

const TODAY = '2026-10-30';

test('"today" matches only today, whatever the URL says', () => {
  assert.equal(dateFilterMatches('today', '2026-10-30', TODAY), true);
  assert.equal(dateFilterMatches('today', '2026-10-29', TODAY), false);
  assert.equal(dateFilterMatches('today', '2026-10-31', TODAY), false);
  // after midnight the same filter follows the new day
  assert.equal(dateFilterMatches('today', '2026-10-31', '2026-10-31'), true);
  assert.equal(dateFilterMatches('today', '2026-10-30', '2026-10-31'), false);
});

test('"all" and an empty filter match every ticket', () => {
  for (const filter of ['all', '']) for (const day of ['2025-05-22', TODAY, '2030-01-01']) assert.equal(dateFilterMatches(filter, day, TODAY), true, `${filter}|${day}`);
});

test('one day and ranges include both ends', () => {
  assert.equal(dateFilterMatches('2026-09-30', '2026-09-30', TODAY), true);
  assert.equal(dateFilterMatches('2026-09-30', '2026-10-01', TODAY), false);
  assert.equal(dateFilterMatches('2026-09-01..2026-09-30', '2026-09-01', TODAY), true);
  assert.equal(dateFilterMatches('2026-09-01..2026-09-30', '2026-09-30', TODAY), true);
  assert.equal(dateFilterMatches('2026-09-01..2026-09-30', '2026-08-31', TODAY), false);
  assert.equal(dateFilterMatches('2026-09-01..2026-09-30', '2026-10-01', TODAY), false);
  assert.equal(dateFilterMatches('2026-09-01..', '2030-01-01', TODAY), true, 'open end');
  assert.equal(dateFilterMatches('..2026-09-30', '2020-01-01', TODAY), true, 'open start');
});

test('the picker and the filter translate into each other without leaving "today" in the URL', () => {
  assert.equal(dateFilterToPickerValue('today', TODAY), TODAY);
  assert.equal(dateFilterToPickerValue('all', TODAY), '');
  assert.equal(dateFilterToPickerValue('2026-09-01..2026-09-30', TODAY), '2026-09-01..2026-09-30');
  assert.equal(pickerValueToDateFilter('', TODAY), 'all', 'cleared picker = all time');
  assert.equal(pickerValueToDateFilter(TODAY, TODAY), 'today', 'picking today is the default again');
  assert.equal(pickerValueToDateFilter('2026-09-30', TODAY), '2026-09-30');
  assert.equal(pickerValueToDateFilter(`${TODAY}..${TODAY}`, TODAY), `${TODAY}..${TODAY}`);
});

test('labels and the 7-day shortcut', () => {
  assert.equal(dateFilterLabel('today', TODAY), 'Hari Ini — 2026-10-30');
  assert.equal(dateFilterLabel('all', TODAY), 'Semua Waktu');
  assert.equal(dateFilterLabel('2026-09-01..2026-09-30', TODAY), '2026-09-01 s/d 2026-09-30');
  assert.equal(dateFilterLabel('2026-09-30', TODAY), '2026-09-30');
  assert.equal(lastSevenDaysFilter('2026-10-30'), '2026-10-24..2026-10-30');
  assert.equal(lastSevenDaysFilter('2026-01-03'), '2025-12-28..2026-01-03');
});

test('the dashboard URL: no date means today, and only a different choice is written', () => {
  const schema = dashboardSchema(['SM', 'APH']);
  const read = query => parseQuery(schema, new URLSearchParams(query)).date;
  assert.equal(read(''), 'today', 'a plain /dashboard is today');
  assert.equal(read('date=today'), 'today');
  assert.equal(read('date=all'), 'all');
  assert.equal(read('date=2026-09-30'), '2026-09-30');
  assert.equal(read('date=2026-09-30..2026-09-01'), '2026-09-01..2026-09-30', 'a reversed range is put in order');
  for (const bad of ['date=', 'date=yesterday', 'date=2026-13-40', 'date=2026-09-01..nonsense', 'date=a..b..c']) assert.equal(read(bad), 'today', bad);
  // what is written back
  assert.equal(serializeQuery(schema, { date: 'today' }), '', 'today is the default: nothing in the URL');
  assert.equal(serializeQuery(schema, { date: 'all' }), 'date=all');
  assert.equal(serializeQuery(schema, { date: '2026-09-01..2026-09-30' }), 'date=2026-09-01..2026-09-30');
  // the other dashboard filters are untouched
  assert.equal(parseQuery(schema, new URLSearchParams('project=SM&shift=Pagi')).project, 'SM');
});
