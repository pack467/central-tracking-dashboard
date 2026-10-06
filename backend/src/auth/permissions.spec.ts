import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  isStrictSubset,
  resolvePermissions,
  parsePermissions,
  serializePermissions,
  type Permission,
} from './permissions.js';

const set = (role: string) => resolvePermissions(DEFAULT_ROLE_PERMISSIONS[role]);

describe('permissions', () => {
  it('nests the default roles strictly: VIEWER < AGENT < TEAM_LEAD < ADMIN < SUPER_ADMIN', () => {
    // The users hierarchy rules rely on this: each role can manage the ones below it only.
    const order = ['VIEWER', 'AGENT', 'TEAM_LEAD', 'ADMIN', 'SUPER_ADMIN'];
    for (let i = 0; i < order.length - 1; i++) {
      expect(isStrictSubset(set(order[i]), set(order[i + 1]))).toBe(true);
      expect(isStrictSubset(set(order[i + 1]), set(order[i]))).toBe(false);
    }
  });

  it('gives SUPER_ADMIN every permission through the "*" wildcard', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN).toEqual(['*']);
    expect(set('SUPER_ADMIN')).toEqual(new Set(ALL_PERMISSIONS));
  });

  it('expands "*" to every permission, whatever else is listed', () => {
    expect(parsePermissions('["*"]')).toEqual(new Set(ALL_PERMISSIONS));
    expect(parsePermissions('["tickets.read","*","bogus"]')).toEqual(new Set(ALL_PERMISSIONS));
    expect(serializePermissions(['*'])).toBe('["*"]');
  });

  it('only treats "*" as a wildcard when it is a whole entry', () => {
    expect(parsePermissions('["tickets.*"]')).toEqual(new Set());
    expect(parsePermissions('"*"')).toEqual(new Set()); // not an array
  });

  it('matches the access the roles had before permissions', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.VIEWER.sort()).toEqual(['tickets.read', 'users.read']);
    expect(set('AGENT').has('tickets.write')).toBe(true);
    expect(set('AGENT').has('tickets.write.any')).toBe(false);
    expect(set('TEAM_LEAD').has('tickets.write.any')).toBe(true);
    expect(set('TEAM_LEAD').has('tickets.delete')).toBe(false);
    for (const p of ['tickets.delete', 'ticket-lookups.manage', 'users.manage'] as const) {
      expect(set('ADMIN').has(p)).toBe(true);
    }
    expect(set('ADMIN').has('users.manage.all')).toBe(false);
  });

  it('round-trips through the privilege column, sorted and without duplicates', () => {
    const stored = serializePermissions(['users.read', 'tickets.read', 'users.read']);
    expect(stored).toBe('["tickets.read","users.read"]');
    expect(parsePermissions(stored)).toEqual(new Set(['tickets.read', 'users.read']));
  });

  it.each([
    ['null', null],
    ['empty', ''],
    ['invalid JSON', '{not json'],
    ['not an array', '{"tickets.read":true}'],
    ['legacy free text', 'full access'],
  ])('grants nothing for %s privilege', (_case, privilege) => {
    expect(parsePermissions(privilege)).toEqual(new Set());
  });

  it('drops unknown or non-string entries', () => {
    expect(parsePermissions('["tickets.read", "everything", 42, null]')).toEqual(new Set(['tickets.read']));
  });

  it('isStrictSubset needs a proper subset', () => {
    const a = new Set<Permission>(['tickets.read']);
    const b = new Set<Permission>(['tickets.read', 'users.read']);
    const c = new Set<Permission>(['users.read', 'tickets.write']);
    expect(isStrictSubset(a, b)).toBe(true);
    expect(isStrictSubset(b, b)).toBe(false); // equal is not below
    expect(isStrictSubset(a, c)).toBe(false); // smaller but not contained
    expect(isStrictSubset(new Set(), a)).toBe(true); // no permissions is below anyone with some
  });
});
