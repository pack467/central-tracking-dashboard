import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import session, { type SessionData } from 'express-session';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SESSION_CONFIG, type SessionConfig } from './session.config.js';
import './session.types.js';

// last_used_at (and a sliding expiry, if idle logout is on) is written at most
// this often per session, not on every request.
export const TOUCH_INTERVAL_MS = 60_000;
const CLEANUP_INTERVAL_MS = 60 * 60_000;

type Done<T> = ((err: unknown, result?: T) => void) | undefined;

// express-session store on the user_sessions table. Only logged-in sessions are
// written (a session without userId never is), and every row has a real user_id
// column, so "all sessions of user X" is a plain indexed query.
@Injectable()
export class PrismaSessionStore extends session.Store implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaSessionStore.name);
  private cleanupTimer?: NodeJS.Timeout;
  // When this instance last wrote each session's last_used_at, so most requests
  // skip the DB round trip entirely. Cleared hourly (stale entries cost nothing
  // but one extra conditional update).
  private readonly lastTouched = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SESSION_CONFIG) private readonly config: SessionConfig,
  ) {
    super();
  }

  get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
    this.run('get', callback, async () => {
      const row = await this.prisma.userSession.findUnique({
        where: { sid },
        select: { data: true, expires_at: true },
      });
      if (!row) return null;
      if (row.expires_at.getTime() <= Date.now()) {
        await this.prisma.userSession.deleteMany({ where: { sid } });
        return null;
      }
      return row.data as unknown as SessionData;
    });
  }

  set(sid: string, sess: SessionData, callback?: (err?: unknown) => void): void {
    this.run('set', callback, async () => {
      if (!sess.userId) return;
      const fields = {
        user_id: BigInt(sess.userId),
        data: JSON.parse(JSON.stringify(sess)) as Prisma.InputJsonValue,
        user_agent: sess.userAgent?.slice(0, 500) ?? null,
        ip: sess.ip?.slice(0, 64) ?? null,
        expires_at: this.expiresAt(sess),
        last_used_at: new Date(),
      };
      await this.prisma.userSession.upsert({ where: { sid }, create: { sid, ...fields }, update: fields });
    });
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    this.lastTouched.delete(sid);
    this.run('destroy', callback, async () => {
      await this.prisma.userSession.deleteMany({ where: { sid } });
    });
  }

  // Called by express-session at the end of every request that didn't change the
  // session. A failure only delays last_used_at, so it is logged, not raised.
  touch(sid: string, sess: SessionData, callback?: () => void): void {
    const now = Date.now();
    if (now - (this.lastTouched.get(sid) ?? 0) < TOUCH_INTERVAL_MS) {
      callback?.();
      return;
    }
    this.lastTouched.set(sid, now);
    this.run('touch', callback && (() => callback()), async () => {
      // The DB condition also covers other instances that touched it recently.
      await this.prisma.userSession.updateMany({
        where: { sid, last_used_at: { lt: new Date(now - TOUCH_INTERVAL_MS) } },
        data: { last_used_at: new Date(now), expires_at: this.expiresAt(sess) },
      });
    });
  }

  onModuleInit() {
    void this.removeExpired();
    this.cleanupTimer = setInterval(() => void this.removeExpired(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  // An expired row is deleted when its cookie comes back; this removes the ones
  // whose browser never returns. Never throws (the app must start with the DB down).
  async removeExpired(): Promise<void> {
    this.lastTouched.clear();
    try {
      const { count } = await this.prisma.userSession.deleteMany({
        where: { expires_at: { lte: new Date() } },
      });
      if (count) this.logger.log(`Removed ${count} expired session(s)`);
    } catch (err) {
      this.logger.warn(`Expired session cleanup failed: ${(err as Error).message}`);
    }
  }

  // The earlier of login + SESSION_MAX_AGE (absolute) and the cookie's expiry,
  // which slides with activity when SESSION_IDLE_TIMEOUT is set.
  private expiresAt(sess: SessionData): Date {
    const absolute = (sess.loginAt ?? Date.now()) + this.config.maxAgeMs;
    const cookie = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : absolute;
    return new Date(Math.min(absolute, cookie));
  }

  private run<T>(op: string, done: Done<T>, fn: () => Promise<T>): void {
    void fn().then(
      (result) => done?.(null, result),
      (err: unknown) => {
        this.logger.error(`Session store ${op} failed: ${err instanceof Error ? err.message : String(err)}`);
        done?.(err);
      },
    );
  }
}
