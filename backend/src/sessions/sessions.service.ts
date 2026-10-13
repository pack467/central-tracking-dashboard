import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  cookieOptions,
  CSRF_COOKIE,
  SESSION_CONFIG,
  SESSION_COOKIE,
  type SessionConfig,
} from './session.config.js';
import './session.types.js';

// Why sessions ended; written to the log (ended sessions are deleted, not kept).
export type SessionEndReason =
  | 'logout'
  | 'logout_all'
  | 'revoked'
  | 'password_changed'
  | 'password_reset'
  | 'deactivated'
  | 'user_inactive';

const newCsrfToken = () => randomBytes(32).toString('base64url');

// express-session's req.session methods take callbacks.
const call = (fn: (cb: (err?: unknown) => void) => unknown) =>
  new Promise<void>((resolve, reject) => {
    fn((err) => (err ? reject(err) : resolve()));
  });

const clientInfo = (req: Request) => ({ userAgent: req.get('user-agent'), ip: req.ip });

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SESSION_CONFIG) private readonly config: SessionConfig,
  ) {}

  // Login: always a brand-new session id, so an id planted in the browser before
  // login is useless (session fixation). Returns the session's CSRF token.
  async start(req: Request, userId: bigint): Promise<string> {
    await call((cb) => req.session.regenerate(cb));
    const csrfToken = newCsrfToken();
    Object.assign(req.session, { userId: userId.toString(), csrfToken, loginAt: Date.now(), ...clientInfo(req) });
    await call((cb) => req.session.save(cb));
    this.logger.log(`Session started for user ${userId} from ${req.ip ?? 'unknown address'}`);
    return csrfToken;
  }

  // A new session id for the same login (after a password change), so a copied
  // cookie stops working. Keeps the login time (absolute expiry) and the CSRF token.
  async rotate(req: Request): Promise<void> {
    const { userId, csrfToken, loginAt } = req.session;
    await call((cb) => req.session.regenerate(cb));
    Object.assign(req.session, { userId, csrfToken, loginAt, ...clientInfo(req) });
    await call((cb) => req.session.save(cb));
  }

  // Ends this request's session (logout). Safe to call when there is none.
  async end(req: Request, reason: SessionEndReason): Promise<void> {
    const userId = req.session?.userId;
    if (!req.session) return;
    await call((cb) => req.session.destroy(cb));
    if (userId) this.logger.log(`Session ended for user ${userId}: ${reason}`);
  }

  // Logs the user out everywhere, this request's session included.
  async endAll(req: Request, userId: bigint): Promise<number> {
    const count = await this.revokeAll(userId, 'logout_all');
    // The row is already gone; destroying also stops express-session touching it.
    if (req.session) await call((cb) => req.session.destroy(cb));
    return count;
  }

  // Deletes the user's sessions (all but `exceptSid`, if given): each device is
  // logged out on its next request. Returns how many were ended.
  async revokeAll(userId: bigint, reason: SessionEndReason, exceptSid?: string): Promise<number> {
    const { count } = await this.prisma.userSession.deleteMany({
      where: { user_id: userId, ...(exceptSid && { sid: { not: exceptSid } }) },
    });
    if (count) this.logger.log(`Ended ${count} session(s) of user ${userId}: ${reason}`);
    return count;
  }

  // The user's active sessions, most recently used first. The sid never leaves
  // the server; `id` identifies a session for DELETE /auth/sessions/:id.
  async list(userId: bigint, currentSid: string) {
    const rows = await this.prisma.userSession.findMany({
      where: { user_id: userId, expires_at: { gt: new Date() } },
      orderBy: { last_used_at: 'desc' },
      select: {
        id: true,
        sid: true,
        user_agent: true,
        ip: true,
        created_at: true,
        last_used_at: true,
        expires_at: true,
      },
    });
    return rows.map(({ sid, ...row }) => ({ ...row, current: sid === currentSid }));
  }

  // Ends one of the user's own sessions. Returns whether it was this request's.
  async revoke(req: Request, userId: bigint, id: bigint): Promise<{ current: boolean }> {
    const row = await this.prisma.userSession.findFirst({
      where: { id, user_id: userId },
      select: { sid: true },
    });
    if (!row) throw new NotFoundException(`Session #${id} not found`);
    if (row.sid === req.sessionID) {
      await this.end(req, 'revoked');
      return { current: true };
    }
    await this.prisma.userSession.deleteMany({ where: { id, user_id: userId } });
    this.logger.log(`Session ended for user ${userId}: revoked`);
    return { current: false };
  }

  // The session's CSRF token (created at login; recreated if somehow missing).
  async csrfToken(req: Request): Promise<string> {
    if (!req.session.csrfToken) {
      req.session.csrfToken = newCsrfToken();
      await call((cb) => req.session.save(cb));
    }
    return req.session.csrfToken;
  }

  // Readable copy of the CSRF token for browser JS (Swagger UI). It lives until
  // the browser closes; a stale one just fails the check after re-login.
  setCsrfCookie(res: Response, token: string): void {
    res.cookie(CSRF_COOKIE, token, { ...cookieOptions(this.config), httpOnly: false });
  }

  clearCookies(res: Response): void {
    res.clearCookie(SESSION_COOKIE, cookieOptions(this.config));
    res.clearCookie(CSRF_COOKIE, { ...cookieOptions(this.config), httpOnly: false });
  }
}
