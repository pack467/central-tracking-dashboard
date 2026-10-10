import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ALL, definedPermissions, resolvePermissions } from '../auth/permissions.js';
import { seededKeys } from '../../test/helpers/seeded-roles.js';
import { RolesService } from './roles.service.js';

const grants = (keys: string[]) => keys.map((permission_key) => ({ permission_key }));

// Actors as AuthGuard builds them, plus their role as stored (for "*").
const actor = (id: bigint, roleId: bigint, keys: string[]) => ({
  user: { id, role: 'X', permissions: resolvePermissions(keys) } as AuthUser,
  row: { role_id: roleId, role: { permissions: grants(keys) } },
});
const superAdmin = actor(10n, 1n, seededKeys('SUPER_ADMIN')); // ["*"]
// A delegated role manager: has roles.manage but not "*" and not users.manage.all.
const manager = actor(20n, 9n, ['roles.manage', 'roles.read', 'tickets.read', 'tickets.write', 'users.read']);

const roleRow = (id: bigint, keys: string[], users = 0) => ({
  id,
  name: `ROLE_${id}`,
  info: null,
  created_at: new Date(),
  updated_at: new Date(),
  permissions: grants(keys),
  _count: { users },
});

// What the permissions table holds: every defined key and "*", plus one key the
// code no longer defines.
const CATALOGUE = new Map<string, { key: string; obsolete_at: Date | null }>([
  ...definedPermissions().map((d) => [d.key as string, { key: d.key as string, obsolete_at: null }] as const),
  [ALL, { key: ALL, obsolete_at: null }],
  ['reports.export', { key: 'reports.export', obsolete_at: new Date() }],
]);

describe('RolesService', () => {
  let service: RolesService;
  const prisma = {
    userRole: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    permission: { findMany: vi.fn() },
  };
  const as = (a: typeof superAdmin) => prisma.user.findUnique.mockResolvedValue(a.row);
  // The grants a create/update wrote, as keys.
  const createdKeys = () => prisma.userRole.create.mock.calls[0][0].data.permissions.create.map((g: any) => g.permission_key);
  const updatedKeys = () => prisma.userRole.update.mock.calls[0][0].data.permissions.create.map((g: any) => g.permission_key);

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.userRole.findFirst.mockResolvedValue(null); // names are free
    prisma.permission.findMany.mockImplementation(({ where }) =>
      Promise.resolve(where.key.in.filter((k: string) => CATALOGUE.has(k)).map((k: string) => CATALOGUE.get(k))),
    );
    prisma.userRole.create.mockImplementation(({ data }) =>
      Promise.resolve({ ...roleRow(99n, []), permissions: data.permissions.create }),
    );
    prisma.userRole.update.mockImplementation(({ where, data }) =>
      Promise.resolve({ ...roleRow(where.id, []), permissions: data.permissions?.create ?? [] }),
    );
    prisma.userRole.delete.mockImplementation(({ where }) => Promise.resolve(roleRow(where.id, [])));
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(RolesService);
  });

  it('returns stored and effective permissions with the user count', async () => {
    prisma.userRole.findUnique.mockResolvedValue(roleRow(1n, ['*'], 4));
    const role = await service.findOne(1n);
    expect(role.permissions).toEqual(['*']);
    expect(role.effective_permissions).toEqual(definedPermissions().map((d) => d.key));
    expect(role.user_count).toBe(4);
  });

  it('drops obsolete keys from effective permissions but still shows them as stored', async () => {
    prisma.userRole.findUnique.mockResolvedValue(roleRow(6n, ['reports.export', 'tickets.read']));
    const role = await service.findOne(6n);
    expect(role.permissions).toEqual(['reports.export', 'tickets.read']);
    expect(role.effective_permissions).toEqual(['tickets.read']);
  });

  it('throws NotFound for a missing role', async () => {
    prisma.userRole.findUnique.mockResolvedValue(null);
    await expect(service.findOne(99n)).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('create', () => {
    it('writes one sorted grant row per permission', async () => {
      as(superAdmin);
      await service.create(
        { name: ' Supervisor ', permissions: ['users.read', 'tickets.read', 'tickets.write'] },
        superAdmin.user,
      );
      expect(prisma.userRole.create.mock.calls[0][0].data.name).toBe('Supervisor');
      expect(createdKeys()).toEqual(['tickets.read', 'tickets.write', 'users.read']);
    });

    it('rejects a key that is not in the catalogue', async () => {
      as(superAdmin);
      await expect(
        service.create({ name: 'X', permissions: ['tickets.read', 'tickets.fly'] }, superAdmin.user),
      ).rejects.toThrow('Unknown permission(s): tickets.fly');
    });

    it('rejects an obsolete key', async () => {
      as(superAdmin);
      const error = await service.create({ name: 'X', permissions: ['reports.export'] }, superAdmin.user).catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Obsolete permission(s): reports.export');
    });

    it('lets a "*" holder grant "*"', async () => {
      as(superAdmin);
      await service.create({ name: 'ROOT2', permissions: ['*'] }, superAdmin.user);
      expect(createdKeys()).toEqual(['*']);
    });

    it('stops granting "*" without holding "*"', async () => {
      as(manager);
      await expect(service.create({ name: 'X', permissions: ['*'] }, manager.user)).rejects.toThrow(
        'Only a role that has "*" can grant "*"',
      );
    });

    it('stops granting a permission the actor lacks', async () => {
      as(manager);
      await expect(
        service.create({ name: 'X', permissions: ['tickets.read', 'users.manage.all'] }, manager.user),
      ).rejects.toThrow('missing: users.manage.all');
      expect(prisma.userRole.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate name', async () => {
      as(superAdmin);
      prisma.userRole.findFirst.mockResolvedValue({ id: 2n });
      await expect(
        service.create({ name: 'admin', permissions: ['tickets.read'] }, superAdmin.user),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update and set permissions', () => {
    it('replaces all grants in one update', async () => {
      as(manager);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(5n, ['tickets.read']));
      await service.setPermissions(5n, ['tickets.write', 'tickets.read'], manager.user);
      expect(prisma.userRole.update.mock.calls[0][0].data.permissions.deleteMany).toEqual({});
      expect(updatedKeys()).toEqual(['tickets.read', 'tickets.write']);
    });

    it('leaves grants alone when only the name changes', async () => {
      as(superAdmin);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(4n, ['tickets.read']));
      await service.update(4n, { name: 'AGENT' }, superAdmin.user);
      expect(prisma.userRole.update.mock.calls[0][0].data).toEqual({ name: 'AGENT' });
      expect(prisma.userRole.findFirst.mock.calls[0][0].where.id).toEqual({ not: 4n });
    });

    it.each([
      ['a "*" role', ['*']],
      ['a role with a permission the actor lacks', ['users.manage']],
    ])('stops modifying %s', async (_case, keys) => {
      as(manager);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(1n, keys));
      await expect(service.update(1n, { info: 'x' }, manager.user)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.userRole.update).not.toHaveBeenCalled();
    });

    it('stops removing roles.manage from your own role', async () => {
      as(superAdmin);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(1n, ['*']));
      await expect(service.setPermissions(1n, ['tickets.read'], superAdmin.user)).rejects.toThrow(
        'You cannot remove roles.manage from your own role',
      );
    });

    it('allows replacing "*" on your own role with a list that keeps roles.manage', async () => {
      as(superAdmin);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(1n, ['*']));
      await service.setPermissions(1n, ['roles.manage', 'tickets.read'], superAdmin.user);
      expect(prisma.userRole.update).toHaveBeenCalled();
    });
  });

  describe('grant and revoke one', () => {
    it('grants a key by writing the full new set', async () => {
      as(superAdmin);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(2n, ['tickets.read']));
      await service.grant(2n, 'tickets.delete', superAdmin.user);
      expect(updatedKeys()).toEqual(['tickets.delete', 'tickets.read']);
    });

    it('does nothing when the role already has the key', async () => {
      as(superAdmin);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(2n, ['tickets.read']));
      const role = await service.grant(2n, 'tickets.read', superAdmin.user);
      expect(role.permissions).toEqual(['tickets.read']);
      expect(prisma.userRole.update).not.toHaveBeenCalled();
    });

    it('rejects granting an unknown key', async () => {
      as(superAdmin);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(2n, ['tickets.read']));
      await expect(service.grant(2n, 'tickets.fly', superAdmin.user)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('revokes a key', async () => {
      as(superAdmin);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(2n, ['tickets.delete', 'tickets.read']));
      await service.revoke(2n, 'tickets.delete', superAdmin.user);
      expect(updatedKeys()).toEqual(['tickets.read']);
    });

    it('does nothing when the role does not have the key', async () => {
      as(superAdmin);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(2n, ['tickets.read']));
      await service.revoke(2n, 'tickets.delete', superAdmin.user);
      expect(prisma.userRole.update).not.toHaveBeenCalled();
    });

    it('stops revoking "*" from your own role (it is your roles.manage)', async () => {
      as(superAdmin);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(1n, ['*']));
      await expect(service.revoke(1n, '*', superAdmin.user)).rejects.toThrow(
        'You cannot remove roles.manage from your own role',
      );
    });
  });

  describe('remove', () => {
    it('deletes a role nobody has', async () => {
      as(superAdmin);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(6n, ['tickets.read'], 0));
      await service.remove(6n, superAdmin.user);
      expect(prisma.userRole.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 6n } }));
    });

    it('refuses while users still have the role', async () => {
      as(superAdmin);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(4n, ['tickets.read'], 12));
      await expect(service.remove(4n, superAdmin.user)).rejects.toThrow('assigned to 12 users');
      expect(prisma.userRole.delete).not.toHaveBeenCalled();
    });

    it('refuses to delete your own role', async () => {
      as(superAdmin);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(1n, ['*'], 0));
      await expect(service.remove(1n, superAdmin.user)).rejects.toThrow('You cannot delete your own role');
    });

    it('refuses to delete a role above the actor', async () => {
      as(manager);
      prisma.userRole.findUnique.mockResolvedValue(roleRow(1n, ['*'], 0));
      await expect(service.remove(1n, manager.user)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
