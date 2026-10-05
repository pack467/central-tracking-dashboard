import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let hash: string;
  const users = { findForLogin: vi.fn(), findPasswordHash: vi.fn(), setPassword: vi.fn() };
  const jwt = { signAsync: vi.fn() };

  beforeAll(async () => {
    hash = await bcrypt.hash('correct-pass', 4);
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('returns a token whose sub is the user id as a string', async () => {
      users.findForLogin.mockResolvedValue({ id: 10n, password: hash, is_active: true });
      jwt.signAsync.mockResolvedValue('signed');

      await expect(service.login({ identifier: 'a@x.com', password: 'correct-pass' })).resolves.toEqual({
        access_token: 'signed',
        token_type: 'Bearer',
      });
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: '10' });
    });

    it.each([
      ['unknown user', null, 'correct-pass'],
      ['wrong password', { id: 1n, password: 'HASH', is_active: true }, 'wrong-pass'],
      ['inactive user', { id: 1n, password: 'HASH', is_active: false }, 'correct-pass'],
      ['user without a password', { id: 1n, password: null, is_active: true }, 'correct-pass'],
    ])('rejects %s with the same error', async (_case, user, password) => {
      users.findForLogin.mockResolvedValue(user && { ...user, password: user.password && hash });

      const error = await service.login({ identifier: 'a@x.com', password }).catch((e) => e);
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.message).toBe('Invalid credentials');
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('sets the new password when the current one matches', async () => {
      users.findPasswordHash.mockResolvedValue({ password: hash });
      await service.changePassword(1n, { current_password: 'correct-pass', new_password: 'new-pass-123' });
      expect(users.setPassword).toHaveBeenCalledWith(1n, 'new-pass-123');
    });

    it('rejects a wrong current password', async () => {
      users.findPasswordHash.mockResolvedValue({ password: hash });
      await expect(
        service.changePassword(1n, { current_password: 'nope', new_password: 'new-pass-123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.setPassword).not.toHaveBeenCalled();
    });
  });
});
