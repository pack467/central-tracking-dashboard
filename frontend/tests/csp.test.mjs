import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentSecurityPolicy, newNonce, originOf, isHttpsUrl } from '../app/lib/csp.ts';

const directive = (policy, name) => policy.split('; ').find(part => part.startsWith(name + ' '));

test('scripts need the nonce of the response; inline scripts without it are not allowed', () => {
  const policy = buildContentSecurityPolicy({ nonce: 'abc123==' });
  assert.equal(directive(policy, 'script-src'), "script-src 'self' 'nonce-abc123=='");
  assert.ok(!/script-src[^;]*unsafe-inline/.test(policy), "script-src has no 'unsafe-inline'");
  assert.ok(!/unsafe-eval/.test(policy));
  assert.ok(directive(policy, 'object-src').includes("'none'"));
  assert.ok(directive(policy, 'frame-ancestors').includes("'none'"));
  assert.ok(directive(policy, 'base-uri').includes("'self'"));
  assert.ok(directive(policy, 'form-action').includes("'self'"));
});

test('connections go to this site and the API origin only, and https is enforced only for an https site', () => {
  assert.equal(directive(buildContentSecurityPolicy({ nonce: 'n' }), 'connect-src'), "connect-src 'self'");
  assert.equal(directive(buildContentSecurityPolicy({ nonce: 'n', apiOrigin: 'https://api.example.id' }), 'connect-src'), "connect-src 'self' https://api.example.id");
  assert.ok(!buildContentSecurityPolicy({ nonce: 'n' }).includes('upgrade-insecure-requests'), 'plain http / LAN builds are not broken');
  assert.ok(buildContentSecurityPolicy({ nonce: 'n', httpsSite: true }).includes('upgrade-insecure-requests'));
});

test('every nonce is new and has no characters that need escaping', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const nonce = newNonce();
    assert.match(nonce, /^[A-Za-z0-9+/]{22}==$/, nonce);
    seen.add(nonce);
  }
  assert.equal(seen.size, 200);
});

test('origins and https detection from build values', () => {
  assert.equal(originOf('https://api.example.id/v1/x?y=1'), 'https://api.example.id');
  assert.equal(originOf('http://localhost:3001'), 'http://localhost:3001');
  assert.equal(originOf(''), '');
  assert.equal(originOf(undefined), '');
  assert.equal(originOf('not a url'), '');
  assert.equal(isHttpsUrl('https://x.example'), true);
  assert.equal(isHttpsUrl('http://x.example'), false);
  assert.equal(isHttpsUrl(undefined), false);
});
