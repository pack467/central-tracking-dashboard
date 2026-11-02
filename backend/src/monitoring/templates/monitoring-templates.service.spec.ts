import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from '../../auth/auth.types.js';
import { seededPermissions } from '../../../test/helpers/seeded-roles.js';
import { MonitoringTemplatesService } from './monitoring-templates.service.js';

const lead: AuthUser = { id: 10n, role: 'TEAM_LEAD', permissions: seededPermissions('TEAM_LEAD') };

describe('MonitoringTemplatesService', () => {
  let service: MonitoringTemplatesService;
  const prisma = {
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    monitoringTemplate: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    monitoringLog: { count: vi.fn() },
    project: { findUnique: vi.fn() },
    client: { findUnique: vi.fn() },
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
    // Every referenced record exists, unless a test says otherwise.
    prisma.project.findUnique.mockResolvedValue({ id: 1n });
    prisma.client.findUnique.mockResolvedValue({ id: 1n });
    prisma.monitoringTemplate.create.mockImplementation(({ data }) => Promise.resolve({ id: 1n, ...data }));
    prisma.monitoringTemplate.update.mockImplementation(({ data }) => Promise.resolve({ id: 1n, ...data }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringTemplatesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(MonitoringTemplatesService);
  });

  describe('findAll', () => {
    it('paginates, sorts with an id tie-break and builds filters', async () => {
      prisma.monitoringTemplate.findMany.mockResolvedValue([]);
      prisma.monitoringTemplate.count.mockResolvedValue(45);

      const result = await service.findAll({
        page: 2,
        limit: 20,
        sort: 'name',
        order: 'asc',
        client_id: '2',
        project: 'mediation',
        is_active: false,
        q: 'lastcoll',
      });

      expect(result.meta).toEqual({ page: 2, limit: 20, total: 45, total_pages: 3 });
      const args = prisma.monitoringTemplate.findMany.mock.calls[0][0];
      expect(args.skip).toBe(20);
      expect(args.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
      expect(args.where).toEqual({
        client_id: 2n,
        project: { name: { contains: 'mediation', mode: 'insensitive' } },
        is_active: false,
        OR: [
          { name: { contains: 'lastcoll', mode: 'insensitive' } },
          { instructions: { contains: 'lastcoll', mode: 'insensitive' } },
        ],
      });
    });
  });

  it('lists in order of the day by default: by time, then by name', async () => {
    prisma.monitoringTemplate.findMany.mockResolvedValue([]);
    prisma.monitoringTemplate.count.mockResolvedValue(0);

    await service.findAll({ project_id: '1', times: '09:00' });

    const args = prisma.monitoringTemplate.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual([{ times: 'asc' }, { name: 'asc' }, { id: 'asc' }]);
    expect(args.where).toEqual({ project_id: 1n, times: '09:00' });
  });

  describe('create', () => {
    it('records the creator and leaves unsent settings to the column defaults', async () => {
      await service.create({ project_id: '1', name: 'Check lastcoll', times: '09:00' }, lead);

      const { data } = prisma.monitoringTemplate.create.mock.calls[0][0];
      expect(data).toMatchObject({
        project_id: 1n,
        user_creator_id: lead.id,
        times: '09:00',
        instructions: null,
        client_id: null,
        active_from: null,
        active_until: null,
      });
      expect(data.timezone).toBeUndefined();
      expect(data.is_active).toBeUndefined();
    });

    it('stores the active dates as calendar days', async () => {
      await service.create(
        { project_id: '1', name: 'n', times: '09:00', active_from: '2026-11-01', active_until: '2026-11-30' },
        lead,
      );
      const { data } = prisma.monitoringTemplate.create.mock.calls[0][0];
      expect(data.active_from).toEqual(new Date('2026-11-01T00:00:00Z'));
      expect(data.active_until).toEqual(new Date('2026-11-30T00:00:00Z'));
    });

    it('rejects an unknown project or client', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(service.create({ project_id: '9', name: 'n', times: '09:00' }, lead)).rejects.toThrow(
        'project_id 9 does not exist',
      );

      prisma.project.findUnique.mockResolvedValue({ id: 1n });
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ project_id: '1', name: 'n', times: '09:00', client_id: '4' }, lead),
      ).rejects.toThrow('client_id 4 does not exist');
      expect(prisma.monitoringTemplate.create).not.toHaveBeenCalled();
    });

    it('rejects active_until before active_from', async () => {
      await expect(
        service.create(
          { project_id: '1', name: 'n', times: '09:00', active_from: '2026-11-10', active_until: '2026-11-01' },
          lead,
        ),
      ).rejects.toThrow('active_until cannot be before active_from');
    });
  });

  describe('update', () => {
    const stored = (over: Record<string, unknown> = {}) => ({ active_from: null, active_until: null, ...over });

    it('throws NotFound for a missing template', async () => {
      prisma.monitoringTemplate.findUnique.mockResolvedValue(null);
      await expect(service.update(1n, { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('changes only what is sent', async () => {
      prisma.monitoringTemplate.findUnique.mockResolvedValue(stored());
      await service.update(1n, { name: 'x', is_active: false, times: '14:00' });
      expect(prisma.monitoringTemplate.update.mock.calls[0][0].data).toEqual({
        name: 'x',
        is_active: false,
        times: '14:00',
      });
    });

    it('clears optional fields with null', async () => {
      prisma.monitoringTemplate.findUnique.mockResolvedValue(stored({ active_until: new Date('2026-12-01') }));
      await service.update(1n, { instructions: null, client_id: null, active_until: null });
      expect(prisma.monitoringTemplate.update.mock.calls[0][0].data).toEqual({
        instructions: null,
        client_id: null,
        active_until: null,
      });
    });

    it('checks the date range against the stored dates', async () => {
      prisma.monitoringTemplate.findUnique.mockResolvedValue(stored({ active_from: new Date('2026-11-10') }));
      await expect(service.update(1n, { active_until: '2026-11-01' })).rejects.toThrow(
        'active_until cannot be before active_from',
      );
      expect(prisma.monitoringTemplate.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      prisma.monitoringTemplate.findUnique.mockResolvedValue({ id: 1n });
    });

    it('refuses while the template has logs (switch it off instead)', async () => {
      prisma.monitoringLog.count.mockResolvedValue(3);
      const error = await service.remove(1n).catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toMatch(/has 3 logs; switch it off/);
      expect(prisma.monitoringTemplate.delete).not.toHaveBeenCalled();
    });

    it('deletes a template without logs', async () => {
      prisma.monitoringLog.count.mockResolvedValue(0);
      await service.remove(1n);
      expect(prisma.monitoringTemplate.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1n } }));
    });
  });
});
