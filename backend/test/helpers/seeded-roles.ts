// Test helper: the seeded roles and their permissions, read from the real seed
// data (prisma/seed-data/user_role.json), with every module's permissions
// registered the way the app registers them at boot.
import { readFileSync } from 'node:fs';
import { resolvePermissions, type Permission } from '../../src/auth/permissions.js';
import '../../src/tickets/tickets.permissions.js';
import '../../src/users/users.permissions.js';
import '../../src/roles/roles.permissions.js';

export interface SeedRole {
  id: string;
  name: string;
  info: string | null;
  permissions: string[];
}

export const SEED_ROLES: SeedRole[] = JSON.parse(
  readFileSync(new URL('../../prisma/seed-data/user_role.json', import.meta.url), 'utf8'),
);

export const seededKeys = (name: string): string[] => {
  const role = SEED_ROLES.find((r) => r.name === name);
  if (!role) throw new Error(`No seeded role ${name}`);
  return role.permissions;
};

export const seededPermissions = (name: string): Set<Permission> => resolvePermissions(seededKeys(name));
