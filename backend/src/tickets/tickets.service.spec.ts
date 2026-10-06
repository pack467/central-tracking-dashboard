import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { DEFAULT_ROLE_PERMISSIONS, resolvePermissions } from '../auth/permissions.js';
import { TicketsService } from './tickets.service.js';

const lead: AuthUser = { id: 10n, role: 'TEAM_LEAD', permissions: resolvePermissions(DEFAULT_ROLE_PERMISSIONS.TEAM_LEAD) };
const agent: AuthUser = { id: 20n, role: 'AGENT', permissions: resolvePermissions(DEFAULT_ROLE_PERMISSIONS.AGENT) };

describe('TicketsService', () => {
  let service: TicketsService;
  const prisma = {
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    ticketLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    project: { findUnique: vi.fn() },
    tenant: { findUnique: vi.fn() },
    client: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    ticketSeverity: { findUnique: vi.fn() },
    ticketCategory: { findUnique: vi.fn() },
  };

  // The ticket as update() loads it.
  const existing = (over: Record<string, unknown> = {}) => ({
    user_id: agent.id,
    project_id: 3n,
    status: 'Open',
    open_at: new Date('2026-10-01T00:00:00Z'),
    closed_at: null,
    ...over,
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
    // Every referenced record exists and every user is active, unless a test says otherwise.
    prisma.project.findUnique.mockResolvedValue({ tenant_id: 1n });
    for (const model of [prisma.tenant, prisma.client, prisma.ticketSeverity, prisma.ticketCategory]) {
      model.findUnique.mockResolvedValue({ id: 1n });
    }
    prisma.user.findUnique.mockResolvedValue({ is_active: true });
    prisma.ticketLog.create.mockImplementation(({ data }) => Promise.resolve({ id: 1n, ...data }));
    prisma.ticketLog.update.mockImplementation(({ data }) => Promise.resolve({ id: 1n, ...data }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(TicketsService);
  });

  describe('findAll', () => {
    it('paginates and builds filters', async () => {
      prisma.ticketLog.findMany.mockResolvedValue([]);
      prisma.ticketLog.count.mockResolvedValue(45);

      const result = await service.findAll({
        page: 3,
        limit: 20,
        sort: 'open_at',
        order: 'desc',
        status: ['Open', 'Pending'],
        project_id: '3',
        q: 'mediation',
        open_from: '2026-01-01T00:00:00Z',
      });

      expect(result.meta).toEqual({ page: 3, limit: 20, total: 45, total_pages: 3 });
      const args = prisma.ticketLog.findMany.mock.calls[0][0];
      expect(args.skip).toBe(40);
      expect(args.take).toBe(20);
      expect(args.orderBy).toEqual([{ open_at: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }]);
      expect(args.where).toMatchObject({
        status: { in: ['Open', 'Pending'] },
        project_id: 3n,
        open_at: { gte: new Date('2026-01-01T00:00:00Z') },
      });
      expect(args.where.OR).toHaveLength(3);
    });
  });

  describe('summary', () => {
    it('reports every status, with 0 for missing ones', async () => {
      prisma.ticketLog.groupBy.mockResolvedValue([
        { status: 'Open', _count: { _all: 4 } },
        { status: 'Closed', _count: { _all: 6 } },
      ]);
      await expect(service.summary({})).resolves.toEqual({
        total: 10,
        by_status: { Open: 4, Closed: 6, Activity: 0, Meeting: 0, Pending: 0, ReOpen: 0 },
      });
    });
  });

  describe('create', () => {
    it('assigns to the creator, takes the tenant from the project, defaults to Open now', async () => {
      const ticket = await service.create({ subject: 'Node down', project_id: '3' }, lead);
      const { data } = prisma.ticketLog.create.mock.calls[0][0];
      expect(data).toMatchObject({ user_id: lead.id, project_id: 3n, tenant_id: 1n, status: 'Open', closed_at: null });
      expect(data.open_at).toBeInstanceOf(Date);
      expect(ticket).toBeDefined();
    });

    it('stamps closed_at when created as Closed', async () => {
      await service.create({ subject: 's', project_id: '3', status: 'Closed' }, lead);
      expect(prisma.ticketLog.create.mock.calls[0][0].data.closed_at).toBeInstanceOf(Date);
    });

    it('lets a team lead create an unassigned ticket or assign it to someone else', async () => {
      await service.create({ subject: 's', project_id: '3', user_id: null }, lead);
      await service.create({ subject: 's', project_id: '3', user_id: '99' }, lead);
      expect(prisma.ticketLog.create.mock.calls[0][0].data.user_id).toBeNull();
      expect(prisma.ticketLog.create.mock.calls[1][0].data.user_id).toBe(99n);
    });

    it.each([['someone else', '99'], ['nobody', null]])(
      'stops an agent assigning a new ticket to %s',
      async (_case, userId) => {
        await expect(
          service.create({ subject: 's', project_id: '3', user_id: userId }, agent),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.ticketLog.create).not.toHaveBeenCalled();
      },
    );

    it('rejects a project that does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(service.create({ subject: 's', project_id: '999' }, lead)).rejects.toThrow(
        'project_id 999 does not exist',
      );
    });

    it("rejects a tenant that doesn't match the project's", async () => {
      await expect(
        service.create({ subject: 's', project_id: '3', tenant_id: '2' }, lead),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects unknown references', async () => {
      prisma.ticketSeverity.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ subject: 's', project_id: '3', severity_id: '9' }, lead),
      ).rejects.toThrow('severity_id 9 does not exist');
    });

    it('rejects assigning to an inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue({ is_active: false });
      await expect(
        service.create({ subject: 's', project_id: '3', user_id: '12' }, lead),
      ).rejects.toThrow('user_id 12 is inactive');
    });

    it('rejects closed_at before open_at', async () => {
      await expect(
        service.create(
          { subject: 's', project_id: '3', open_at: '2026-10-02T00:00:00Z', closed_at: '2026-10-01T00:00:00Z' },
          lead,
        ),
      ).rejects.toThrow('closed_at cannot be before open_at');
    });
  });

  describe('update', () => {
    it('throws NotFound for a missing ticket', async () => {
      prisma.ticketLog.findUnique.mockResolvedValue(null);
      await expect(service.update(1n, { subject: 'x' }, lead)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets an agent update their own ticket', async () => {
      prisma.ticketLog.findUnique.mockResolvedValue(existing());
      await service.update(1n, { subject: 'x' }, agent);
      expect(prisma.ticketLog.update.mock.calls[0][0].data).toEqual({ subject: 'x' });
    });

    it("stops an agent updating someone else's ticket", async () => {
      prisma.ticketLog.findUnique.mockResolvedValue(existing({ user_id: 99n }));
      await expect(service.update(1n, { subject: 'x' }, agent)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it.each([['someone else', '99'], ['nobody', null]])('stops an agent reassigning to %s', async (_c, userId) => {
      prisma.ticketLog.findUnique.mockResolvedValue(existing());
      await expect(service.update(1n, { user_id: userId }, agent)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.ticketLog.update).not.toHaveBeenCalled();
    });

    it("lets a team lead reassign anyone's ticket", async () => {
      prisma.ticketLog.findUnique.mockResolvedValue(existing({ user_id: 99n }));
      await service.update(1n, { user_id: '20' }, lead);
      expect(prisma.ticketLog.update.mock.calls[0][0].data).toEqual({ user_id: 20n });
    });

    it('stamps closed_at when the status becomes Closed', async () => {
      prisma.ticketLog.findUnique.mockResolvedValue(existing());
      await service.update(1n, { status: 'Closed' }, agent);
      const { data } = prisma.ticketLog.update.mock.calls[0][0];
      expect(data.status).toBe('Closed');
      expect(data.closed_at).toBeInstanceOf(Date);
    });

    it('clears closed_at when a Closed ticket is reopened', async () => {
      prisma.ticketLog.findUnique.mockResolvedValue(
        existing({ status: 'Closed', closed_at: new Date('2026-10-02T00:00:00Z') }),
      );
      await service.update(1n, { status: 'ReOpen' }, agent);
      expect(prisma.ticketLog.update.mock.calls[0][0].data).toEqual({ status: 'ReOpen', closed_at: null });
    });

    it('keeps an explicit closed_at sent with the status', async () => {
      prisma.ticketLog.findUnique.mockResolvedValue(existing());
      await service.update(1n, { status: 'Closed', closed_at: '2026-10-03T00:00:00Z' }, agent);
      expect(prisma.ticketLog.update.mock.calls[0][0].data.closed_at).toEqual(new Date('2026-10-03T00:00:00Z'));
    });

    it('moves the tenant along with the project', async () => {
      prisma.ticketLog.findUnique.mockResolvedValue(existing());
      prisma.project.findUnique.mockResolvedValue({ tenant_id: 2n });
      await service.update(1n, { project_id: '10' }, lead);
      expect(prisma.ticketLog.update.mock.calls[0][0].data).toEqual({ project_id: 10n, tenant_id: 2n });
    });

    it('refuses to clear the project', async () => {
      prisma.ticketLog.findUnique.mockResolvedValue(existing());
      await expect(
        service.update(1n, { project_id: null as unknown as string }, lead),
      ).rejects.toThrow('project_id cannot be cleared');
    });

    it('rejects a new open_at after the existing closed_at', async () => {
      prisma.ticketLog.findUnique.mockResolvedValue(
        existing({ status: 'Closed', closed_at: new Date('2026-10-02T00:00:00Z') }),
      );
      await expect(
        service.update(1n, { open_at: '2026-10-05T00:00:00Z' }, lead),
      ).rejects.toThrow('closed_at cannot be before open_at');
    });
  });
});
