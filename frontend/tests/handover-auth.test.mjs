import test from 'node:test';
import assert from 'node:assert/strict';
import { handoverActor, assertSameOrigin } from '../app/lib/handover-auth.ts';

const ENV = ['NODE_ENV', 'HANDOVER_TRUST_OAI_HEADERS', 'HANDOVER_SIMULATED_ACTOR', 'HANDOVER_ALLOWED_ORIGINS', 'TRUST_FORWARDED_HEADERS'];
const make = (url, headers = {}, method = 'POST') => new Request(url, { method, headers });
const withEnv = (env, fn) => {
  const saved = Object.fromEntries(ENV.map(key => [key, process.env[key]]));
  for (const key of ENV) delete process.env[key];
  Object.assign(process.env, env);
  try { return fn(); } finally { for (const key of ENV) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } }
};
const status = fn => { try { fn(); return 'ok'; } catch (error) { return error.status; } };

test('production: identity headers sent by a visitor are ignored, so nobody can claim to be someone', () => {
  withEnv({ NODE_ENV: 'production' }, () => {
    const forged = make('https://app.example.com/api/handovers', { 'oai-authenticated-user-id': '1', 'oai-authenticated-user-email': 'boss@company.id' });
    assert.equal(status(() => handoverActor(forged)), 401);
  });
});

test('production: a forged Host or X-Forwarded-Host (localhost, ngrok) no longer turns on the built-in operator', () => {
  withEnv({ NODE_ENV: 'production' }, () => {
    for (const url of ['http://localhost:3000/api/handovers', 'https://x.ngrok.io/api/handovers', 'http://127.0.0.1/api/handovers'])
      assert.equal(status(() => handoverActor(make(url, { host: 'localhost', 'x-forwarded-host': 'abc.ngrok.app' }))), 401, url);
  });
});

test('identity headers count only when a trusted proxy is declared', () => {
  withEnv({ NODE_ENV: 'production', HANDOVER_TRUST_OAI_HEADERS: 'true' }, () => {
    const actor = handoverActor(make('https://app.example.com/x', { 'oai-authenticated-user-id': '7', 'oai-authenticated-user-email': 'Agnes@Company.id', 'oai-authenticated-user-full-name': 'Agnes%20Siahaan', 'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8' }));
    assert.deepEqual(actor, { id: '7', email: 'agnes@company.id', name: 'Agnes Siahaan' });
    assert.equal(status(() => handoverActor(make('https://app.example.com/x'))), 401, 'no headers, no identity');
  });
});

test('the built-in operator exists in development and for a demo that asks for it, and nowhere else', () => {
  withEnv({ NODE_ENV: 'development' }, () => assert.equal(handoverActor(make('http://localhost:3000/x')).local, true));
  withEnv({ NODE_ENV: 'production', HANDOVER_SIMULATED_ACTOR: 'true' }, () => assert.equal(handoverActor(make('https://demo.example.com/x')).local, true));
  withEnv({ NODE_ENV: 'production' }, () => assert.equal(status(() => handoverActor(make('https://app.example.com/x'))), 401));
});

test('same-origin writes pass; other sites and look-alike origins are refused', () => {
  withEnv({ NODE_ENV: 'production' }, () => {
    const url = 'https://app.example.com/api/handovers';
    assert.equal(status(() => assertSameOrigin(make(url, { origin: 'https://app.example.com' }))), 'ok');
    assert.equal(status(() => assertSameOrigin(make(url, { origin: 'https://evil.example' }))), 403);
    assert.equal(status(() => assertSameOrigin(make(url, { origin: 'https://app.example.com.evil.example' }))), 403, 'includes() used to let this pass');
    assert.equal(status(() => assertSameOrigin(make(url, { origin: 'https://evil.example', 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' }))), 403, 'a forged forwarded host does not help');
    assert.equal(status(() => assertSameOrigin(make(url, { origin: 'null' }))), 403);
    assert.equal(status(() => assertSameOrigin(make(url, { origin: 'https://x.ngrok.io' }))), 403, 'ngrok is no longer a free pass in production');
  });
});

test('a browser that says the request is cross-site is refused even without Origin', () => {
  withEnv({ NODE_ENV: 'production' }, () => {
    const url = 'https://app.example.com/api/handovers';
    assert.equal(status(() => assertSameOrigin(make(url, { 'sec-fetch-site': 'cross-site' }))), 403);
    assert.equal(status(() => assertSameOrigin(make(url, { 'sec-fetch-site': 'same-site' }))), 403);
    assert.equal(status(() => assertSameOrigin(make(url, { 'sec-fetch-site': 'same-origin', origin: 'https://app.example.com' }))), 'ok');
    assert.equal(status(() => assertSameOrigin(make(url))), 'ok', 'a script without browser headers carries no cookies to abuse');
  });
});

test('allowed origins and a trusted reverse proxy are explicit settings', () => {
  withEnv({ NODE_ENV: 'production', HANDOVER_ALLOWED_ORIGINS: 'https://dashboard.example.com, https://ops.example.com' }, () => {
    const url = 'http://internal:3000/api/handovers';
    assert.equal(status(() => assertSameOrigin(make(url, { origin: 'https://ops.example.com' }))), 'ok');
    assert.equal(status(() => assertSameOrigin(make(url, { origin: 'https://other.example.com' }))), 403);
  });
  withEnv({ NODE_ENV: 'production', TRUST_FORWARDED_HEADERS: 'true' }, () => {
    assert.equal(status(() => assertSameOrigin(make('http://internal:3000/x', { origin: 'https://dashboard.example.com', 'x-forwarded-host': 'dashboard.example.com', 'x-forwarded-proto': 'https' }))), 'ok');
  });
  withEnv({ NODE_ENV: 'production' }, () => {
    assert.equal(status(() => assertSameOrigin(make('http://internal:3000/x', { origin: 'https://dashboard.example.com', 'x-forwarded-host': 'dashboard.example.com', 'x-forwarded-proto': 'https' }))), 403, 'forwarded headers are ignored unless trusted');
  });
});
