import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from '../../auth/auth.types.js';
import { toBigInt } from '../../common/validators/bigint-id.js';
import { CreateMonitoringTemplateDto } from './dto/create-monitoring-template.dto.js';
import { UpdateMonitoringTemplateDto } from './dto/update-monitoring-template.dto.js';
import { QueryMonitoringTemplatesDto } from './dto/query-monitoring-templates.dto.js';

// Related records returned with every template (names only, never user passwords).
const templateInclude = {
  project: { select: { id: true, name: true, code_prefix: true } },
  client: { select: { id: true, name: true } },
  creator: { select: { id: true, name: true, email: true } },
} satisfies Prisma.MonitoringTemplateInclude;

@Injectable()
export class MonitoringTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryMonitoringTemplatesDto) {
    const { page = 1, limit = 20, sort = 'times', order = 'asc' } = query;
    const where = this.buildWhere(query);
    // By time (the default), checks due at the same time are listed by name:
    // the order of the day, as the dashboard shows it.
    const orderBy: Prisma.MonitoringTemplateOrderByWithRelationInput[] =
      sort === 'times' ? [{ times: order }, { name: order }, { id: order }] : [{ [sort]: order }, { id: order }];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.monitoringTemplate.findMany({
        where,
        include: templateInclude,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.monitoringTemplate.count({ where }),
    ]);
    return { data, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  async findOne(id: bigint) {
    const template = await this.prisma.monitoringTemplate.findUnique({ where: { id }, include: templateInclude });
    if (!template) throw new NotFoundException(`Monitoring template #${id} not found`);
    return template;
  }

  async create(dto: CreateMonitoringTemplateDto, actor: AuthUser) {
    const projectId = BigInt(dto.project_id);
    const clientId = toBigInt(dto.client_id);
    await this.assertReferences({ project_id: projectId, client_id: clientId });

    const activeFrom = toDate(dto.active_from) ?? null;
    const activeUntil = toDate(dto.active_until) ?? null;
    assertDateOrder(activeFrom, activeUntil);

    return this.prisma.monitoringTemplate.create({
      data: {
        project_id: projectId,
        name: dto.name,
        instructions: dto.instructions ?? null,
        times: dto.times,
        // Not sent: the column defaults (Asia/Jakarta, not temporary, active).
        timezone: dto.timezone,
        is_temporary: dto.is_temporary,
        is_active: dto.is_active,
        active_from: activeFrom,
        active_until: activeUntil,
        client_id: clientId ?? null,
        user_creator_id: actor.id,
      },
      include: templateInclude,
    });
  }

  async update(id: bigint, dto: UpdateMonitoringTemplateDto) {
    const template = await this.prisma.monitoringTemplate.findUnique({
      where: { id },
      select: { active_from: true, active_until: true },
    });
    if (!template) throw new NotFoundException(`Monitoring template #${id} not found`);

    await this.assertReferences({ project_id: toBigInt(dto.project_id), client_id: toBigInt(dto.client_id) });

    // Required fields reject null in the DTO; instructions, client and dates can be cleared.
    const data: Prisma.MonitoringTemplateUncheckedUpdateInput = {};
    if (dto.project_id !== undefined) data.project_id = BigInt(dto.project_id);
    if (dto.client_id !== undefined) data.client_id = toBigInt(dto.client_id);
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.instructions !== undefined) data.instructions = dto.instructions;
    if (dto.times !== undefined) data.times = dto.times;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.is_temporary !== undefined) data.is_temporary = dto.is_temporary;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    const activeFrom = toDate(dto.active_from);
    const activeUntil = toDate(dto.active_until);
    if (activeFrom !== undefined) data.active_from = activeFrom;
    if (activeUntil !== undefined) data.active_until = activeUntil;
    // Checked against the values after the update.
    assertDateOrder(
      activeFrom === undefined ? template.active_from : activeFrom,
      activeUntil === undefined ? template.active_until : activeUntil,
    );

    return this.prisma.monitoringTemplate.update({ where: { id }, data, include: templateInclude });
  }

  // A template with logs is switched off (is_active: false), not deleted, so its history stays.
  async remove(id: bigint) {
    await this.findOne(id);
    const logs = await this.prisma.monitoringLog.count({ where: { template_id: id } });
    if (logs) {
      throw new ConflictException(
        `Monitoring template #${id} has ${logs} log${logs === 1 ? '' : 's'}; switch it off (is_active: false) instead`,
      );
    }
    return this.prisma.monitoringTemplate.delete({ where: { id }, include: templateInclude });
  }

  private buildWhere(f: QueryMonitoringTemplatesDto): Prisma.MonitoringTemplateWhereInput {
    const where: Prisma.MonitoringTemplateWhereInput = {};
    if (f.project_id) where.project_id = BigInt(f.project_id);
    if (f.client_id) where.client_id = BigInt(f.client_id);
    if (f.times) where.times = f.times;
    if (f.project) where.project = { name: { contains: f.project, mode: 'insensitive' } };
    if (f.is_active !== undefined) where.is_active = f.is_active;
    if (f.is_temporary !== undefined) where.is_temporary = f.is_temporary;
    if (f.q) {
      const contains = { contains: f.q, mode: 'insensitive' } as const;
      where.OR = [{ name: contains }, { instructions: contains }];
    }
    return where;
  }

  // A clear 400 like `client_id 9 does not exist` instead of a foreign-key error.
  private async assertReferences(refs: { project_id?: bigint | null; client_id?: bigint | null }) {
    const [project, client] = await Promise.all([
      refs.project_id && this.prisma.project.findUnique({ where: { id: refs.project_id }, select: { id: true } }),
      refs.client_id && this.prisma.client.findUnique({ where: { id: refs.client_id }, select: { id: true } }),
    ]);
    if (refs.project_id && !project) throw new BadRequestException(`project_id ${refs.project_id} does not exist`);
    if (refs.client_id && !client) throw new BadRequestException(`client_id ${refs.client_id} does not exist`);
  }
}

// "YYYY-MM-DD" → a Date at UTC midnight (what a @db.Date column stores).
const toDate = (day: string | null | undefined) =>
  day === undefined ? undefined : day === null ? null : new Date(day);

function assertDateOrder(activeFrom: Date | null, activeUntil: Date | null) {
  if (activeFrom && activeUntil && activeUntil < activeFrom) {
    throw new BadRequestException('active_until cannot be before active_from');
  }
}
