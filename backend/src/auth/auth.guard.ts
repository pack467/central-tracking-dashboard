import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionsService } from '../sessions/sessions.service.js';
import { AuthService } from './auth.service.js';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';
import type { AuthRequest } from './auth.types.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // req.session was loaded from the ctd.sid cookie by SessionMiddleware; an
    // unknown, expired or ended session has no userId.
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const userId = request.session?.userId;
    if (!userId || !/^\d+$/.test(userId)) throw new UnauthorizedException();

    // Re-checked on every request so a deactivated user loses access immediately.
    const user = await this.auth.loadUser(BigInt(userId));
    if (!user) {
      await this.sessions.end(request, 'user_inactive');
      throw new UnauthorizedException();
    }

    request.user = user;
    return true;
  }
}
