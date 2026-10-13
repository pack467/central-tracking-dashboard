import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { OriginCheckMiddleware } from './origin-check.middleware.js';

describe('OriginCheckMiddleware', () => {
  const config = { get: () => 'http://localhost:3001, https://dashboard.example.com' };
  const middleware = new OriginCheckMiddleware(config as unknown as ConfigService);

  const run = (method: string, headers: Record<string, string>) => {
    const next = vi.fn();
    const req = { method, headers: { host: 'api.example.com', ...headers } } as unknown as Request;
    middleware.use(req, {} as Response, next);
    return next;
  };

  it('lets reads through from any origin', () => {
    expect(run('GET', { origin: 'https://evil.example' })).toHaveBeenCalled();
  });

  it('lets writes without an Origin header through (curl, Postman, scripts)', () => {
    expect(run('POST', {})).toHaveBeenCalled();
  });

  it.each([
    'http://localhost:3001', // in CORS_ORIGIN
    'https://dashboard.example.com', // in CORS_ORIGIN
    'https://api.example.com', // the API's own host (Swagger UI)
  ])('allows writes from %s', (origin) => {
    expect(run('POST', { origin })).toHaveBeenCalled();
  });

  it.each([
    'https://evil.example',
    'null',
    'http://localhost:3002',
    'https://dashboard.example.com.evil.example',
  ])('refuses writes from %s, login included', (origin) => {
    expect(() => run('POST', { origin })).toThrow(ForbiddenException);
    expect(() => run('DELETE', { origin })).toThrow(ForbiddenException);
  });
});
