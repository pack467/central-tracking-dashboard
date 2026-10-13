import { Logger } from '@nestjs/common';
import type { SessionData } from 'express-session';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrismaSessionStore, TOUCH_INTERVAL_MS } from './prisma-session.store.js';
import type { SessionConfig } from './session.config.js';

const HOUR = 3_600_000;
const NOW = new Date('2026-10-13T08:00:00Z').getTime();

describe('PrismaSessionStore', () => {
  const prisma = {
    userSession: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
  };
  const config: SessionConfig = { secrets: ['x'.repeat(32)], maxAgeMs: 12 * HOUR, idleTimeoutMs: null, secureCookie: false };
  let store: PrismaSessionStore;

  const errorLog = vi.spyOn(Logger.prototype, 'error');
  const warnLog = vi.spyOn(Logger.prototype, 'warn');

  // The store's callback API as promises.
  const get = (sid: string) =>
    new Promise<SessionData | null | undefined>((resolve, reject) =>
      store.get(sid, (err, sess) => (err ? reject(err) : resolve(sess))),
    );
  const set = (sid: string, sess: object) =>
    new Promise<void>((resolve, reject) => store.set(sid, sess as SessionData, (err) => (err ? reject(err) : resolve())));
  const destroy = (sid: string) =>
    new Promise<void>((resolve, reject) => store.destroy(sid, (err) => (err ? reject(err) : resolve())));
  const touch = (sid: string, sess: object) => new Promise<void>((resolve) => store.touch(sid, sess as SessionData, resolve));

  // A logged-in session as express-session hands it over (cookie expiry slides on every request).
  const session = (cookieExpiresIn: number, extra: object = {}) => ({
    cookie: { originalMaxAge: cookieExpiresIn, expires: new Date(NOW + cookieExpiresIn), httpOnly: true, path: '/' },
    userId: '7',
    csrfToken: 'token',
    loginAt: NOW - HOUR,
    userAgent: 'Mozilla/5.0',
    ip: '10.0.0.5',
    ...extra,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    errorLog.mockImplementation(() => undefined);
    warnLog.mockImplementation(() => undefined);
    prisma.userSession.deleteMany.mockResolvedValue({ count: 0 });
    store = new PrismaSessionStore(prisma as unknown as PrismaService, config);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get', () => {
    it('returns nothing for an unknown sid', async () => {
      prisma.userSession.findUnique.mockResolvedValue(null);
      await expect(get('sid-1')).resolves.toBeNull();
    });

    it('returns the stored session data', async () => {
      const data = { userId: '7', csrfToken: 'token' };
      prisma.userSession.findUnique.mockResolvedValue({ data, expires_at: new Date(NOW + HOUR) });

      await expect(get('sid-1')).resolves.toEqual(data);
      expect(prisma.userSession.findUnique).toHaveBeenCalledWith({
        where: { sid: 'sid-1' },
        select: { data: true, expires_at: true },
      });
    });

    it('deletes and ignores an expired session', async () => {
      prisma.userSession.findUnique.mockResolvedValue({ data: { userId: '7' }, expires_at: new Date(NOW) });

      await expect(get('sid-1')).resolves.toBeNull();
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({ where: { sid: 'sid-1' } });
    });

    it('passes DB errors on (express-session answers the request with an error)', async () => {
      prisma.userSession.findUnique.mockRejectedValue(new Error('connection refused'));
      await expect(get('sid-1')).rejects.toThrow('connection refused');
    });
  });

  describe('set', () => {
    it('stores a logged-in session with its user, client and an absolute expiry from login', async () => {
      await set('sid-1', session(12 * HOUR));

      const { where, create, update } = prisma.userSession.upsert.mock.calls[0][0];
      expect(where).toEqual({ sid: 'sid-1' });
      expect(update).toEqual({
        user_id: 7n,
        // Plain JSON, as express-session reads it back (dates become strings).
        data: expect.objectContaining({ userId: '7', csrfToken: 'token', cookie: expect.objectContaining({ expires: new Date(NOW + 12 * HOUR).toISOString() }) }),
        user_agent: 'Mozilla/5.0',
        ip: '10.0.0.5',
        // Logged in an hour ago, so 11h left, however far the cookie would reach.
        expires_at: new Date(NOW + 11 * HOUR),
        last_used_at: new Date(NOW),
      });
      expect(create).toEqual({ sid: 'sid-1', ...update });
    });

    it('expires at the cookie expiry when idle logout makes it earlier', async () => {
      await set('sid-1', session(2 * HOUR));
      expect(prisma.userSession.upsert.mock.calls[0][0].update.expires_at).toEqual(new Date(NOW + 2 * HOUR));
    });

    it('truncates a very long user agent to the column size', async () => {
      await set('sid-1', session(HOUR, { userAgent: 'A'.repeat(600) }));
      expect(prisma.userSession.upsert.mock.calls[0][0].update.user_agent).toHaveLength(500);
    });

    it('never stores a session without a logged-in user', async () => {
      await set('sid-1', { cookie: {} });
      expect(prisma.userSession.upsert).not.toHaveBeenCalled();
    });
  });

  it('destroy deletes the row (no error if it is already gone)', async () => {
    await destroy('sid-1');
    expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({ where: { sid: 'sid-1' } });
  });

  describe('touch', () => {
    it('updates last use and expiry, at most once per interval', async () => {
      await touch('sid-1', session(12 * HOUR));
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { sid: 'sid-1', last_used_at: { lt: new Date(NOW - TOUCH_INTERVAL_MS) } },
        data: { last_used_at: new Date(NOW), expires_at: new Date(NOW + 11 * HOUR) },
      });
    });

    it('skips the DB entirely when this instance touched the session less than an interval ago', async () => {
      await touch('sid-1', session(12 * HOUR));
      await touch('sid-1', session(12 * HOUR));
      expect(prisma.userSession.updateMany).toHaveBeenCalledTimes(1);

      vi.setSystemTime(NOW + TOUCH_INTERVAL_MS);
      await touch('sid-1', session(12 * HOUR));
      expect(prisma.userSession.updateMany).toHaveBeenCalledTimes(2);
    });

    it('logs a failure instead of failing the request', async () => {
      prisma.userSession.updateMany.mockRejectedValue(new Error('timeout'));
      await expect(touch('sid-1', session(HOUR))).resolves.toBeUndefined();
      expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('touch failed: timeout'));
    });
  });

  describe('removeExpired', () => {
    it('deletes the rows past their expiry', async () => {
      await store.removeExpired();
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({ where: { expires_at: { lte: new Date(NOW) } } });
    });

    it('never throws (the app must start with the DB down)', async () => {
      prisma.userSession.deleteMany.mockRejectedValue(new Error('connection refused'));
      await expect(store.removeExpired()).resolves.toBeUndefined();
      expect(warnLog).toHaveBeenCalled();
    });
  });
});
