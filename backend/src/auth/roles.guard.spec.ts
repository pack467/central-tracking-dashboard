import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  const contextFor = (role: string | null | undefined) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user: role === undefined ? undefined : { id: 1n, role } }) }),
    }) as unknown as ExecutionContext;

  it('allows any user when the route has no @Roles()', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextFor('VIEWER'))).toBe(true);
  });

  it('allows a listed role', () => {
    reflector.getAllAndOverride.mockReturnValue(['SUPER_ADMIN', 'ADMIN']);
    expect(guard.canActivate(contextFor('ADMIN'))).toBe(true);
  });

  it.each(['AGENT', null, undefined])('denies role %s', (role) => {
    reflector.getAllAndOverride.mockReturnValue(['SUPER_ADMIN', 'ADMIN']);
    expect(guard.canActivate(contextFor(role))).toBe(false);
  });
});
