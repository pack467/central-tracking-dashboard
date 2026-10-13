import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import session from 'express-session';
import { PrismaSessionStore } from './prisma-session.store.js';
import { cookieOptions, SESSION_CONFIG, SESSION_COOKIE, type SessionConfig } from './session.config.js';

// Probes and metrics never use a session; skipping them keeps /ready free of DB
// calls even when opened in a logged-in browser.
const SKIP = /^\/(health|ready|metrics)(\/|$)/;

// express-session on our store, applied to every route in AppModule: loads
// req.session from the ctd.sid cookie and saves it when it changes.
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  private readonly handler: RequestHandler;

  constructor(store: PrismaSessionStore, @Inject(SESSION_CONFIG) config: SessionConfig) {
    this.handler = session({
      name: SESSION_COOKIE,
      store,
      secret: config.secrets,
      resave: false,
      saveUninitialized: false, // nothing is stored (or sent) until login
      rolling: config.idleTimeoutMs !== null, // with idle logout, every response extends the cookie
      cookie: { ...cookieOptions(config), maxAge: config.idleTimeoutMs ?? config.maxAgeMs },
    });
  }

  // A failure loading the session becomes an exception, so the global filter
  // answers it like any other error instead of Express's default error page.
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (SKIP.test(req.originalUrl.split('?')[0])) return next();
    await new Promise<void>((resolve, reject) => {
      this.handler(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
    });
    next();
  }
}
