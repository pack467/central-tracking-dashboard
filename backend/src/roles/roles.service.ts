import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ALL, resolvePermissions, toStoredPermissions } from '../auth/permissions.js';
import { grantedKeys, grantedKeysSelect } from '../auth/role-permissions.js';
import { ROLES_MANAGE } from './roles.permissions.js';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto.js';

const withDetails = { ...grantedKeysSelect, _count: { select: { users: true } } } as const;

type RoleRow = {
  id: bigint;
  name: string;
  info: string | null;
  created_at: Date;
  updated_at: Date;
  permissions: { permission_key: string }[];
  _count: { users: number };
};

const toResponse = (role: RoleRow) => {
  const keys = toStoredPermissions(grantedKeys(role));
  return {
    id: role.id,
    name: role.name,
    info: role.info,
    permissions: keys,
    effective_permissions: [...resolvePermissions(keys)].sort(),
    user_count: role._count.users,
    created_at: role.created_at,
    updated_at: role.updated_at,
  };
};

const grantRows = (keys: string[]) => toStoredPermissions(keys).map((permission_key) => ({ permission_key }));

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.userRole.findMany({ orderBy: { id: 'asc' }, include: withDetails });
    return roles.map(toResponse);
  }

  async findOne(id: bigint) {
    return toResponse(await this.findRow(id));
  }

  async create(dto: CreateRoleDto, actor: AuthUser) {
    const own = await this.actorRole(actor);
    await this.assertGrantable(dto.permissions);
    this.assertCanGrant(actor, own.keys, dto.permissions);
    await this.assertNameFree(dto.name);
    const role = await this.prisma.userRole.create({
      data: {
        name: dto.name.trim(),
        info: dto.info ?? null,
        permissions: { create: grantRows(dto.permissions) },
      },
      include: withDetails,
    });
    return toResponse(role);
  }

  async update(id: bigint, dto: UpdateRoleDto, actor: AuthUser) {
    const role = await this.findRow(id);
    const own = await this.actorRole(actor);
    this.assertCanModify(actor, own.keys, role);

    if (dto.permissions !== undefined) {
      await this.assertGrantable(dto.permissions);
      this.assertCanGrant(actor, own.keys, dto.permissions);
      // Never let someone lock themselves (and possibly everyone) out of role management.
      if (role.id === own.role_id && !resolvePermissions(dto.permissions).has(ROLES_MANAGE)) {
        throw new ForbiddenException('You cannot remove roles.manage from your own role');
      }
    }
    if (dto.name !== undefined) await this.assertNameFree(dto.name, id);

    const updated = await this.prisma.userRole.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.info !== undefined && { info: dto.info }),
        // Replace the grants in the same statement (one transaction).
        ...(dto.permissions !== undefined && {
          permissions: { deleteMany: {}, create: grantRows(dto.permissions) },
        }),
      },
      include: withDetails,
    });
    return toResponse(updated);
  }

  setPermissions(id: bigint, permissions: string[], actor: AuthUser) {
    return this.update(id, { permissions }, actor);
  }

  // Idempotent: granting a key the role already has returns it unchanged.
  async grant(id: bigint, key: string, actor: AuthUser) {
    const role = await this.findRow(id);
    const keys = grantedKeys(role);
    if (keys.includes(key)) return toResponse(role);
    return this.setPermissions(id, [...keys, key], actor);
  }

  // Idempotent: revoking a key the role doesn't have returns it unchanged.
  async revoke(id: bigint, key: string, actor: AuthUser) {
    const role = await this.findRow(id);
    const keys = grantedKeys(role);
    if (!keys.includes(key)) return toResponse(role);
    return this.setPermissions(id, keys.filter((k) => k !== key), actor);
  }

  async remove(id: bigint, actor: AuthUser) {
    const role = await this.findRow(id);
    const own = await this.actorRole(actor);
    this.assertCanModify(actor, own.keys, role);
    if (role.id === own.role_id) throw new ForbiddenException('You cannot delete your own role');
    // The FK would silently set these users' role to null; make the caller move them first.
    const users = role._count.users;
    if (users) {
      throw new ConflictException(
        `Role #${id} is assigned to ${users} user${users === 1 ? '' : 's'}; move them to another role first`,
      );
    }
    // Its grants go with it (ON DELETE CASCADE).
    const deleted = await this.prisma.userRole.delete({ where: { id }, include: withDetails });
    return toResponse(deleted);
  }

  private async findRow(id: bigint) {
    const role = await this.prisma.userRole.findUnique({ where: { id }, include: withDetails });
    if (!role) throw new NotFoundException(`Role #${id} not found`);
    return role;
  }

  // The actor's own role as stored: needed to know whether they hold "*" itself
  // (actor.permissions only has the expanded list).
  private async actorRole(actor: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { role_id: true, role: { select: grantedKeysSelect } },
    });
    return { role_id: user?.role_id ?? null, keys: grantedKeys(user?.role) };
  }

  // Keys must exist in the catalogue and still be defined by the code.
  private async assertGrantable(keys: string[]) {
    if (!keys.length) return;
    const rows = await this.prisma.permission.findMany({
      where: { key: { in: keys } },
      select: { key: true, obsolete_at: true },
    });
    const known = new Map(rows.map((r) => [r.key, r]));
    const unknown = keys.filter((k) => !known.has(k));
    if (unknown.length) throw new BadRequestException(`Unknown permission(s): ${unknown.join(', ')}`);
    const obsolete = keys.filter((k) => known.get(k)!.obsolete_at);
    if (obsolete.length) throw new BadRequestException(`Obsolete permission(s): ${obsolete.join(', ')}`);
  }

  // You can only hand out what you have, and "*" only if your own role has "*"
  // (otherwise you'd grant future permissions you don't have).
  private assertCanGrant(actor: AuthUser, ownKeys: readonly string[], requested: readonly string[]) {
    if (requested.includes(ALL) && !ownKeys.includes(ALL)) {
      throw new ForbiddenException('Only a role that has "*" can grant "*"');
    }
    const missing = [...resolvePermissions(requested)].filter((p) => !actor.permissions.has(p));
    if (missing.length) {
      throw new ForbiddenException(`You can only grant permissions you have; missing: ${missing.join(', ')}`);
    }
  }

  // You can only change or delete roles that don't exceed your own permissions.
  private assertCanModify(actor: AuthUser, ownKeys: readonly string[], role: RoleRow) {
    const keys = grantedKeys(role);
    const exceeds =
      (keys.includes(ALL) && !ownKeys.includes(ALL)) ||
      [...resolvePermissions(keys)].some((p) => !actor.permissions.has(p));
    if (exceeds) throw new ForbiddenException('You cannot modify a role with permissions you do not have');
  }

  private async assertNameFree(name: string, exceptId?: bigint) {
    const clash = await this.prisma.userRole.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        ...(exceptId && { id: { not: exceptId } }),
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException(`A role named "${name.trim()}" already exists`);
  }
}
