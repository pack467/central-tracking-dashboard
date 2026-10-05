import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import type { JwtPayload } from './auth.types.js';

// Compared against when the user doesn't exist, so a login for an unknown
// account takes as long as one with a wrong password.
const DUMMY_HASH = '$2b$12$pXekJRy5uAEG3VI/kuCxSeSH/c/Y9zOjbhWOMluSWmP7d8IDH3dTu';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login({ identifier, password }: LoginDto) {
    const user = await this.users.findForLogin(identifier);
    const matches = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

    // One error for every failure, so the endpoint doesn't reveal which accounts exist.
    if (!user?.password || !user.is_active || !matches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { sub: user.id.toString() };
    return { access_token: await this.jwt.signAsync(payload), token_type: 'Bearer' };
  }

  async changePassword(userId: bigint, { current_password, new_password }: ChangePasswordDto) {
    const user = await this.users.findPasswordHash(userId);
    const matches = await bcrypt.compare(current_password, user?.password ?? DUMMY_HASH);
    if (!user?.password || !matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.users.setPassword(userId, new_password);
  }
}
