import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';
import type { Permission } from './permissions.js';
import { TICKETS_READ, TICKETS_WRITE } from '../tickets/tickets.permissions.js';
import { USERS_READ } from '../users/users.permissions.js';

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
    reflector.getAllAndOverride.mockReturnValue([TICKETS_READ, TICKETS_WRITE]);
    expect(guard.canActivate(contextFor([TICKETS_WRITE, TICKETS_READ, USERS_READ]))).toBe(true);
  });

  it.each([
    ['one of two missing', [TICKETS_READ]],
    ['none', []],
    ['no user on the request', undefined],
  ])('denies when %s', (_case, permissions) => {
    reflector.getAllAndOverride.mockReturnValue([TICKETS_READ, TICKETS_WRITE]);
    expect(guard.canActivate(contextFor(permissions as Permission[] | undefined))).toBe(false);
  });
});
