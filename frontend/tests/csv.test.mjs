import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, csvLine } from '../app/lib/csv.ts';

test('text is quoted and its quotes are doubled', () => {
  assert.equal(csvCell('Update RHEL'), '"Update RHEL"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('a;b'), '"a;b"', 'the delimiter stays inside the cell');
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
});

test('a text that would run as a formula is made harmless', () => {
  for (const text of ['=SUM(1+1)', '+1+1', '-2+3', '@SUM(A1)', '\t=1', '\r=1']) {
    assert.ok(csvCell(text).startsWith(`"'`), `${JSON.stringify(text)} gets a leading apostrophe`);
  }
  assert.equal(csvCell('=HYPERLINK("http://x","y")'), '"\'=HYPERLINK(""http://x"",""y"")"');
  assert.equal(csvCell('safe = fine'), '"safe = fine"', 'only the first character counts');
  assert.equal(csvCell('#1234'), '"#1234"');
});

test('numbers and empty values', () => {
  assert.equal(csvCell(120), '120');
  assert.equal(csvCell(-5), '-5', 'a negative number is a number');
  assert.equal(csvCell(0), '0');
  assert.equal(csvCell(NaN), '');
  assert.equal(csvCell(undefined), '');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(''), '""');
});

test('a line joins the cells with the delimiter', () => {
  assert.equal(csvLine(['#1', 120, undefined, '=x']), '"#1";120;;"\'=x"');
  assert.equal(csvLine(['a', 'b'], ','), '"a","b"');
});
