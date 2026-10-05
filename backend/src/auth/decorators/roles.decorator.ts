import { SetMetadata } from '@nestjs/common';
import type { RoleName } from '../auth.types.js';

export const ROLES_KEY = 'roles';

// Restricts a route to the listed roles. Without it, any authenticated user is allowed.
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
