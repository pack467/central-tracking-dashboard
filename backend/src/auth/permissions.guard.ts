import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './decorators/can.decorator.js';
import type { AuthRequest } from './auth.types.js';
import type { Permission } from './permissions.js';

// Runs after AuthGuard, so request.user is set on every non-public route.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const granted = context.switchToHttp().getRequest<AuthRequest>().user?.permissions;
    return !!granted && required.every((p) => granted.has(p));
  }
}
