import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanBundle } from '../scripts/check-bundle.mjs';

function withBundle(files, run) {
  const dir = mkdtempSync(join(tmpdir(), 'ctd-bundle-'));
  try {
    for (const [name, text] of Object.entries(files)) { mkdirSync(join(dir, name, '..'), { recursive: true }); writeFileSync(join(dir, name), text); }
    return run(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('a clean bundle has no findings', () => {
  withBundle({ 'a.js': 'const x = "hello"; // +62 811-0000-012 is the fictional sample number', 'b.css': 'a{color:red}' }, dir => assert.deepEqual(scanBundle(dir), []));
});

test('each kind of leak is found, with the file and a count but never the value', () => {
  const found = withBundle({
    '_next/static/a.js': 'login("password123"); login("password123")',
    'b.js': 'fetch("https://grafana.internal.example.com/api")',
    'c.js': 'mail("someone@tritronik.com")',
    'd.js': 'call("+62 812-3456-789")',
    'e.js': 'connect("10.20.30.40"); connect("192.168.1.10")',
  }, scanBundle);
  const byRule = Object.fromEntries(found.map(item => [item.rule, item]));
  assert.equal(byRule['demo account password'].count, 2);
  assert.equal(byRule['demo account password'].file, '_next/static/a.js');
  assert.ok(byRule['internal host name'] && byRule['company email address'] && byRule['phone number that looks real'] && byRule['private IP address']);
  assert.equal(byRule['private IP address'].count, 2);
  for (const item of found) assert.deepEqual(Object.keys(item).sort(), ['count', 'file', 'rule'], 'no matched text is reported');
});

test('lookalikes are not flagged: version numbers, public addresses, binary files', () => {
  withBundle({ 'v.js': 'const v = "10.10.20"; const ip = "8.8.8.8"; const n = "+62 811-0000-001"', 'logo.png': 'password123' }, dir => assert.deepEqual(scanBundle(dir), []));
});
