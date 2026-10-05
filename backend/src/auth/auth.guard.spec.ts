import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { AuthGuard } from './auth.guard.js';
import type { AuthRequest } from './auth.types.js';

describe('AuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret-that-is-at-least-32-chars!' });
  const reflector = { getAllAndOverride: vi.fn() };
  const users = { findAuthUser: vi.fn() };
  const guard = new AuthGuard(
    reflector as unknown as Reflector,
    jwt,
    users as unknown as UsersService,
  );

  const contextFor = (request: Partial<AuthRequest>) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  const bearer = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lets @Public() routes through without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(true);
  });

  it('rejects a missing token', async () => {
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with another secret', async () => {
    const forged = await new JwtService({ secret: 'some-other-secret-of-32-characters!!' }).signAsync({
      sub: '1',
    });
    await expect(guard.canActivate(contextFor(bearer(forged)))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a valid token for an inactive user', async () => {
    users.findAuthUser.mockResolvedValue({ id: 1n, is_active: false, role: { name: 'ADMIN' } });
    const token = await jwt.signAsync({ sub: '1' });
    await expect(guard.canActivate(contextFor(bearer(token)))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the user with the role loaded from the DB', async () => {
    users.findAuthUser.mockResolvedValue({ id: 1n, is_active: true, role: { name: 'ADMIN' } });
    const request = bearer(await jwt.signAsync({ sub: '1' })) as Partial<AuthRequest>;

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(users.findAuthUser).toHaveBeenCalledWith(1n);
    expect(request.user).toEqual({ id: 1n, role: 'ADMIN' });
  });
});
