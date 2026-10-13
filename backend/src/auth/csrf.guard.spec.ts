import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard.js';

describe('CsrfGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() };
  const guard = new CsrfGuard(reflector as unknown as Reflector);
  const session = { userId: '1', csrfToken: 'the-session-token' };

  const contextFor = (method: string, headers: Record<string, string> = {}, sess: object | undefined = session) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ method, headers, session: sess }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('does not check reads', () => {
    expect(guard.canActivate(contextFor('GET'))).toBe(true);
    expect(guard.canActivate(contextFor('HEAD'))).toBe(true);
  });

  it('does not check public routes (login has no session yet)', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(guard.canActivate(contextFor('POST', {}, undefined))).toBe(true);
  });

  it.each(['POST', 'PATCH', 'PUT', 'DELETE'])('accepts a %s that echoes the session token', (method) => {
    expect(guard.canActivate(contextFor(method, { 'x-csrf-token': 'the-session-token' }))).toBe(true);
  });

  it.each([
    ['no header', {}],
    ['a wrong token', { 'x-csrf-token': 'the-session-tokem' }],
    ['a token of another length', { 'x-csrf-token': 'the-session-token-2' }],
  ])('refuses a write with %s', (_case, headers: Record<string, string>) => {
    expect(() => guard.canActivate(contextFor('PATCH', headers))).toThrow(ForbiddenException);
  });

  it('refuses a write when the session has no token', () => {
    expect(() => guard.canActivate(contextFor('POST', { 'x-csrf-token': 'x' }, { userId: '1' }))).toThrow(
      ForbiddenException,
    );
  });
});
