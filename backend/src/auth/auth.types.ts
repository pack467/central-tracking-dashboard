import type { Request } from 'express';

// Names from the user_role table.
export type RoleName = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'AGENT' | 'VIEWER';

export interface JwtPayload {
  sub: string; // user id (BigInt as string)
}

// Attached to the request by AuthGuard. Loaded from the DB on every request,
// so deactivation and role changes take effect immediately.
export interface AuthUser {
  id: bigint;
  role: string | null;
}

export type AuthRequest = Request & { user?: AuthUser };
