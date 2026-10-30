import test from 'node:test';
import assert from 'node:assert/strict';
import { durationScale, niceStep, wholeStep } from '../app/lib/chart-scale.ts';

test('steps are round numbers', () => {
  assert.deepEqual([14, 32, 48, 80, 366, 1, 0.3].map(niceStep), [20, 50, 50, 100, 500, 1, 0.5]);
  assert.equal(niceStep(0), 1);
  assert.equal(niceStep(NaN), 1);
});

test('ordinary data keeps the familiar 0-100 axis', () => {
  const scale = durationScale(70);
  assert.deepEqual(scale.ticks, [0, 20, 40, 60, 80, 100]);
  assert.equal(scale.yMax, 100);
  assert.equal(scale.broken, false);
  assert.equal(scale.ratio(60), 0.6);
  assert.equal(scale.ratio(0), 0);
});

test('moderately larger data stays linear with few round ticks', () => {
  for (const max of [101, 160, 240]) {
    const scale = durationScale(max);
    assert.equal(scale.broken, false, String(max));
    assert.ok(scale.ticks.length <= 7, `${max}: ${scale.ticks.length} ticks`);
    assert.ok(scale.yMax >= max);
    assert.equal(scale.ratio(scale.yMax), 1);
  }
});

test('a 1,220-minute outlier no longer gives dozens of ticks, and the SLA lines stay apart', () => {
  const scale = durationScale(1220);
  assert.equal(scale.broken, true);
  assert.ok(scale.ticks.length <= 9, `ticks: ${scale.ticks.join(',')}`);
  assert.deepEqual(scale.ticks.slice(0, 4), [0, 30, 60, 120]);
  assert.ok(scale.ticks.every((tick, index) => index === 0 || tick > scale.ticks[index - 1]), 'ticks go up');
  assert.ok(scale.ticks.every(tick => tick <= scale.yMax));
  assert.equal(scale.ratio(1220) <= 1 && scale.ratio(scale.yMax), 1);
  // 60m and 120m must be far enough apart for their tags (about 16 px of a 194 px plot)
  assert.ok((scale.ratio(120) - scale.ratio(60)) * 194 >= 20, 'SLA tags do not overlap');
  assert.ok(scale.ratio(120) > 0.5 && scale.ratio(120) < 0.6, 'the readable band keeps more than half the height');
});

test('the scale never goes backwards and never leaves the plot', () => {
  for (const max of [0, 50, 99, 100, 240, 241, 600, 1220, 5000, 100000]) {
    const scale = durationScale(max);
    let previous = -1;
    for (const minutes of [0, 10, 59, 60, 61, 90, 119, 120, 121, 300, 1000, max, max * 2, -5, NaN]) {
      const value = scale.ratio(minutes);
      assert.ok(value >= 0 && value <= 1, `${max}: ${minutes} -> ${value}`);
    }
    for (let minutes = 0; minutes <= scale.yMax; minutes += Math.max(1, scale.yMax / 200)) {
      const value = scale.ratio(minutes);
      assert.ok(value >= previous - 1e-12, `${max}: not monotonic at ${minutes}`);
      previous = value;
    }
    assert.ok(scale.ticks.length <= 10, `${max}: ${scale.ticks.length} ticks`);
  }
});

test('bad input gives the default axis', () => {
  assert.equal(durationScale(NaN).yMax, 100);
  assert.equal(durationScale(-10).yMax, 100);
});

test('ticket counts get whole-number round steps', () => {
  // raw values are "largest count / 4", as the chart asks for them
  assert.deepEqual([0, 1, 4, 6.5, 9 / 4, 14 / 4, 26 / 4, 40 / 4, 120 / 4, 700 / 4].map(wholeStep), [1, 1, 5, 10, 5, 5, 10, 10, 50, 200]);
  assert.equal(wholeStep(NaN), 1);
  // the shift traffic chart: 26 tickets -> ticks 0,10,20,30 (not 0,7,14,21,26)
  const step = wholeStep(26 / 4), yMax = Math.ceil(26 / step) * step;
  assert.deepEqual([step, yMax], [10, 30]);
});
