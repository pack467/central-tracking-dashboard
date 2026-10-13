import { Logger, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SessionConfig } from './session.config.js';
import { SessionsService } from './sessions.service.js';

const NOW = new Date('2026-10-13T08:00:00Z').getTime();

// A request whose req.session behaves like express-session's: regenerate()
// swaps in an empty session under a new id, destroy() removes it.
function fakeRequest(data?: Record<string, unknown>, sessionID = 'old-sid') {
  const req: any = {
    sessionID,
    ip: '10.0.0.5',
    get: (header: string) => (header === 'user-agent' ? 'Mozilla/5.0' : undefined),
  };
  const makeSession = (fields: Record<string, unknown>) => ({
    ...fields,
    regenerate: vi.fn((cb: () => void) => {
      req.sessionID = 'new-sid';
      req.session = makeSession({});
      cb();
    }),
    save: vi.fn((cb: () => void) => cb()),
    destroy: vi.fn((cb: () => void) => {
      delete req.session;
      cb();
    }),
  });
  if (data) req.session = makeSession(data);
  return req as Request & { session: any };
}

describe('SessionsService', () => {
  const prisma = {
    userSession: { deleteMany: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  };
  const config: SessionConfig = { secrets: ['x'.repeat(32)], maxAgeMs: 43_200_000, idleTimeoutMs: null, secureCookie: true };
  const service = new SessionsService(prisma as unknown as PrismaService, config);
  const infoLog = vi.spyOn(Logger.prototype, 'log');

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    infoLog.mockImplementation(() => undefined);
    prisma.userSession.deleteMany.mockResolvedValue({ count: 2 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('start', () => {
    it('logs in on a brand-new session id, with the user, a CSRF token and the client', async () => {
      const req = fakeRequest({ userId: '99' }); // a session planted before login
      const planted = req.session;

      const token = await service.start(req, 7n);

      expect(planted.regenerate).toHaveBeenCalled();
      expect(req.sessionID).toBe('new-sid');
      expect(req.session).toMatchObject({
        userId: '7',
        csrfToken: token,
        loginAt: NOW,
        userAgent: 'Mozilla/5.0',
        ip: '10.0.0.5',
      });
      expect(req.session.save).toHaveBeenCalled();
      expect(token).toMatch(/^[\w-]{43}$/); // 32 random bytes, base64url
    });

    it('gives every login its own CSRF token', async () => {
      const a = await service.start(fakeRequest({}), 7n);
      const b = await service.start(fakeRequest({}), 7n);
      expect(a).not.toBe(b);
    });
  });

  it('rotate moves the login to a new session id and keeps its login time and CSRF token', async () => {
    const req = fakeRequest({ userId: '7', csrfToken: 'token', loginAt: NOW - 3_600_000, ip: 'old-ip' });

    await service.rotate(req);

    expect(req.sessionID).toBe('new-sid');
    expect(req.session).toMatchObject({ userId: '7', csrfToken: 'token', loginAt: NOW - 3_600_000, ip: '10.0.0.5' });
    expect(req.session.save).toHaveBeenCalled();
  });

  describe('end', () => {
    it("destroys the request's session", async () => {
      const req = fakeRequest({ userId: '7' });
      const current = req.session;
      await service.end(req, 'logout');
      expect(current.destroy).toHaveBeenCalled();
      expect(req.session).toBeUndefined();
    });

    it('does nothing without a session', async () => {
      await expect(service.end(fakeRequest(), 'logout')).resolves.toBeUndefined();
    });
  });

  it('endAll deletes every session of the user and destroys the current one', async () => {
    const req = fakeRequest({ userId: '7' });
    const current = req.session;

    await expect(service.endAll(req, 7n)).resolves.toBe(2);
    expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({ where: { user_id: 7n } });
    expect(current.destroy).toHaveBeenCalled();
  });

  describe('revokeAll', () => {
    it("deletes all of the user's sessions", async () => {
      await expect(service.revokeAll(7n, 'password_reset')).resolves.toBe(2);
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({ where: { user_id: 7n } });
      expect(infoLog).toHaveBeenCalledWith('Ended 2 session(s) of user 7: password_reset');
    });

    it('can keep one session (the one changing the password)', async () => {
      await service.revokeAll(7n, 'password_changed', 'this-sid');
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 7n, sid: { not: 'this-sid' } },
      });
    });
  });

  it('list returns active sessions without their sid, marking the current one', async () => {
    const row = { user_agent: 'UA', ip: '1.2.3.4', created_at: new Date(), last_used_at: new Date(), expires_at: new Date() };
    prisma.userSession.findMany.mockResolvedValue([
      { id: 2n, sid: 'other-sid', ...row },
      { id: 1n, sid: 'this-sid', ...row },
    ]);

    await expect(service.list(7n, 'this-sid')).resolves.toEqual([
      { id: 2n, current: false, ...row },
      { id: 1n, current: true, ...row },
    ]);
    expect(prisma.userSession.findMany.mock.calls[0][0].where).toEqual({
      user_id: 7n,
      expires_at: { gt: new Date(NOW) },
    });
  });

  describe('revoke', () => {
    it("is 404 for someone else's (or no) session", async () => {
      prisma.userSession.findFirst.mockResolvedValue(null);
      await expect(service.revoke(fakeRequest({}), 7n, 5n)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.userSession.findFirst).toHaveBeenCalledWith({ where: { id: 5n, user_id: 7n }, select: { sid: true } });
      expect(prisma.userSession.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes another session of the user', async () => {
      prisma.userSession.findFirst.mockResolvedValue({ sid: 'other-sid' });
      await expect(service.revoke(fakeRequest({}, 'this-sid'), 7n, 5n)).resolves.toEqual({ current: false });
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({ where: { id: 5n, user_id: 7n } });
    });

    it('logs out when it is the current session', async () => {
      prisma.userSession.findFirst.mockResolvedValue({ sid: 'this-sid' });
      const req = fakeRequest({ userId: '7' }, 'this-sid');
      const current = req.session;

      await expect(service.revoke(req, 7n, 5n)).resolves.toEqual({ current: true });
      expect(current.destroy).toHaveBeenCalled();
    });
  });

  describe('csrfToken', () => {
    it("returns the session's token", async () => {
      await expect(service.csrfToken(fakeRequest({ csrfToken: 'token' }))).resolves.toBe('token');
    });

    it('creates and saves one if the session has none', async () => {
      const req = fakeRequest({ userId: '7' });
      const token = await service.csrfToken(req);
      expect(token).toMatch(/^[\w-]{43}$/);
      expect(req.session.csrfToken).toBe(token);
      expect(req.session.save).toHaveBeenCalled();
    });
  });

  it('sets a readable CSRF cookie and clears both cookies with matching attributes', () => {
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    const attrs = { sameSite: 'lax', secure: true, path: '/' };

    service.setCsrfCookie(res as unknown as Response, 'token');
    service.clearCookies(res as unknown as Response);

    expect(res.cookie).toHaveBeenCalledWith('ctd.csrf', 'token', { ...attrs, httpOnly: false });
    expect(res.clearCookie).toHaveBeenCalledWith('ctd.sid', { ...attrs, httpOnly: true });
    expect(res.clearCookie).toHaveBeenCalledWith('ctd.csrf', { ...attrs, httpOnly: false });
  });
});
