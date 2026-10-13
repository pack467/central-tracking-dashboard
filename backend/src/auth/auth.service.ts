import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { MeResponseDto } from './dto/me-response.dto.js';
import type { AuthUser } from './auth.types.js';
import { parsePermissions } from './permissions.js';
import { grantedKeys } from './role-permissions.js';

// Compared against when the user doesn't exist, so a login for an unknown
// account takes as long as one with a wrong password.
const DUMMY_HASH = '$2b$12$pXekJRy5uAEG3VI/kuCxSeSH/c/Y9zOjbhWOMluSWmP7d8IDH3dTu';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
  ) {}

  // The user behind valid credentials. Starting the session is the controller's job.
  async verifyCredentials({ identifier, password }: LoginDto): Promise<AuthUser> {
    const user = await this.users.findForLogin(identifier);
    const matches = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    const authUser = user?.password && user.is_active && matches ? await this.loadUser(user.id) : null;

    // One error for every failure, so the endpoint doesn't reveal which accounts exist.
    if (!authUser) throw new UnauthorizedException('Invalid credentials');
    return authUser;
  }

  // What AuthGuard puts on request.user, as it is in the DB right now; null for
  // a missing or inactive user.
  async loadUser(id: bigint): Promise<AuthUser | null> {
    const user = await this.users.findAuthUser(id);
    if (!user?.is_active) return null;
    return {
      id: user.id,
      role: user.role?.name ?? null,
      permissions: parsePermissions(grantedKeys(user.role)),
    };
  }

  // GET /auth/me and the login response: the profile plus role and effective permissions.
  async profile(user: AuthUser): Promise<MeResponseDto> {
    const profile = await this.users.findOne(user.id);
    return { ...profile, role: user.role, permissions: [...user.permissions].sort() } as unknown as MeResponseDto;
  }

  // Also ends every other session of the user (whoever knew the old password is
  // logged out); the controller then rotates the current one.
  async changePassword(
    userId: bigint,
    { current_password, new_password }: ChangePasswordDto,
    currentSid: string,
  ) {
    const user = await this.users.findPasswordHash(userId);
    const matches = await bcrypt.compare(current_password, user?.password ?? DUMMY_HASH);
    if (!user?.password || !matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.users.setPassword(userId, new_password);
    await this.sessions.revokeAll(userId, 'password_changed', currentSid);
  }
}
