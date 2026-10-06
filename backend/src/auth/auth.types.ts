import type { Request } from 'express';
import type { Permission } from './permissions.js';

export interface JwtPayload {
  sub: string; // user id (BigInt as string)
}

// Attached to the request by AuthGuard. Loaded from the DB on every request,
// so deactivation, role changes and permission changes take effect immediately.
// Access checks use `permissions`; `role` is the role's name, for display only.
export interface AuthUser {
  id: bigint;
  role: string | null;
  permissions: ReadonlySet<Permission>;
}

export type AuthRequest = Request & { user?: AuthUser };
