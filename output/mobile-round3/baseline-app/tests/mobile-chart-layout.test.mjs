import test from 'node:test';
import assert from 'node:assert/strict';
import { placeChartCallout } from '../app/lib/chart-layout.ts';

const bounds = { x: 42, y: 6, width: 202, height: 200 };
const inside = box => box.x >= bounds.x && box.y >= bounds.y && box.x + box.width <= bounds.x + bounds.width && box.y + box.height <= bounds.y + bounds.height;
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

test('callouts remain inside the plot at every corner and beyond its edges', () => {
  for (const x of [-100, 42, 100, 244, 1000]) for (const y of [-100, 6, 100, 206, 1000]) {
    const box = placeChartCallout(x, y, 72, 22, bounds);
    assert.ok(box && inside(box));
  }
});

test('a peak and low callout avoid both SLA labels and each other', () => {
  const occupied = [{ x: 162, y: 70, width: 82, height: 24 }, { x: 162, y: 20, width: 82, height: 24 }];
  const peak = placeChartCallout(230, 90, 72, 22, bounds, occupied);
  assert.ok(peak && inside(peak));
  assert.ok(occupied.every(box => !overlaps(box, peak)));
  const low = placeChartCallout(230, 110, 68, 22, bounds, [...occupied, peak]);
  assert.ok(low && inside(low));
  assert.ok([...occupied, peak].every(box => !overlaps(box, low)));
});

test('omit a callout when the plot cannot fit it or is fully occupied', () => {
  assert.equal(placeChartCallout(50, 50, 300, 22, bounds), null);
  assert.equal(placeChartCallout(50, 50, 72, 22, bounds, [bounds]), null);
});
