// Every permission the code checks. Which role has which permissions is data:
// stored per role in user_role.privilege (a Postgres text[]). Adding a permission
// here does nothing until a route checks it and roles are granted it.
export const PERMISSIONS = {
  /** Read tickets, categories and severities. */
  TICKETS_READ: 'tickets.read',
  /** Create tickets, and update tickets assigned to you. */
  TICKETS_WRITE: 'tickets.write',
  /** Update any ticket and choose any assignee (needs tickets.write too). */
  TICKETS_WRITE_ANY: 'tickets.write.any',
  TICKETS_DELETE: 'tickets.delete',
  /** Create, update and delete ticket categories and severities. */
  TICKET_LOOKUPS_MANAGE: 'ticket-lookups.manage',
  USERS_READ: 'users.read',
  /** Create, update and delete users with fewer permissions than you. */
  USERS_MANAGE: 'users.manage',
  /** Manage any user and assign any role, including peers and higher. */
  USERS_MANAGE_ALL: 'users.manage.all',
  /** Reserved for the roles endpoint (not built yet). */
  ROLES_MANAGE: 'roles.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSIONS);

// Stored instead of a list to grant every permission, including ones added to
// PERMISSIONS later (it's expanded when read, never matched literally).
export const ALL = '*';

// What user_role.privilege may contain: permissions, or the wildcard.
export type GrantedPermission = Permission | typeof ALL;

const P = PERMISSIONS;
const VIEWER: Permission[] = [P.TICKETS_READ, P.USERS_READ];
const AGENT: Permission[] = [...VIEWER, P.TICKETS_WRITE];
const TEAM_LEAD: Permission[] = [...AGENT, P.TICKETS_WRITE_ANY];
const ADMIN: Permission[] = [...TEAM_LEAD, P.TICKETS_DELETE, P.TICKET_LOOKUPS_MANAGE, P.USERS_MANAGE];
const SUPER_ADMIN: GrantedPermission[] = [ALL];

// Starting permissions for the seeded roles, matching the access they had
// under role-name checks. The seed writes these only where privilege is still
// empty, so permissions edited later are never overwritten.
export const DEFAULT_ROLE_PERMISSIONS: Record<string, GrantedPermission[]> = {
  SUPER_ADMIN,
  ADMIN,
  TEAM_LEAD,
  AGENT,
  VIEWER,
};

const isPermission = (value: unknown): value is Permission =>
  typeof value === 'string' && (ALL_PERMISSIONS as readonly string[]).includes(value);

// Granted entries → the permissions they give: "*" expands to every permission
// in PERMISSIONS; unknown entries are dropped.
export function resolvePermissions(granted: Iterable<unknown>): Set<Permission> {
  const list = [...granted];
  if (list.includes(ALL)) return new Set(ALL_PERMISSIONS);
  return new Set(list.filter(isPermission));
}

// user_role.privilege (text[]) → permissions. Missing, empty or unknown
// entries grant nothing (fail closed).
export const parsePermissions = (privilege: readonly string[] | null | undefined): Set<Permission> =>
  resolvePermissions(privilege ?? []);

// Permissions as stored in user_role.privilege: unique and sorted.
export const toStoredPermissions = (permissions: Iterable<GrantedPermission>): string[] =>
  [...new Set(permissions)].sort();

// True when every permission in `inner` is in `outer` and `outer` has at least
// one more: "strictly less powerful than". Used so a user can only manage or
// hand out roles below their own.
export function isStrictSubset(inner: ReadonlySet<Permission>, outer: ReadonlySet<Permission>) {
  if (inner.size >= outer.size) return false;
  for (const p of inner) if (!outer.has(p)) return false;
  return true;
}
