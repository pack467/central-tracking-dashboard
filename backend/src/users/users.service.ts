import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { isStrictSubset, parsePermissions, type Permission } from '../auth/permissions.js';
import { USERS_MANAGE_ALL } from './users.permissions.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { grantedKeys, grantedKeysSelect } from '../auth/role-permissions.js';

export const BCRYPT_ROUNDS = 12;

// The password hash must never leave the service.
const omitPassword = { password: true } as const;

// Without users.manage.all you can only manage users, and hand out roles,
// that are strictly less powerful than you: their permissions are a proper
// subset of yours. So nobody can promote themselves or touch a peer or superior.
const outranks = (actor: AuthUser, permissions: ReadonlySet<Permission>) =>
  actor.permissions.has(USERS_MANAGE_ALL) ||
  isStrictSubset(permissions, actor.permissions);

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, actor: AuthUser) {
    await this.assertCanAssignRole(actor, createUserDto.role_id);
    const data = await this.toData(createUserDto);
    return this.handleConstraintErrors(() =>
      this.prisma.user.create({ data, omit: omitPassword }),
    );
  }

  findAll() {
    return this.prisma.user.findMany({ omit: omitPassword, orderBy: { id: 'asc' } });
  }

  async findOne(id: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id }, omit: omitPassword });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async update(id: bigint, updateUserDto: UpdateUserDto, actor: AuthUser) {
    const target = await this.findTarget(id);
    const isSelf = target.id === actor.id;
    const { role_id, is_active } = updateUserDto;
    const roleChanges =
      role_id !== undefined && (role_id === null ? null : BigInt(role_id)) !== target.role_id;

    if (isSelf && is_active === false) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    if (!isSelf && !outranks(actor, parsePermissions(grantedKeys(target.role)))) {
      throw new ForbiddenException('You can only modify users whose role has fewer permissions than yours');
    }
    if (isSelf && roleChanges && !actor.permissions.has(USERS_MANAGE_ALL)) {
      throw new ForbiddenException('You cannot change your own role');
    }
    if (roleChanges) await this.assertCanAssignRole(actor, role_id);

    const data = await this.toData(updateUserDto);
    return this.handleConstraintErrors(() =>
      this.prisma.user.update({ where: { id }, data, omit: omitPassword }),
    );
  }

  async remove(id: bigint, actor: AuthUser) {
    const target = await this.findTarget(id);
    if (target.id === actor.id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    if (!outranks(actor, parsePermissions(grantedKeys(target.role)))) {
      throw new ForbiddenException('You can only delete users whose role has fewer permissions than yours');
    }
    return this.handleConstraintErrors(() =>
      this.prisma.user.delete({ where: { id }, omit: omitPassword }),
    );
  }

  // Auth only: includes the password hash.
  findForLogin(identifier: string) {
    const value = identifier.trim();
    return this.prisma.user.findFirst({
      // Emails are stored lowercase, so compare lowercase: the login works however it's typed.
      where: { OR: [{ email: value.toLowerCase() }, { nik: value }] },
      select: { id: true, password: true, is_active: true },
    });
  }

  // Auth only: what the guard needs on every request.
  findAuthUser(id: bigint) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, is_active: true, role: { select: { name: true, ...grantedKeysSelect } } },
    });
  }

  // Auth only: includes the password hash.
  findPasswordHash(id: bigint) {
    return this.prisma.user.findUnique({ where: { id }, select: { password: true } });
  }

  async setPassword(id: bigint, password: string) {
    await this.prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(password, BCRYPT_ROUNDS) },
      select: { id: true },
    });
  }

  private async findTarget(id: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role_id: true, role: { select: grantedKeysSelect } },
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  private async assertCanAssignRole(actor: AuthUser, roleId: string | null | undefined) {
    if (roleId === undefined || roleId === null) return;
    if (actor.permissions.has(USERS_MANAGE_ALL)) return;
    const role = await this.prisma.userRole.findUnique({
      where: { id: BigInt(roleId) },
      select: grantedKeysSelect,
    });
    // A missing role is left to the foreign key, which returns 409.
    if (role && !outranks(actor, parsePermissions(grantedKeys(role)))) {
      throw new ForbiddenException('You can only assign roles with fewer permissions than your own');
    }
  }

  private async toData(dto: UpdateUserDto) {
    const { role_id, password, ...rest } = dto;
    return {
      ...rest,
      ...(role_id !== undefined && { role_id: role_id === null ? null : BigInt(role_id) }),
      ...(password !== undefined && { password: await bcrypt.hash(password, BCRYPT_ROUNDS) }),
    } as Prisma.UserUncheckedCreateInput;
  }

  private async handleConstraintErrors<T>(query: () => Promise<T>): Promise<T> {
    try {
      return await query();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') throw new ConflictException('Email or NIK is already in use');
        if (e.code === 'P2003') {
          throw new ConflictException('Referenced record does not exist, or the user is still referenced by other records');
        }
      }
      throw e;
    }
  }
}
