import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { DEFAULT_ROLE_PERMISSIONS, resolvePermissions, toStoredPermissions } from '../auth/permissions.js';
import { UsersService } from './users.service.js';

// Role ids as seeded (1 SUPER_ADMIN … 5 VIEWER) with their default permissions,
// plus two custom roles a future roles endpoint could create.
const ROLE_PRIVILEGES: Record<string, string[]> = {
  '1': toStoredPermissions(DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN),
  '2': toStoredPermissions(DEFAULT_ROLE_PERMISSIONS.ADMIN),
  '3': toStoredPermissions(DEFAULT_ROLE_PERMISSIONS.TEAM_LEAD),
  '4': toStoredPermissions(DEFAULT_ROLE_PERMISSIONS.AGENT),
  '5': toStoredPermissions(DEFAULT_ROLE_PERMISSIONS.VIEWER),
  // Below ADMIN: a subset of its permissions.
  '6': toStoredPermissions(['tickets.read', 'tickets.write', 'tickets.delete']),
  // Not below ADMIN: has users.manage.all, which ADMIN lacks.
  '7': toStoredPermissions(['tickets.read', 'users.manage.all']),
};

const withDefaults = (id: bigint, role: string): AuthUser => ({
  id,
  role,
  permissions: resolvePermissions(DEFAULT_ROLE_PERMISSIONS[role]),
});
const superAdmin = withDefaults(100n, 'SUPER_ADMIN');
const admin = withDefaults(200n, 'ADMIN');

// A user row as findTarget sees it.
const userWithRole = (id: bigint, roleId: number | null) => ({
  id,
  role_id: roleId === null ? null : BigInt(roleId),
  role: roleId === null ? null : { privilege: ROLE_PRIVILEGES[String(roleId)] },
});

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userRole: { findUnique: vi.fn() },
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.userRole.findUnique.mockImplementation(({ where }) => {
      const privilege = ROLE_PRIVILEGES[where.id.toString()];
      return Promise.resolve(privilege ? { privilege } : null);
    });
    prisma.user.create.mockResolvedValue({ id: 1n });
    prisma.user.update.mockResolvedValue({ id: 1n });
    prisma.user.delete.mockResolvedValue({ id: 1n });

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hashes the password, converts role_id to BigInt and omits the hash', async () => {
    await service.create(
      { name: 'A', email: 'a@x.com', role_id: '4', password: 'secret123' },
      superAdmin,
    );

    const { data, omit } = prisma.user.create.mock.calls[0][0];
    expect(data.role_id).toBe(4n);
    expect(data.password).not.toBe('secret123');
    expect(await bcrypt.compare('secret123', data.password)).toBe(true);
    expect(omit).toEqual({ password: true });
  });

  it('does not touch password or role_id when they are not sent', async () => {
    prisma.user.findUnique.mockResolvedValue(userWithRole(1n, 4));
    await service.update(1n, { name: 'B' }, superAdmin);

    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ name: 'B' });
  });

  it('clears the role when role_id is null', async () => {
    prisma.user.findUnique.mockResolvedValue(userWithRole(1n, 4));
    await service.update(1n, { role_id: null }, superAdmin);

    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ role_id: null });
  });

  it('throws NotFound for a missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.findOne(99n)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(99n, { name: 'B' }, superAdmin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maps a unique-constraint violation to 409', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(service.create({ name: 'A', email: 'a@x.com' }, superAdmin)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('maps a foreign-key violation on delete to 409', async () => {
    prisma.user.findUnique.mockResolvedValue(userWithRole(1n, 4));
    prisma.user.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: 'test' }),
    );
    await expect(service.remove(1n, superAdmin)).rejects.toBeInstanceOf(ConflictException);
  });

  describe('role escalation rules', () => {
    describe('ADMIN', () => {
      it.each(['1', '2'])('cannot create a user with privileged role %s', async (roleId) => {
        await expect(
          service.create({ name: 'A', email: 'a@x.com', role_id: roleId }, admin),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.user.create).not.toHaveBeenCalled();
      });

      it.each(['3', '4', '5', null])('can create a user with role %s', async (roleId) => {
        await service.create({ name: 'A', email: 'a@x.com', role_id: roleId }, admin);
        expect(prisma.user.create).toHaveBeenCalled();
      });

      it('cannot promote an agent to SUPER_ADMIN or ADMIN', async () => {
        prisma.user.findUnique.mockResolvedValue(userWithRole(5n, 4));
        for (const roleId of ['1', '2']) {
          await expect(service.update(5n, { role_id: roleId }, admin)).rejects.toBeInstanceOf(
            ForbiddenException,
          );
        }
        expect(prisma.user.update).not.toHaveBeenCalled();
      });

      it('can move an agent to another non-privileged role', async () => {
        prisma.user.findUnique.mockResolvedValue(userWithRole(5n, 4));
        await service.update(5n, { role_id: '3' }, admin);
        expect(prisma.user.update).toHaveBeenCalled();
      });

      it('cannot change their own role, even to a lower one', async () => {
        prisma.user.findUnique.mockResolvedValue(userWithRole(admin.id, 2));
        await expect(service.update(admin.id, { role_id: '1' }, admin)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        await expect(service.update(admin.id, { role_id: '4' }, admin)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        expect(prisma.user.update).not.toHaveBeenCalled();
      });

      it('can resend their own unchanged role and edit their own profile', async () => {
        prisma.user.findUnique.mockResolvedValue(userWithRole(admin.id, 2));
        await service.update(admin.id, { role_id: '2', name: 'New name', password: 'new-pass-123' }, admin);
        expect(prisma.user.update).toHaveBeenCalled();
      });

      it.each([
        ['a super admin', 1],
        ['another admin', 2],
      ])('cannot edit %s', async (_case, roleId) => {
        prisma.user.findUnique.mockResolvedValue(userWithRole(7n, roleId));
        for (const dto of [{ name: 'x' }, { password: 'hijack-pass-1' }, { is_active: false }]) {
          await expect(service.update(7n, dto, admin)).rejects.toBeInstanceOf(ForbiddenException);
        }
        expect(prisma.user.update).not.toHaveBeenCalled();
      });

      it.each([
        ['a super admin', 1],
        ['another admin', 2],
      ])('cannot delete %s', async (_case, roleId) => {
        prisma.user.findUnique.mockResolvedValue(userWithRole(7n, roleId));
        await expect(service.remove(7n, admin)).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.user.delete).not.toHaveBeenCalled();
      });

      it('can delete an agent', async () => {
        prisma.user.findUnique.mockResolvedValue(userWithRole(5n, 4));
        await service.remove(5n, admin);
        expect(prisma.user.delete).toHaveBeenCalled();
      });
    });

    describe('custom roles (as a future roles endpoint could create)', () => {
      it('lets an ADMIN assign a custom role whose permissions are below theirs', async () => {
        await service.create({ name: 'A', email: 'a@x.com', role_id: '6' }, admin);
        expect(prisma.user.create).toHaveBeenCalled();
      });

      it('stops an ADMIN assigning or managing a wildcard ("*") role', async () => {
        // Role 1 (SUPER_ADMIN) is stored as ["*"].
        await expect(
          service.create({ name: 'A', email: 'a@x.com', role_id: '1' }, admin),
        ).rejects.toBeInstanceOf(ForbiddenException);
        prisma.user.findUnique.mockResolvedValue(userWithRole(9n, 1));
        await expect(service.remove(9n, admin)).rejects.toBeInstanceOf(ForbiddenException);
      });

      it('stops an ADMIN assigning a custom role with a permission they lack', async () => {
        await expect(
          service.create({ name: 'A', email: 'a@x.com', role_id: '7' }, admin),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });

      it('stops an ADMIN editing a user whose custom role has a permission they lack', async () => {
        prisma.user.findUnique.mockResolvedValue(userWithRole(7n, 7));
        await expect(service.update(7n, { name: 'x' }, admin)).rejects.toBeInstanceOf(ForbiddenException);
      });

      it('treats a role with unreadable permissions as having none (manageable by an ADMIN)', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: 7n, role_id: 8n, role: { privilege: ['bogus.permission'] } });
        await service.update(7n, { name: 'x' }, admin);
        expect(prisma.user.update).toHaveBeenCalled();
      });

      it('lets a user without users.manage.all manage nobody above them, whatever their role is called', async () => {
        const manager = { id: 300n, role: 'ADMIN', permissions: new Set(['users.manage', 'users.read'] as const) };
        prisma.user.findUnique.mockResolvedValue(userWithRole(5n, 4)); // an AGENT has tickets.* perms the actor lacks
        await expect(service.update(5n, { name: 'x' }, manager)).rejects.toBeInstanceOf(ForbiddenException);
      });
    });

    describe('SUPER_ADMIN', () => {
      it('can assign any role and manage admins', async () => {
        await service.create({ name: 'A', email: 'a@x.com', role_id: '1' }, superAdmin);
        prisma.user.findUnique.mockResolvedValue(userWithRole(7n, 2));
        await service.update(7n, { role_id: '1' }, superAdmin);
        await service.remove(7n, superAdmin);

        expect(prisma.user.create).toHaveBeenCalled();
        expect(prisma.user.update).toHaveBeenCalled();
        expect(prisma.user.delete).toHaveBeenCalled();
      });
    });

    describe.each([
      ['SUPER_ADMIN', superAdmin, 1],
      ['ADMIN', admin, 2],
    ])('%s acting on themselves', (_role, actor, roleId) => {
      beforeEach(() => {
        prisma.user.findUnique.mockResolvedValue(userWithRole(actor.id, roleId));
      });

      it('cannot deactivate their own account', async () => {
        await expect(service.update(actor.id, { is_active: false }, actor)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        expect(prisma.user.update).not.toHaveBeenCalled();
      });

      it('cannot delete their own account', async () => {
        await expect(service.remove(actor.id, actor)).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.user.delete).not.toHaveBeenCalled();
      });
    });
  });
});
