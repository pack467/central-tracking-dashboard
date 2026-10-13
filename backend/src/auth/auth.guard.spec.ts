import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionsService } from '../sessions/sessions.service.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import type { AuthRequest, AuthUser } from './auth.types.js';

describe('AuthGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() };
  const auth = { loadUser: vi.fn() };
  const sessions = { end: vi.fn() };
  const guard = new AuthGuard(
    reflector as unknown as Reflector,
    auth as unknown as AuthService,
    sessions as unknown as SessionsService,
  );

  const contextFor = (request: Partial<AuthRequest>) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  // req.session as SessionMiddleware leaves it.
  const withSession = (session: object | undefined) => ({ session }) as unknown as Partial<AuthRequest>;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lets @Public() routes through without a session', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(contextFor(withSession(undefined)))).resolves.toBe(true);
    expect(auth.loadUser).not.toHaveBeenCalled();
  });

  it.each([
    ['no session', undefined],
    ['a session without a user (never logged in, expired or ended)', {}],
    ['a malformed user id', { userId: '1 OR 1=1' }],
  ])('rejects %s', async (_case, session) => {
    await expect(guard.canActivate(contextFor(withSession(session)))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(auth.loadUser).not.toHaveBeenCalled();
  });

  it('rejects, and ends the session of, a user who is inactive or gone', async () => {
    auth.loadUser.mockResolvedValue(null);
    const request = withSession({ userId: '1' });

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auth.loadUser).toHaveBeenCalledWith(1n);
    expect(sessions.end).toHaveBeenCalledWith(request, 'user_inactive');
  });

  it("attaches the session's user with the role and permissions loaded from the DB", async () => {
    const user: AuthUser = { id: 1n, role: 'ADMIN', permissions: new Set() };
    auth.loadUser.mockResolvedValue(user);
    const request = withSession({ userId: '1' });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toBe(user);
    expect(sessions.end).not.toHaveBeenCalled();
  });
});
