import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { TicketStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { toBigInt } from '../common/validators/bigint-id.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { QueryTicketsDto, TicketFiltersDto } from './dto/query-tickets.dto.js';

// Related records returned with every ticket (names only, never user passwords).
const ticketInclude = {
  project: { select: { id: true, name: true, code_prefix: true } },
  tenant: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
  user: { select: { id: true, name: true, email: true } },
  severity: { select: { id: true, code_name: true, name: true } },
  category: { select: { id: true, name: true } },
} satisfies Prisma.TicketLogInclude;

// These roles work on any ticket; an AGENT only on tickets assigned to them.
const MANAGE_ANY_ROLES: readonly string[] = ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD'];
const canManageAny = (actor: AuthUser) => !!actor.role && MANAGE_ANY_ROLES.includes(actor.role);

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryTicketsDto) {
    const { page = 1, limit = 20, sort = 'open_at', order = 'desc' } = query;
    const where = this.buildWhere(query);
    // open_at/closed_at can be null; keep those rows at the end either way.
    const primary: Prisma.TicketLogOrderByWithRelationInput =
      sort === 'open_at' || sort === 'closed_at'
        ? { [sort]: { sort: order, nulls: 'last' } }
        : { [sort]: order };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ticketLog.findMany({
        where,
        include: ticketInclude,
        orderBy: [primary, { id: order }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticketLog.count({ where }),
    ]);
    return { data, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  async summary(filters: TicketFiltersDto) {
    const groups = await this.prisma.ticketLog.groupBy({
      by: ['status'],
      where: this.buildWhere(filters),
      _count: { _all: true },
    });
    const by_status = Object.fromEntries(
      Object.values(TicketStatus).map((s) => [s, 0]),
    ) as Record<TicketStatus, number>;
    let total = 0;
    for (const g of groups) {
      total += g._count._all;
      if (g.status) by_status[g.status] = g._count._all;
    }
    return { total, by_status };
  }

  async findOne(id: bigint) {
    const ticket = await this.prisma.ticketLog.findUnique({ where: { id }, include: ticketInclude });
    if (!ticket) throw new NotFoundException(`Ticket #${id} not found`);
    return ticket;
  }

  async create(dto: CreateTicketDto, actor: AuthUser) {
    const userId = dto.user_id === undefined ? actor.id : toBigInt(dto.user_id)!;
    if (!canManageAny(actor) && userId !== actor.id) {
      throw new ForbiddenException('Agents can only create tickets assigned to themselves');
    }

    const projectId = BigInt(dto.project_id);
    const tenantId = await this.resolveTenant(projectId, toBigInt(dto.tenant_id));
    await this.assertReferences({
      client_id: toBigInt(dto.client_id),
      user_id: userId,
      severity_id: toBigInt(dto.severity_id),
      category_id: toBigInt(dto.category_id),
    });

    const status = dto.status ?? TicketStatus.Open;
    const openAt = dto.open_at ? new Date(dto.open_at) : new Date();
    const closedAt =
      dto.closed_at != null
        ? new Date(dto.closed_at)
        : status === TicketStatus.Closed && dto.closed_at === undefined
          ? new Date()
          : null;
    assertDateOrder(openAt, closedAt);

    return this.prisma.ticketLog.create({
      data: {
        subject: dto.subject,
        description: dto.description ?? null,
        third_party_ticket_id: dto.third_party_ticket_id ?? null,
        requester: dto.requester ?? null,
        project_id: projectId,
        tenant_id: tenantId ?? null,
        client_id: toBigInt(dto.client_id) ?? null,
        user_id: userId,
        severity_id: toBigInt(dto.severity_id) ?? null,
        category_id: toBigInt(dto.category_id) ?? null,
        status,
        open_at: openAt,
        closed_at: closedAt,
      },
      include: ticketInclude,
    });
  }

  async update(id: bigint, dto: UpdateTicketDto, actor: AuthUser) {
    const ticket = await this.prisma.ticketLog.findUnique({
      where: { id },
      select: { user_id: true, project_id: true, status: true, open_at: true, closed_at: true },
    });
    if (!ticket) throw new NotFoundException(`Ticket #${id} not found`);

    const manageAny = canManageAny(actor);
    if (!manageAny && ticket.user_id !== actor.id) {
      throw new ForbiddenException('Agents can only update tickets assigned to them');
    }
    const userId = toBigInt(dto.user_id);
    if (!manageAny && userId !== undefined && userId !== actor.id) {
      throw new ForbiddenException('Agents cannot reassign tickets');
    }
    if ((dto.project_id as string | null | undefined) === null) {
      throw new BadRequestException('project_id cannot be cleared');
    }

    const data: Prisma.TicketLogUncheckedUpdateInput = {};

    // Project and tenant must stay consistent.
    if (dto.project_id !== undefined || dto.tenant_id !== undefined) {
      const projectId = dto.project_id !== undefined ? BigInt(dto.project_id) : ticket.project_id;
      const tenantId = await this.resolveTenant(projectId, toBigInt(dto.tenant_id));
      if (dto.project_id !== undefined) data.project_id = projectId;
      if (tenantId !== undefined) data.tenant_id = tenantId;
    }

    await this.assertReferences({
      client_id: toBigInt(dto.client_id),
      user_id: userId,
      severity_id: toBigInt(dto.severity_id),
      category_id: toBigInt(dto.category_id),
    });
    for (const key of ['client_id', 'user_id', 'severity_id', 'category_id'] as const) {
      if (dto[key] !== undefined) data[key] = toBigInt(dto[key]);
    }
    for (const key of ['subject', 'description', 'third_party_ticket_id', 'requester'] as const) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }

    // Status and closed_at move together unless closed_at is sent explicitly:
    // closing stamps closed_at, leaving Closed clears it.
    let closedAt: Date | null | undefined =
      dto.closed_at === undefined ? undefined : dto.closed_at === null ? null : new Date(dto.closed_at);
    if (dto.status !== undefined && dto.status !== ticket.status && closedAt === undefined) {
      if (dto.status === TicketStatus.Closed && !ticket.closed_at) closedAt = new Date();
      if (ticket.status === TicketStatus.Closed) closedAt = null;
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (closedAt !== undefined) data.closed_at = closedAt;
    const openAt = dto.open_at ? new Date(dto.open_at) : undefined;
    if (openAt) data.open_at = openAt;
    assertDateOrder(openAt ?? ticket.open_at, closedAt === undefined ? ticket.closed_at : closedAt);

    return this.prisma.ticketLog.update({ where: { id }, data, include: ticketInclude });
  }

  async remove(id: bigint) {
    await this.findOne(id);
    return this.prisma.ticketLog.delete({ where: { id }, include: ticketInclude });
  }

  private buildWhere(f: TicketFiltersDto): Prisma.TicketLogWhereInput {
    const where: Prisma.TicketLogWhereInput = {};
    if (f.status?.length) where.status = { in: f.status };
    for (const key of ['project_id', 'tenant_id', 'client_id', 'user_id', 'severity_id', 'category_id'] as const) {
      if (f[key]) where[key] = BigInt(f[key]);
    }
    if (f.open_from || f.open_to) {
      where.open_at = {
        ...(f.open_from && { gte: new Date(f.open_from) }),
        ...(f.open_to && { lte: new Date(f.open_to) }),
      };
    }
    if (f.q) {
      const contains = { contains: f.q, mode: 'insensitive' } as const;
      where.OR = [{ subject: contains }, { description: contains }, { third_party_ticket_id: contains }];
    }
    return where;
  }

  // Returns the tenant to store: the project's tenant when none is given,
  // undefined when nothing should change. A given tenant must match the project's.
  private async resolveTenant(projectId: bigint | null, tenantId: bigint | null | undefined) {
    if (projectId === null) {
      if (tenantId) await this.assertExists('tenant_id', tenantId);
      return tenantId;
    }
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { tenant_id: true },
    });
    if (!project) throw new BadRequestException(`project_id ${projectId} does not exist`);
    if (tenantId === undefined) return project.tenant_id;
    if (tenantId !== project.tenant_id) {
      throw new BadRequestException(
        `tenant_id ${tenantId} does not match the project's tenant (${project.tenant_id ?? 'none'})`,
      );
    }
    return tenantId;
  }

  private async assertReferences(refs: {
    client_id?: bigint | null;
    user_id?: bigint | null;
    severity_id?: bigint | null;
    category_id?: bigint | null;
  }) {
    await Promise.all(
      Object.entries(refs)
        .filter((entry): entry is [string, bigint] => !!entry[1])
        .map(([field, id]) => this.assertExists(field, id)),
    );
  }

  private async assertExists(field: string, id: bigint) {
    const where = { where: { id }, select: { id: true } };
    let found: unknown;
    switch (field) {
      case 'tenant_id':
        found = await this.prisma.tenant.findUnique(where);
        break;
      case 'client_id':
        found = await this.prisma.client.findUnique(where);
        break;
      case 'severity_id':
        found = await this.prisma.ticketSeverity.findUnique(where);
        break;
      case 'category_id':
        found = await this.prisma.ticketCategory.findUnique(where);
        break;
      case 'user_id': {
        const user = await this.prisma.user.findUnique({ where: { id }, select: { is_active: true } });
        if (user && !user.is_active) throw new BadRequestException(`user_id ${id} is inactive`);
        found = user;
        break;
      }
    }
    if (!found) throw new BadRequestException(`${field} ${id} does not exist`);
  }
}

function assertDateOrder(openAt: Date | null, closedAt: Date | null) {
  if (openAt && closedAt && closedAt < openAt) {
    throw new BadRequestException('closed_at cannot be before open_at');
  }
}
