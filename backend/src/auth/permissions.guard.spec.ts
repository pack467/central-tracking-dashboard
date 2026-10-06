import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';
import type { Permission } from './permissions.js';

describe('PermissionsGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() };
  const guard = new PermissionsGuard(reflector as unknown as Reflector);

  const contextFor = (permissions?: Permission[]) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({
          user: permissions && { id: 1n, role: 'X', permissions: new Set(permissions) },
        }),
      }),
    }) as unknown as ExecutionContext;

  it('allows any user when the route has no @Can()', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextFor([]))).toBe(true);
  });

  it('allows a user holding every required permission', () => {
    reflector.getAllAndOverride.mockReturnValue(['tickets.read', 'tickets.write']);
    expect(guard.canActivate(contextFor(['tickets.write', 'tickets.read', 'users.read']))).toBe(true);
  });

  it.each([
    ['one of two missing', ['tickets.read']],
    ['none', []],
    ['no user on the request', undefined],
  ])('denies when %s', (_case, permissions) => {
    reflector.getAllAndOverride.mockReturnValue(['tickets.read', 'tickets.write']);
    expect(guard.canActivate(contextFor(permissions as Permission[] | undefined))).toBe(false);
  });
});
