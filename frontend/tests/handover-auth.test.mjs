import test from 'node:test';
import assert from 'node:assert/strict';
import { handoverActor, assertSameOrigin, requestActor } from '../app/lib/handover-auth.ts';

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

test('backend login: the caller is the backend session user, checked with GET /auth/me; no session, no handover', async () => {
  const saved = { modules: process.env.NEXT_PUBLIC_API_MODULES, url: process.env.HANDOVER_BACKEND_URL, env: process.env.NODE_ENV };
  process.env.NEXT_PUBLIC_API_MODULES = 'auth';
  process.env.HANDOVER_BACKEND_URL = 'http://backend.internal:3000/';
  process.env.NODE_ENV = 'development';
  const calls = [];
  const backend = status => async (url, init) => { calls.push({ url, cookie: init.headers.Cookie }); return new Response(JSON.stringify({ id: '12', name: 'Agnes Siahaan', email: 'Agnes@Company.id' }), { status }); };
  const statusOf = async promise => { try { await promise; return 'ok'; } catch (error) { return error.status; } };
  try {
    const request = sid => make('http://localhost:3001/api/handovers', { cookie: `theme=dark; ctd.sid=${sid}; other=1` }, 'GET');
    assert.deepEqual(await requestActor(request('s%3Aabc.sig'), backend(200)), { id: '12', name: 'Agnes Siahaan', email: 'agnes@company.id' });
    assert.deepEqual(calls[0], { url: 'http://backend.internal:3000/auth/me', cookie: 'ctd.sid=s%3Aabc.sig' }, 'only the session cookie is sent');
    await requestActor(request('s%3Aabc.sig'), backend(200));
    assert.equal(calls.length, 1, 'a session confirmed a moment ago is not asked again');
    assert.equal(await statusOf(requestActor(request('s%3Aended'), backend(401))), 401);
    assert.equal(await statusOf(requestActor(make('http://localhost:3001/x', {}, 'GET'), backend(200))), 401, 'development no longer means the built-in operator');
    assert.equal(await statusOf(requestActor(request('s%3Adown'), async () => { throw new TypeError('fetch failed'); })), 503, 'backend unreachable');
    assert.equal(await statusOf(requestActor(make('http://x/y', { 'oai-authenticated-user-id': '1', 'oai-authenticated-user-email': 'boss@x.id' }), backend(200))), 401, 'identity headers do not count');
  } finally {
    for (const [key, value] of [['NEXT_PUBLIC_API_MODULES', saved.modules], ['HANDOVER_BACKEND_URL', saved.url], ['NODE_ENV', saved.env]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
