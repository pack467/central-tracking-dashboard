// Permissions are declared where they're used: each module has a
// *.permissions.ts calling definePermission(). Declaring one registers it here,
// and at startup PermissionSyncService writes the registry to the `permissions`
// table. Which role has which permission is data (`role_permissions`), managed
// through /roles. There is no central list to edit.

declare const permissionBrand: unique symbol;

// Only definePermission() produces this type, so @Can('tickets.delte') with a
// raw (possibly misspelled) string does not compile.
export type Permission = string & { readonly [permissionBrand]: true };

export interface PermissionDefinition {
  key: Permission;
  description: string;
}

// Granting "*" grants every permission, including ones defined later. It is
// expanded when read, never checked literally, and can't be defined.
export const ALL = '*';
export const ALL_DESCRIPTION = 'Every permission, including ones added in the future';

const KEY_FORMAT = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/; // e.g. tickets.write.any

const registry = new Map<string, PermissionDefinition>();

export function definePermission(key: string, description: string): Permission {
  if (!KEY_FORMAT.test(key)) {
    throw new Error(`Invalid permission key "${key}": use dotted lowercase, e.g. "reports.export"`);
  }
  const existing = registry.get(key);
  if (existing) {
    if (existing.description !== description) throw new Error(`Permission "${key}" is defined twice`);
    return existing.key;
  }
  const definition = { key: key as Permission, description };
  registry.set(key, definition);
  return definition.key;
}

export const definedPermissions = (): PermissionDefinition[] =>
  [...registry.values()].sort((a, b) => a.key.localeCompare(b.key));

export const isDefinedPermission = (key: string): key is Permission => registry.has(key);

// Granted keys → the permissions they give. "*" expands to every defined
// permission; keys the code doesn't define (obsolete, unknown) give nothing.
export function resolvePermissions(granted: Iterable<string>): Set<Permission> {
  const keys = [...granted];
  if (keys.includes(ALL)) return new Set(definedPermissions().map((d) => d.key));
  return new Set(keys.filter(isDefinedPermission));
}

// A role's granted keys (from role_permissions) → permissions. Missing or
// empty grants nothing (fail closed).
export const parsePermissions = (keys: readonly string[] | null | undefined): Set<Permission> =>
  resolvePermissions(keys ?? []);

// Keys as stored and returned: unique and sorted.
export const toStoredPermissions = (keys: Iterable<string>): string[] => [...new Set(keys)].sort();

// True when every permission in `inner` is in `outer` and `outer` has at least
// one more: "strictly less powerful than". Used so a user can only manage or
// hand out roles below their own.
export function isStrictSubset(inner: ReadonlySet<Permission>, outer: ReadonlySet<Permission>) {
  if (inner.size >= outer.size) return false;
  for (const p of inner) if (!outer.has(p)) return false;
  return true;
}
