import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { MonitoringResult } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from '../../auth/auth.types.js';
import { toBigInt } from '../../common/validators/bigint-id.js';
import { MONITORING_CHECK_ANY } from '../monitoring.permissions.js';
import { CreateMonitoringLogDto } from './dto/create-monitoring-log.dto.js';
import { UpdateMonitoringLogDto } from './dto/update-monitoring-log.dto.js';
import { ReviewMonitoringLogDto } from './dto/review-monitoring-log.dto.js';
import { QueryMonitoringLogsDto } from './dto/query-monitoring-logs.dto.js';

const userRef = { select: { id: true, name: true, email: true } } as const;

// Related records returned with every log (names only, never user passwords).
const logInclude = {
  template: {
    select: {
      id: true,
      name: true,
      timezone: true,
      project: { select: { id: true, name: true, code_prefix: true } },
    },
  },
  checker: userRef,
  reviewer: userRef,
  ticket: { select: { id: true, third_party_ticket_id: true, subject: true, status: true } },
} satisfies Prisma.MonitoringLogInclude;

// With monitoring.check.any you correct anyone's log; without it, only your own.
const canCorrectAny = (actor: AuthUser) => actor.permissions.has(MONITORING_CHECK_ANY);

@Injectable()
export class MonitoringLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryMonitoringLogsDto) {
    const { page = 1, limit = 20, sort = 'scheduled_at', order = 'desc' } = query;
    const where = this.buildWhere(query);
    const primary: Prisma.MonitoringLogOrderByWithRelationInput = { [sort]: order };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.monitoringLog.findMany({
        where,
        include: logInclude,
        orderBy: [primary, { id: order }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.monitoringLog.count({ where }),
    ]);
    return { data, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  async findOne(id: bigint) {
    const log = await this.prisma.monitoringLog.findUnique({ where: { id }, include: logInclude });
    if (!log) throw new NotFoundException(`Monitoring log #${id} not found`);
    return log;
  }

  // The check is recorded as done by the actor, now (checked_at). Templates only
  // tell the dashboard what to show, so scheduled_at isn't checked against the
  // template's time, active days or switch.
  async create(dto: CreateMonitoringLogDto, actor: AuthUser) {
    const templateId = BigInt(dto.template_id);
    const scheduledAt = new Date(dto.scheduled_at);
    const template = await this.prisma.monitoringTemplate.findUnique({
      where: { id: templateId },
      select: { id: true },
    });
    if (!template) throw new BadRequestException(`template_id ${templateId} does not exist`);
    assertNote(dto.result, dto.note);
    const ticketId = toBigInt(dto.ticket_id);
    if (ticketId) await this.assertTicketExists(ticketId);

    // One log per slot (also a unique index): a clear 409 rather than a DB error.
    const existing = await this.prisma.monitoringLog.findUnique({
      where: { template_id_scheduled_at: { template_id: templateId, scheduled_at: scheduledAt } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`This slot is already logged (#${existing.id}); correct that log instead`);
    }

    return this.prisma.monitoringLog.create({
      data: {
        template_id: templateId,
        scheduled_at: scheduledAt,
        checked_by: actor.id,
        result: dto.result,
        note: dto.note ?? null,
        evidence_url: dto.evidence_url ?? null,
        ticket_id: ticketId ?? null,
      },
      include: logInclude,
    });
  }

  async update(id: bigint, dto: UpdateMonitoringLogDto, actor: AuthUser) {
    const log = await this.prisma.monitoringLog.findUnique({
      where: { id },
      select: { checked_by: true, result: true, note: true },
    });
    if (!log) throw new NotFoundException(`Monitoring log #${id} not found`);
    if (!canCorrectAny(actor) && log.checked_by !== actor.id) {
      throw new ForbiddenException('Without monitoring.check.any you can only correct logs you recorded');
    }

    // Checked against the values after the update.
    assertNote(dto.result ?? log.result, dto.note === undefined ? log.note : dto.note);
    const ticketId = toBigInt(dto.ticket_id);
    if (ticketId) await this.assertTicketExists(ticketId);

    // result is required (null is rejected by the DTO); the rest can be cleared.
    const data: Prisma.MonitoringLogUncheckedUpdateInput = {};
    if (dto.result !== undefined) data.result = dto.result;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.evidence_url !== undefined) data.evidence_url = dto.evidence_url;
    if (ticketId !== undefined) data.ticket_id = ticketId;

    return this.prisma.monitoringLog.update({ where: { id }, data, include: logInclude });
  }

  // Review is light and optional: it records who reviewed the log and when.
  // Reviewing again replaces the earlier review.
  async review(id: bigint, dto: ReviewMonitoringLogDto, actor: AuthUser) {
    await this.findOne(id);
    return this.prisma.monitoringLog.update({
      where: { id },
      data: { reviewed_by: actor.id, reviewed_at: new Date(), review_note: dto.review_note ?? null },
      include: logInclude,
    });
  }

  async remove(id: bigint) {
    await this.findOne(id);
    const handovers = await this.prisma.handover.count({ where: { monitoring_log_id: id } });
    if (handovers) {
      throw new ConflictException(
        `Monitoring log #${id} is referenced by ${handovers} handover${handovers === 1 ? '' : 's'}`,
      );
    }
    return this.prisma.monitoringLog.delete({ where: { id }, include: logInclude });
  }

  private buildWhere(f: QueryMonitoringLogsDto): Prisma.MonitoringLogWhereInput {
    const where: Prisma.MonitoringLogWhereInput = {};
    if (f.template_id) where.template_id = BigInt(f.template_id);
    if (f.project_id) where.template = { project_id: BigInt(f.project_id) };
    if (f.checked_by) where.checked_by = BigInt(f.checked_by);
    if (f.result) where.result = f.result;
    if (f.reviewed !== undefined) where.reviewed_at = f.reviewed ? { not: null } : null;
    if (f.scheduled_from || f.scheduled_to) {
      where.scheduled_at = {
        ...(f.scheduled_from && { gte: new Date(f.scheduled_from) }),
        ...(f.scheduled_to && { lte: new Date(f.scheduled_to) }),
      };
    }
    return where;
  }

  private async assertTicketExists(id: bigint) {
    const ticket = await this.prisma.ticketLog.findUnique({ where: { id }, select: { id: true } });
    if (!ticket) throw new BadRequestException(`ticket_id ${id} does not exist`);
  }
}

function assertNote(result: MonitoringResult, note: string | null | undefined) {
  if (result === MonitoringResult.NOK && !note?.trim()) {
    throw new BadRequestException('note is required when result is NOK');
  }
}
