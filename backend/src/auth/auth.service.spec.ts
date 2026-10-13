import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth.types.js';
import { parsePermissions } from './permissions.js';
import '../tickets/tickets.permissions.js'; // registers tickets.read
import '../users/users.permissions.js'; // registers users.read

describe('AuthService', () => {
  let service: AuthService;
  let hash: string;
  const users = {
    findForLogin: vi.fn(),
    findAuthUser: vi.fn(),
    findOne: vi.fn(),
    findPasswordHash: vi.fn(),
    setPassword: vi.fn(),
  };
  const sessions = { revokeAll: vi.fn() };

  // A user as findAuthUser returns it; keys the code doesn't define are ignored.
  const authRow = (is_active = true) => ({
    id: 10n,
    is_active,
    role: { name: 'ADMIN', permissions: [{ permission_key: 'tickets.read' }, { permission_key: 'bogus.permission' }] },
  });

  beforeAll(async () => {
    hash = await bcrypt.hash('correct-pass', 4);
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: SessionsService, useValue: sessions },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('verifyCredentials', () => {
    it('returns the user with the role and permissions loaded from the DB', async () => {
      users.findForLogin.mockResolvedValue({ id: 10n, password: hash, is_active: true });
      users.findAuthUser.mockResolvedValue(authRow());

      await expect(service.verifyCredentials({ identifier: 'a@x.com', password: 'correct-pass' })).resolves.toEqual({
        id: 10n,
        role: 'ADMIN',
        permissions: new Set(['tickets.read']),
      });
      expect(users.findAuthUser).toHaveBeenCalledWith(10n);
    });

    it.each([
      ['unknown user', null, 'correct-pass'],
      ['wrong password', { id: 1n, password: 'HASH', is_active: true }, 'wrong-pass'],
      ['inactive user', { id: 1n, password: 'HASH', is_active: false }, 'correct-pass'],
      ['user without a password', { id: 1n, password: null, is_active: true }, 'correct-pass'],
    ])('rejects %s with the same error', async (_case, user, password) => {
      users.findForLogin.mockResolvedValue(user && { ...user, password: user.password && hash });

      const error = await service.verifyCredentials({ identifier: 'a@x.com', password }).catch((e) => e);
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.message).toBe('Invalid credentials');
      expect(users.findAuthUser).not.toHaveBeenCalled();
    });
  });

  describe('loadUser', () => {
    it('returns null for a missing or inactive user', async () => {
      users.findAuthUser.mockResolvedValueOnce(null).mockResolvedValueOnce(authRow(false));
      await expect(service.loadUser(10n)).resolves.toBeNull();
      await expect(service.loadUser(10n)).resolves.toBeNull();
    });
  });

  describe('profile', () => {
    it('adds the role and the sorted effective permissions to the profile', async () => {
      users.findOne.mockResolvedValue({ id: 10n, name: 'A' });
      const user: AuthUser = { id: 10n, role: 'ADMIN', permissions: parsePermissions(['users.read', 'tickets.read']) };

      await expect(service.profile(user)).resolves.toEqual({
        id: 10n,
        name: 'A',
        role: 'ADMIN',
        permissions: ['tickets.read', 'users.read'],
      });
    });
  });

  describe('changePassword', () => {
    it('sets the new password and ends every other session of the user', async () => {
      users.findPasswordHash.mockResolvedValue({ password: hash });
      await service.changePassword(1n, { current_password: 'correct-pass', new_password: 'new-pass-123' }, 'this-sid');

      expect(users.setPassword).toHaveBeenCalledWith(1n, 'new-pass-123');
      expect(sessions.revokeAll).toHaveBeenCalledWith(1n, 'password_changed', 'this-sid');
    });

    it('rejects a wrong current password and leaves the sessions alone', async () => {
      users.findPasswordHash.mockResolvedValue({ password: hash });
      await expect(
        service.changePassword(1n, { current_password: 'nope', new_password: 'new-pass-123' }, 'this-sid'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.setPassword).not.toHaveBeenCalled();
      expect(sessions.revokeAll).not.toHaveBeenCalled();
    });
  });
});
