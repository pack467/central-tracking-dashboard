import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { CSRF_HEADER } from '../sessions/session.config.js';
import '../sessions/session.types.js';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const sameToken = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// Runs after AuthGuard. A logged-in write (POST/PATCH/PUT/DELETE) must echo the
// session's CSRF token in X-CSRF-Token: another site can make the browser send
// the session cookie, but it can't read the token. Public routes (login) have no
// session to tie a token to; OriginCheckMiddleware protects them.
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const expected = request.session?.csrfToken;
    const sent = request.headers[CSRF_HEADER];
    if (!expected || typeof sent !== 'string' || !sameToken(sent, expected)) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
}
