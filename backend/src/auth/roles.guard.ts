import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators/roles.decorator.js';
import type { AuthRequest, RoleName } from './auth.types.js';

// Runs after AuthGuard, so request.user is set on every non-public route.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const role = context.switchToHttp().getRequest<AuthRequest>().user?.role;
    return !!role && (required as string[]).includes(role);
  }
}
