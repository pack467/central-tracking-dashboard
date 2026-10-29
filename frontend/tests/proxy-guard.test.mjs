import test from 'node:test';
import assert from 'node:assert/strict';
import { loginRedirect } from '../app/lib/auth-guard.ts';

test('with the guard on, an app page without the session cookie goes to /login and remembers where it was', () => {
  for (const path of ['/dashboard', '/tickets', '/tickets/abc', '/master-data', '/team-roster', '/profile', '/Dashboard/', '/reports/ticket-log']) {
    const target = loginRedirect(path, '', false, true);
    assert.ok(target, path);
    const url = new URL(target, 'http://localhost');
    assert.equal(url.pathname, '/login', path);
    assert.equal(url.searchParams.get('next'), path, path);
  }
  const withQuery = new URL(loginRedirect('/master-data', '?group=team&tab=people', false, true), 'http://localhost');
  assert.equal(withQuery.searchParams.get('next'), '/master-data?group=team&tab=people');
});

test('with the session cookie the page is served', () => {
  assert.equal(loginRedirect('/dashboard', '', true, true), null);
});

test('public pages stay open without a cookie', () => {
  for (const path of ['/login', '/team', '/about', '/offline', '/error/404', '/']) assert.equal(loginRedirect(path, '', false, true), null, path);
});

test('the guard does nothing unless it is switched on', () => {
  assert.equal(loginRedirect('/dashboard', '', false, false), null);
});

test('a hostile path cannot become an open redirect', () => {
  const target = loginRedirect('/dashboard//evil.example', '', false, true);
  const url = new URL(target, 'http://localhost');
  assert.equal(url.origin, 'http://localhost');
  assert.ok(!(url.searchParams.get('next') || '').startsWith('//'));
});
