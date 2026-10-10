import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ALL, definedPermissions } from '../auth/permissions.js';
import '../../test/helpers/seeded-roles.js'; // registers every module's permissions
import { PermissionsService } from './permissions.service.js';

const row = (key: string, description: string | null = 'x', obsolete_at: Date | null = null) => ({
  key,
  description,
  obsolete_at,
});

describe('PermissionsService', () => {
  let service: PermissionsService;
  const prisma = {
    permission: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const definedKeys = () => [...definedPermissions().map((d) => d.key as string), ALL];

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PermissionsService);
    // Silence the sync's log lines in test output.
    vi.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    vi.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
  });

  describe('sync', () => {
    it('adds every defined key and "*" to an empty table, with the code descriptions', async () => {
      prisma.permission.findMany.mockResolvedValue([]);
      const result = await service.sync();

      const { data, skipDuplicates } = prisma.permission.createMany.mock.calls[0][0];
      expect(skipDuplicates).toBe(true);
      expect(data.map((d: any) => d.key).sort()).toEqual(definedKeys().sort());
      expect(data.find((d: any) => d.key === 'tickets.read').description).toMatch(/Read tickets/);
      expect(result.obsolete).toEqual([]);
    });

    it('fills a missing description (e.g. a key created by the seed) but keeps an edited one', async () => {
      prisma.permission.findMany.mockResolvedValue(
        definedKeys().map((k) =>
          k === 'tickets.read' ? row(k, null) : k === 'users.read' ? row(k, 'Edited by an admin') : row(k),
        ),
      );
      const result = await service.sync();

      expect(prisma.permission.createMany).not.toHaveBeenCalled();
      expect(result.described).toEqual(['tickets.read']);
      expect(prisma.permission.update).toHaveBeenCalledTimes(1);
      expect(prisma.permission.update.mock.calls[0][0].where).toEqual({ key: 'tickets.read' });
    });

    it('marks keys the code no longer defines as obsolete, without deleting them', async () => {
      prisma.permission.findMany.mockResolvedValue([...definedKeys().map((k) => row(k)), row('reports.export')]);
      const result = await service.sync();

      expect(result.obsolete).toEqual(['reports.export']);
      const { where, data } = prisma.permission.updateMany.mock.calls[0][0];
      expect(where).toEqual({ key: { in: ['reports.export'] } });
      expect(data.obsolete_at).toBeInstanceOf(Date);
    });

    it('un-marks an obsolete key that the code defines again', async () => {
      prisma.permission.findMany.mockResolvedValue(
        definedKeys().map((k) => (k === 'tickets.delete' ? row(k, 'x', new Date()) : row(k))),
      );
      const result = await service.sync();

      expect(result.restored).toEqual(['tickets.delete']);
      expect(prisma.permission.updateMany).toHaveBeenCalledWith({
        where: { key: { in: ['tickets.delete'] } },
        data: { obsolete_at: null },
      });
    });

    it('changes nothing when the table already matches the code', async () => {
      prisma.permission.findMany.mockResolvedValue(definedKeys().map((k) => row(k)));
      await service.sync();
      expect(prisma.permission.createMany).not.toHaveBeenCalled();
      expect(prisma.permission.update).not.toHaveBeenCalled();
      expect(prisma.permission.updateMany).not.toHaveBeenCalled();
    });
  });

  it('lists permissions with an obsolete flag and the roles that have them', async () => {
    prisma.permission.findMany.mockResolvedValue([
      {
        ...row('tickets.delete'),
        created_at: new Date(),
        updated_at: new Date(),
        roles: [{ role: { id: 2n, name: 'ADMIN' } }],
      },
      { ...row('reports.export', 'x', new Date()), created_at: new Date(), updated_at: new Date(), roles: [] },
    ]);
    const list = await service.findAll();
    expect(list[0]).toMatchObject({ key: 'tickets.delete', obsolete: false, roles: [{ id: 2n, name: 'ADMIN' }] });
    expect(list[1]).toMatchObject({ key: 'reports.export', obsolete: true, roles: [] });
  });

  it('returns 404 when editing the description of an unknown key', async () => {
    prisma.permission.findUnique.mockResolvedValue(null);
    await expect(service.updateDescription('tickets.fly', 'x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
