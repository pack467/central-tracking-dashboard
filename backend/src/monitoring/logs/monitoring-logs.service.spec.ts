import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from '../../auth/auth.types.js';
import { seededPermissions } from '../../../test/helpers/seeded-roles.js';
import { MonitoringLogsService } from './monitoring-logs.service.js';

const lead: AuthUser = { id: 10n, role: 'TEAM_LEAD', permissions: seededPermissions('TEAM_LEAD') };
const agent: AuthUser = { id: 20n, role: 'AGENT', permissions: seededPermissions('AGENT') };

// Due at 09:00 and 17:00 WIB (UTC+7), from 1 November 2026.
const template = (over: Record<string, unknown> = {}) => ({
  times: ['09:00', '17:00'],
  timezone: 'Asia/Jakarta',
  is_active: true,
  active_from: new Date('2026-11-01T00:00:00Z'),
  active_until: null,
  ...over,
});
const SLOT = '2026-11-02T09:00:00+07:00';

describe('MonitoringLogsService', () => {
  let service: MonitoringLogsService;
  const prisma = {
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    monitoringLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    monitoringTemplate: { findUnique: vi.fn() },
    ticketLog: { findUnique: vi.fn() },
    handover: { count: vi.fn() },
  };

  const log = (over: Record<string, unknown> = {}) =>
    service.create({ template_id: '12', scheduled_at: SLOT, result: 'OK', ...over }, agent);

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
    // The template exists, the slot is free and every ticket exists, unless a test says otherwise.
    prisma.monitoringTemplate.findUnique.mockResolvedValue(template());
    prisma.monitoringLog.findUnique.mockResolvedValue(null);
    prisma.ticketLog.findUnique.mockResolvedValue({ id: 1n });
    prisma.monitoringLog.create.mockImplementation(({ data }) => Promise.resolve({ id: 1n, ...data }));
    prisma.monitoringLog.update.mockImplementation(({ data }) => Promise.resolve({ id: 1n, ...data }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringLogsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(MonitoringLogsService);
  });

  describe('findAll', () => {
    it('sorts newest slot first and builds filters', async () => {
      prisma.monitoringLog.findMany.mockResolvedValue([]);
      prisma.monitoringLog.count.mockResolvedValue(0);

      await service.findAll({
        project_id: '1',
        result: 'NOK',
        reviewed: false,
        scheduled_from: '2026-11-02T00:00:00+07:00',
      });

      const args = prisma.monitoringLog.findMany.mock.calls[0][0];
      expect(args.orderBy).toEqual([{ scheduled_at: 'desc' }, { id: 'desc' }]);
      expect(args.where).toEqual({
        template: { project_id: 1n },
        result: 'NOK',
        reviewed_at: null,
        scheduled_at: { gte: new Date('2026-11-01T17:00:00Z') },
      });
    });

    it('filters reviewed logs', async () => {
      prisma.monitoringLog.findMany.mockResolvedValue([]);
      prisma.monitoringLog.count.mockResolvedValue(0);
      await service.findAll({ reviewed: true });
      expect(prisma.monitoringLog.findMany.mock.calls[0][0].where).toEqual({ reviewed_at: { not: null } });
    });
  });

  describe('create', () => {
    it('records the actor as the checker and the slot as an instant', async () => {
      await log();

      expect(prisma.monitoringLog.findUnique).toHaveBeenCalledWith({
        where: { template_id_scheduled_at: { template_id: 12n, scheduled_at: new Date('2026-11-02T02:00:00Z') } },
        select: { id: true },
      });
      expect(prisma.monitoringLog.create.mock.calls[0][0].data).toEqual({
        template_id: 12n,
        scheduled_at: new Date('2026-11-02T02:00:00Z'),
        checked_by: agent.id,
        result: 'OK',
        note: null,
        evidence_url: null,
        ticket_id: null,
      });
    });

    it('accepts a slot written in any offset', async () => {
      await log({ scheduled_at: '2026-11-02T10:00:00Z' }); // 17:00 WIB
      expect(prisma.monitoringLog.create).toHaveBeenCalled();
    });

    it.each([
      ['a time the template does not have', '2026-11-02T10:00:00+07:00'],
      ['the slot time in UTC instead of WIB', '2026-11-02T09:00:00Z'],
      ['a time past the minute', '2026-11-02T09:00:30+07:00'],
    ])('rejects %s', async (_case, scheduled_at) => {
      await expect(log({ scheduled_at })).rejects.toThrow("scheduled_at must be one of the template's times");
      expect(prisma.monitoringLog.create).not.toHaveBeenCalled();
    });

    it('rejects a day before active_from, using the local date', async () => {
      await expect(log({ scheduled_at: '2026-10-31T09:00:00+07:00' })).rejects.toThrow(
        'The template is not active on 2026-10-31',
      );
    });

    it('rejects a day after active_until, even when it is still that day in UTC', async () => {
      prisma.monitoringTemplate.findUnique.mockResolvedValue(
        template({ times: ['00:30'], active_until: new Date('2026-11-01T00:00:00Z') }),
      );
      // 00:30 WIB on 2 November is 17:30 UTC on 1 November.
      await expect(log({ scheduled_at: '2026-11-01T17:30:00Z' })).rejects.toThrow(
        'The template is not active on 2026-11-02',
      );
    });

    it('rejects a switched-off template', async () => {
      prisma.monitoringTemplate.findUnique.mockResolvedValue(template({ is_active: false }));
      await expect(log()).rejects.toThrow('The template is switched off');
    });

    it('rejects an unknown template or ticket', async () => {
      prisma.monitoringTemplate.findUnique.mockResolvedValue(null);
      await expect(log()).rejects.toThrow('template_id 12 does not exist');

      prisma.monitoringTemplate.findUnique.mockResolvedValue(template());
      prisma.ticketLog.findUnique.mockResolvedValue(null);
      await expect(log({ ticket_id: '99' })).rejects.toThrow('ticket_id 99 does not exist');
    });

    it.each([undefined, null, '  '])('requires a note for NOK (note: %j)', async (note) => {
      await expect(log({ result: 'NOK', note })).rejects.toThrow('note is required when result is NOK');
    });

    it('accepts a NOK with a note, evidence and a ticket', async () => {
      await log({ result: 'NOK', note: 'lastcoll 3h behind', evidence_url: 'https://img.example/1.png', ticket_id: '5' });
      expect(prisma.monitoringLog.create.mock.calls[0][0].data).toMatchObject({ result: 'NOK', ticket_id: 5n });
    });

    it('refuses a second log for the same slot', async () => {
      prisma.monitoringLog.findUnique.mockResolvedValue({ id: 7n });
      await expect(log()).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.monitoringLog.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const stored = (over: Record<string, unknown> = {}) => ({ checked_by: agent.id, result: 'OK', note: null, ...over });

    it('throws NotFound for a missing log', async () => {
      await expect(service.update(1n, { note: 'x' }, agent)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets an agent correct their own log', async () => {
      prisma.monitoringLog.findUnique.mockResolvedValue(stored());
      await service.update(1n, { result: 'NOK', note: 'disk full' }, agent);
      expect(prisma.monitoringLog.update.mock.calls[0][0].data).toEqual({ result: 'NOK', note: 'disk full' });
    });

    it("stops an agent correcting someone else's log", async () => {
      prisma.monitoringLog.findUnique.mockResolvedValue(stored({ checked_by: 99n }));
      await expect(service.update(1n, { note: 'x' }, agent)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.monitoringLog.update).not.toHaveBeenCalled();
    });

    it("lets a team lead correct anyone's log", async () => {
      prisma.monitoringLog.findUnique.mockResolvedValue(stored({ checked_by: 99n }));
      await service.update(1n, { note: 'x' }, lead);
      expect(prisma.monitoringLog.update).toHaveBeenCalled();
    });

    it('keeps the NOK note rule against the values after the update', async () => {
      prisma.monitoringLog.findUnique.mockResolvedValue(stored({ result: 'NOK', note: 'disk full' }));
      await expect(service.update(1n, { note: null }, agent)).rejects.toThrow('note is required');

      prisma.monitoringLog.findUnique.mockResolvedValue(stored());
      await expect(service.update(1n, { result: 'NOK' }, agent)).rejects.toThrow('note is required');
      expect(prisma.monitoringLog.update).not.toHaveBeenCalled();
    });

    it('clears the ticket with null', async () => {
      prisma.monitoringLog.findUnique.mockResolvedValue(stored());
      await service.update(1n, { ticket_id: null }, agent);
      expect(prisma.monitoringLog.update.mock.calls[0][0].data).toEqual({ ticket_id: null });
    });
  });

  it('review records the reviewer and the time', async () => {
    prisma.monitoringLog.findUnique.mockResolvedValue({ id: 1n });
    await service.review(1n, { review_note: 'Escalated to vendor' }, lead);

    const { data } = prisma.monitoringLog.update.mock.calls[0][0];
    expect(data).toMatchObject({ reviewed_by: lead.id, review_note: 'Escalated to vendor' });
    expect(data.reviewed_at).toBeInstanceOf(Date);
  });

  describe('remove', () => {
    beforeEach(() => {
      prisma.monitoringLog.findUnique.mockResolvedValue({ id: 1n });
    });

    it('refuses while a handover refers to the log', async () => {
      prisma.handover.count.mockResolvedValue(1);
      await expect(service.remove(1n)).rejects.toThrow('referenced by 1 handover');
      expect(prisma.monitoringLog.delete).not.toHaveBeenCalled();
    });

    it('deletes a log no handover refers to', async () => {
      prisma.handover.count.mockResolvedValue(0);
      await service.remove(1n);
      expect(prisma.monitoringLog.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1n } }));
    });
  });
});
