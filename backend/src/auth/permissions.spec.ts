import {
  ALL,
  definePermission,
  definedPermissions,
  isStrictSubset,
  parsePermissions,
  resolvePermissions,
  toStoredPermissions,
  type Permission,
} from './permissions.js';
import { SEED_ROLES, seededKeys, seededPermissions } from '../../test/helpers/seeded-roles.js';
import { TICKETS_READ } from '../tickets/tickets.permissions.js';

const allDefined = () => new Set(definedPermissions().map((d) => d.key));

describe('permission registry', () => {
  it('registers what the modules define, with descriptions', () => {
    const keys = definedPermissions().map((d) => d.key);
    expect(keys).toEqual(
      expect.arrayContaining(['tickets.read', 'tickets.write.any', 'users.manage.all', 'roles.read', 'roles.manage']),
    );
    expect(definedPermissions().every((d) => d.description.length > 0)).toBe(true);
  });

  it('returns the same constant when a module is loaded twice', () => {
    expect(definePermission('tickets.read', 'Read tickets, the ticket summary, categories and severities')).toBe(
      TICKETS_READ,
    );
  });

  it('rejects the same key with a different description (two modules claiming it)', () => {
    expect(() => definePermission('tickets.read', 'Something else')).toThrow('defined twice');
  });

  it.each(['*', 'tickets', 'Tickets.Read', 'tickets.', 'tickets read', 'tickets.*'])(
    'rejects the malformed key %j',
    (key) => {
      expect(() => definePermission(key, 'x')).toThrow('Invalid permission key');
    },
  );
});

describe('resolvePermissions', () => {
  it('expands "*" to every defined permission, whatever else is listed', () => {
    expect(resolvePermissions([ALL])).toEqual(allDefined());
    expect(resolvePermissions(['tickets.read', ALL, 'bogus'])).toEqual(allDefined());
  });

  it('only treats "*" as a wildcard when it is a whole entry', () => {
    expect(resolvePermissions(['tickets.*'])).toEqual(new Set());
    expect(resolvePermissions(['* '])).toEqual(new Set());
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', []],
    ['only keys the code does not define (obsolete or unknown)', ['reports.export', 'tickets']],
  ])('grants nothing for %s', (_case, keys) => {
    expect(parsePermissions(keys)).toEqual(new Set());
  });

  it('drops keys the code does not define (matching is exact)', () => {
    expect(parsePermissions(['tickets.read', 'reports.export', 'TICKETS.READ'])).toEqual(new Set(['tickets.read']));
  });

  it('stores keys sorted and without duplicates', () => {
    expect(toStoredPermissions(['users.read', 'tickets.read', 'users.read'])).toEqual(['tickets.read', 'users.read']);
  });

  it('isStrictSubset needs a proper subset', () => {
    const p = (...keys: string[]) => new Set(keys as Permission[]);
    expect(isStrictSubset(p('tickets.read'), p('tickets.read', 'users.read'))).toBe(true);
    expect(isStrictSubset(p('tickets.read', 'users.read'), p('tickets.read', 'users.read'))).toBe(false);
    expect(isStrictSubset(p('tickets.read'), p('users.read', 'tickets.write'))).toBe(false);
    expect(isStrictSubset(p(), p('tickets.read'))).toBe(true);
  });
});

// The seed data is what a fresh database starts with, so it's tested like code.
describe('seeded roles (prisma/seed-data/user_role.json)', () => {
  it('only grants keys the code defines (or "*")', () => {
    const defined = allDefined() as Set<string>;
    for (const role of SEED_ROLES) {
      for (const key of role.permissions) expect(key === ALL || defined.has(key), `${role.name}: ${key}`).toBe(true);
    }
  });

  it('nests strictly: VIEWER < AGENT < TEAM_LEAD < ADMIN < SUPER_ADMIN', () => {
    // The users hierarchy rules rely on this: each role can manage the ones below it only.
    const order = ['VIEWER', 'AGENT', 'TEAM_LEAD', 'ADMIN', 'SUPER_ADMIN'];
    for (let i = 0; i < order.length - 1; i++) {
      expect(isStrictSubset(seededPermissions(order[i]), seededPermissions(order[i + 1]))).toBe(true);
    }
  });

  it('gives SUPER_ADMIN everything through "*"', () => {
    expect(seededKeys('SUPER_ADMIN')).toEqual(['*']);
    expect(seededPermissions('SUPER_ADMIN')).toEqual(allDefined());
  });

  it('keeps the access each role had', () => {
    const has = (role: string, key: string) => (seededPermissions(role) as Set<string>).has(key);
    expect(seededKeys('VIEWER')).toEqual(['tickets.read', 'users.read']);
    expect(has('AGENT', 'tickets.write')).toBe(true);
    expect(has('AGENT', 'tickets.write.any')).toBe(false);
    expect(has('TEAM_LEAD', 'tickets.write.any')).toBe(true);
    expect(has('TEAM_LEAD', 'tickets.delete')).toBe(false);
    for (const key of ['tickets.delete', 'ticket-lookups.manage', 'users.manage', 'roles.read']) {
      expect(has('ADMIN', key)).toBe(true);
    }
    expect(has('ADMIN', 'users.manage.all')).toBe(false);
    expect(has('ADMIN', 'roles.manage')).toBe(false);
    expect(has('TEAM_LEAD', 'roles.read')).toBe(false);
  });
});
