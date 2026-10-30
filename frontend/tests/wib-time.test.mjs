import test from 'node:test';
import assert from 'node:assert/strict';
import { wibParts, wibMinutesOfDay, wibMsOfDay, wibDateString, wibClockLabel, addDaysToDateString, weekdayOfDateString } from '../app/lib/wib.ts';
import { getShiftInfo, getNextShiftChange, getShiftTransitionState } from '../app/lib/shifts.ts';
import { getTodayWIB, getYesterdayWIB, getStartOfWeekWIB, getStartOfLastWeekWIB, getEndOfLastWeekWIB, nowClockLabel, toDateInputValue } from '../app/lib/data.ts';

// 2026-10-29 17:49:20 UTC is 2026-10-30 00:49:20 WIB: the case that was wrong (the UTC date came back as "today")
const NIGHT = new Date('2026-10-29T17:49:20.123Z');

test('the WIB wall clock of an instant, independent of the zone the tests run in', () => {
  assert.deepEqual(wibParts(NIGHT), { year: 2026, month: 10, day: 30, hours: 0, minutes: 49, seconds: 20, milliseconds: 123, weekday: 5 });
  assert.equal(wibDateString(NIGHT), '2026-10-30');
  assert.equal(wibClockLabel(NIGHT), '00:49');
  assert.equal(wibMinutesOfDay(NIGHT), 49);
  assert.equal(wibMsOfDay(new Date('2026-10-29T17:00:00Z')), 0, 'midnight WIB');
  assert.equal(wibMsOfDay(new Date('2026-10-29T16:59:59.999Z')), 86_400_000 - 1);
  assert.equal(wibDateString(new Date('2026-10-31T16:59:59Z')), '2026-10-31');
  assert.equal(wibDateString(new Date('2026-10-31T17:00:00Z')), '2026-11-01');
});

test('date strings move by whole days across month, year and leap days', () => {
  assert.equal(addDaysToDateString('2026-10-31', 1), '2026-11-01');
  assert.equal(addDaysToDateString('2026-01-01', -1), '2025-12-31');
  assert.equal(addDaysToDateString('2028-02-28', 1), '2028-02-29');
  assert.equal(weekdayOfDateString('2026-10-30'), 5);
  assert.equal(weekdayOfDateString('2026-11-01'), 0);
});

test('shifts follow WIB: the shift on duty at 00:49 WIB is Subuh, not what the UTC clock would say', () => {
  assert.equal(getShiftInfo(NIGHT).shortLabel, 'Subuh');
  assert.equal(getShiftInfo(new Date('2026-10-30T01:00:00Z')).shortLabel, 'Pagi', '08:00 WIB');
  assert.equal(getShiftInfo(new Date('2026-10-30T09:00:00Z')).shortLabel, 'Malam', '16:00 WIB');
  assert.equal(getShiftInfo(new Date('2026-10-30T00:59:59Z')).shortLabel, 'Subuh', '07:59 WIB');
  assert.ok(getShiftTransitionState(new Date('2026-10-30T00:50:00Z')), '07:50 WIB');
});

test('the next shift change is the next 08:00, 16:00 or midnight WIB', () => {
  const at = (iso) => getNextShiftChange(new Date(iso)).toISOString();
  assert.equal(at('2026-10-29T17:49:20Z'), '2026-10-30T01:00:00.020Z', '00:49 -> 08:00 WIB');
  assert.equal(at('2026-10-30T02:00:00Z'), '2026-10-30T09:00:00.020Z', '09:00 -> 16:00 WIB');
  assert.equal(at('2026-10-30T10:00:00Z'), '2026-10-30T17:00:00.020Z', '17:00 -> midnight WIB');
  assert.equal(at('2026-10-30T16:59:59Z'), '2026-10-30T17:00:00.020Z', '23:59:59 -> midnight WIB');
});

test('"today" and the weeks around it are WIB dates', () => {
  const real = Date;
  try {
    globalThis.Date = class extends real { constructor(...args) { super(...(args.length ? args : [NIGHT.getTime()])); } static now() { return NIGHT.getTime(); } };
    assert.equal(getTodayWIB(), '2026-10-30', 'it was 2026-10-29 before the fix');
    assert.equal(getYesterdayWIB(), '2026-10-29');
    assert.equal(getStartOfWeekWIB(), '2026-10-26', 'Monday of that week');
    assert.equal(getStartOfLastWeekWIB(), '2026-10-19');
    assert.equal(getEndOfLastWeekWIB(), '2026-10-25');
    assert.equal(nowClockLabel(), '00:49');
    assert.equal(toDateInputValue(), '2026-10-30');
  } finally { globalThis.Date = real; }
});
