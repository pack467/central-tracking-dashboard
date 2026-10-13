import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { parseOrigins } from '../http-env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const sameHost = (origin: string, host: string | undefined) => {
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false; // "null" (sandboxed pages, file://) or garbage
  }
};

// Refuses writes (POST/PATCH/PUT/DELETE) sent by a browser page on another site.
// Browsers always send Origin on such requests; it must be in CORS_ORIGIN or be
// the API's own host (Swagger UI at /docs). This protects POST /auth/login,
// which has no CSRF token yet, and backs up the token check everywhere else.
// Requests without Origin (curl, Postman, scripts) don't come from a web page,
// so they pass.
@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  private readonly allowed: Set<string>;

  constructor(config: ConfigService) {
    this.allowed = new Set(parseOrigins(config.get<string>('CORS_ORIGIN')));
  }

  use(req: Request, _res: Response, next: NextFunction) {
    const { origin, host } = req.headers;
    if (SAFE_METHODS.has(req.method) || origin === undefined) return next();
    if (this.allowed.has(origin) || sameHost(origin, host)) return next();
    throw new ForbiddenException('Origin not allowed');
  }
}
