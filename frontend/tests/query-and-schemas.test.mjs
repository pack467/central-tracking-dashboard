import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRetry, retryDelay } from '../app/lib/query-client.ts';
import { ApiError } from '../app/lib/api/errors.ts';
import { authUserSchema, backendTicketSchema, parseResponse, ticketPageSchema } from '../app/lib/api/schemas.ts';

const api = (status, code) => new ApiError({ status, message: 'x', code });

test('retry: network, timeout, 429 and 5xx are asked again, up to three times', () => {
  for (const error of [new TypeError('fetch failed'), api(0, 'NETWORK_ERROR'), api(408), api(429), api(500), api(503)]) {
    assert.equal(shouldRetry(0, error), true, String(error.status ?? error.message));
    assert.equal(shouldRetry(3, error), false, 'not a fourth time');
  }
});

test('retry: other 4xx, "not connected" and a wrongly shaped answer are not asked again', () => {
  for (const error of [api(400), api(401), api(403), api(404), api(422), api(501, 'NOT_CONNECTED'), api(502, 'INVALID_RESPONSE')]) assert.equal(shouldRetry(0, error), false, String(error.status));
  const aborted = new Error('aborted'); aborted.name = 'AbortError';
  assert.equal(shouldRetry(0, aborted), false);
});

test('retry delay: the server Retry-After when known, else 5 s, 15 s, 45 s (plus under a second of jitter)', () => {
  const withRetryAfter = new ApiError({ status: 429, message: 'x', retryAfterMs: 20000 });
  assert.ok(retryDelay(0, withRetryAfter) >= 20000 && retryDelay(0, withRetryAfter) < 21000);
  assert.ok(retryDelay(0, api(500)) >= 5000 && retryDelay(0, api(500)) < 6000);
  assert.ok(retryDelay(2, api(500)) >= 45000 && retryDelay(9, api(500)) < 46000);
});

const ticket = { id: '7', project_id: '2', subject: 'Queue penuh', status: 'Open', open_at: '2026-10-31T01:00:00Z' };

test('schemas: missing optional fields become null, numeric ids become strings, extra fields are kept', () => {
  const parsed = backendTicketSchema.parse({ ...ticket, id: 7, project_id: 2, added_later: 'kept' });
  assert.equal(parsed.id, '7');
  assert.equal(parsed.project_id, '2');
  assert.equal(parsed.description, null);
  assert.equal(parsed.closed_at, null);
  assert.equal(parsed.created_at, '');
  assert.equal(parsed.added_later, 'kept');
  assert.deepEqual(authUserSchema.parse({ id: '12' }).permissions, []);
});

test('schemas: an answer of another shape is an INVALID_RESPONSE error naming what was asked for, without the values', () => {
  const warn = console.warn; const logged = []; console.warn = (...args) => logged.push(args);
  try {
    assert.throws(() => parseResponse(ticketPageSchema, { data: [{ ...ticket, subject: 42 }], meta: { page: 1, limit: 100, total: 1, total_pages: 1 } }, 'daftar tiket'),
      error => error instanceof ApiError && error.code === 'INVALID_RESPONSE' && error.status === 502 && error.message.includes('daftar tiket'));
    assert.throws(() => parseResponse(ticketPageSchema, [ticket], 'daftar tiket'), error => error.code === 'INVALID_RESPONSE', 'a plain array is not a page');
    assert.ok(!JSON.stringify(logged).includes('Queue penuh'), 'the console gets paths and messages, never the data');
  } finally { console.warn = warn; }
});
