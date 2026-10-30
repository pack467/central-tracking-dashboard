import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProductionEnv, parseEnvFile } from '../scripts/check-production-env.mjs';

const PRODUCTION = { CTD_DEPLOY_ENV: 'production', NEXT_PUBLIC_USE_MOCK: 'false', NEXT_PUBLIC_API_URL: 'https://ctd.example.id', NEXT_PUBLIC_SITE_URL: 'https://ctd.example.id' };
const messages = result => [...result.errors, ...result.warnings].join('\n');

test('a correct production environment passes', () => {
  const result = checkProductionEnv(PRODUCTION);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  const hybrid = checkProductionEnv({ ...PRODUCTION, NEXT_PUBLIC_USE_MOCK: 'true', NEXT_PUBLIC_API_MODULES: 'auth, tickets,people,roles' });
  assert.deepEqual(hybrid.errors, []);
});

test('production builds refuse the demo login, a missing login, a missing or insecure API address', () => {
  assert.match(checkProductionEnv({ ...PRODUCTION, NEXT_PUBLIC_ALLOW_DEMO_LOGIN: 'true' }).errors.join(), /DEMO_LOGIN/);
  assert.match(checkProductionEnv({ ...PRODUCTION, HANDOVER_SIMULATED_ACTOR: 'true' }).errors.join(), /HANDOVER_SIMULATED_ACTOR/);
  assert.match(checkProductionEnv({ CTD_DEPLOY_ENV: 'production' }).errors.join(), /No login through the backend/, 'nothing set: mock only');
  assert.match(checkProductionEnv({ ...PRODUCTION, NEXT_PUBLIC_API_URL: '' }).errors.join(), /API_URL is empty/);
  assert.match(checkProductionEnv({ ...PRODUCTION, NEXT_PUBLIC_API_URL: 'http://api.example.id' }).errors.join(), /https/);
  assert.match(checkProductionEnv({ ...PRODUCTION, NEXT_PUBLIC_LOCAL_TEST_PASSWORD: 'x' }).errors.join(), /LOCAL_TEST/);
  assert.match(checkProductionEnv({ ...PRODUCTION, NEXT_PUBLIC_USE_MOCK: 'true', NEXT_PUBLIC_API_MODULES: 'tickets' }).errors.join(), /without auth/);
});

test('production needs the https address users open (HSTS and the http-to-https redirect depend on it)', () => {
  assert.match(checkProductionEnv({ ...PRODUCTION, NEXT_PUBLIC_SITE_URL: '' }).errors.join(), /SITE_URL must be the https/);
  assert.match(checkProductionEnv({ ...PRODUCTION, NEXT_PUBLIC_SITE_URL: 'http://ctd.example.id' }).errors.join(), /SITE_URL must be the https/);
  assert.match(checkProductionEnv({ NEXT_PUBLIC_SITE_URL: 'ctd.example.id' }).errors.join(), /SITE_URL is not a URL/, 'never right, any environment');
  assert.deepEqual(checkProductionEnv({ NEXT_PUBLIC_USE_MOCK: 'false', NEXT_PUBLIC_API_URL: 'http://localhost:3001' }).errors, [], 'outside production a missing site address is a warning');
});

test('without CTD_DEPLOY_ENV the same problems are only warnings', () => {
  const result = checkProductionEnv({ NEXT_PUBLIC_ALLOW_DEMO_LOGIN: 'true' });
  assert.deepEqual(result.errors, []);
  assert.match(result.warnings.join(), /DEMO_LOGIN/);
  assert.equal(result.strict, false);
});

test('mistakes that are never right fail in every environment', () => {
  assert.match(checkProductionEnv({ NEXT_PUBLIC_USE_MOCK: 'true', NEXT_PUBLIC_API_MODULES: 'auth,ticket' }).errors.join(), /unknown names: ticket/);
  assert.match(checkProductionEnv({ NEXT_PUBLIC_API_URL: 'localhost:3001' }).errors.join(), /not a URL/);
  assert.deepEqual(checkProductionEnv({ NEXT_PUBLIC_USE_MOCK: 'false', NEXT_PUBLIC_API_URL: 'http://localhost:3001' }).errors, [], 'a local backend is fine outside production');
});

test('env files: comments, quotes and spaces', () => {
  const parsed = parseEnvFile('# c\nA=1\n  B = "two words" \nC=\'x\'\nexport F=6\n#D=4\nnot a line\nE=a=b\n');
  assert.deepEqual(parsed, { A: '1', B: 'two words', C: 'x', F: '6', E: 'a=b' });
  assert.equal(messages(checkProductionEnv({})).includes('undefined'), false);
});
