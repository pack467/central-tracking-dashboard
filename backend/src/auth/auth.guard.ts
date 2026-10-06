import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';
import type { AuthRequest, JwtPayload } from './auth.types.js';
import { parsePermissions } from './permissions.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException();

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }
    if (typeof payload.sub !== 'string' || !/^\d+$/.test(payload.sub)) {
      throw new UnauthorizedException();
    }

    // Re-checked on every request so a deactivated user loses access immediately.
    const user = await this.users.findAuthUser(BigInt(payload.sub));
    if (!user?.is_active) throw new UnauthorizedException();

    request.user = {
      id: user.id,
      role: user.role?.name ?? null,
      permissions: parsePermissions(user.role?.privilege),
    };
    return true;
  }
}
