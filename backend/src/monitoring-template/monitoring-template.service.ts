import { 
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { MONITORINGS_WRITE_ANY } from './entities/monitoring.template.permission.js';
import { toBigInt } from '../common/validators/bigint-id.js';
import { CreateMonitoringTemplateDto } from './dto/create-monitoring-template.dto.js';
import { UpdateMonitoringTemplateDto } from './dto/update-monitoring-template.dto.js';
import { QueryMonitoringTemplateDto, MonitoringTemplateFiltersDto } from './dto/query-monitoring-template.dto.js';


const monitoringTemplateInclude = {
  project: { 
    select: { id:true, name:true, tenant_id:true, code_prefix:true } 
  },
  client: { 
    select: { id:true, name:true } 
  },
  userCreator: { 
    select: { id:true, name:true, email: true } 
  },
  logs: {
    select: { id:true, scheduled_at:true, result:true }
  }
} satisfies Prisma.MonitoringTemplateInclude;

const canManageMonitoringTemplateAny = (actor: AuthUser) => actor.permissions.has(MONITORINGS_WRITE_ANY);

@Injectable()
export class MonitoringTemplateService {

  constructor(private readonly prisma: PrismaService){}

  // create(createMonitoringTemplateDto: CreateMonitoringTemplateDto) {
  //   return 'This action adds a new monitoringTemplate';
  // }

  async findAll(query: QueryMonitoringTemplateDto) {
    const { page = 1, limit = 20, sort = 'times', order = 'asc' } = query;
    const where = this.buildWhere(query);

    // Konfigurasi sorting dinamis
    const orderByClause: Prisma.MonitoringTemplateOrderByWithRelationInput = {
      [sort]: order,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.monitoringTemplate.findMany({
        where,
        include: monitoringTemplateInclude,
        orderBy: [orderByClause, { id: 'desc' }], // Fallback urutan berdasarkan ID jika sort sama
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.monitoringTemplate.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: bigint) {
    const template = await this.prisma.monitoringTemplate.findUnique({
      where: { id },
      include: monitoringTemplateInclude,
    });
    if (!template) {
      throw new NotFoundException(`Monitoring Template #${id} not found`);
    }
    return template;
  }

  async create(dto: CreateMonitoringTemplateDto){
    const projectId = BigInt(dto.project_id);
    await this.assertProjectExists(projectId);

    return this.prisma.monitoringTemplate.create({
      data: {
        name: dto.name,
        instructions: dto.instructions ?? null,
        times: dto.times,
        timezone: dto.timezone,
        is_temporary: dto.is_temporary,
        active_from: new Date(dto.active_from),
        active_until: dto.active_until ? new Date(dto.active_until) : null,
        is_active: dto.is_active,
        project_id: projectId,
        tenant_id: toBigInt(dto.tenant_id),
        client_id: toBigInt(dto.client_id),
        user_creator_id: toBigInt(dto.user_creator_id),
      },
      include: monitoringTemplateInclude,
    });
  }

  async update(id: bigint, dto: UpdateMonitoringTemplateDto) {
    //checking keberadaan template
    const existingTemplate = await this.prisma.monitoringTemplate.findUnique({
      where: { id },
      select: { id: true, project_id: true },
    });
    if (!existingTemplate) {
      throw new NotFoundException(`Monitoring Template #${id} not found`);
    }

    const data: Prisma.MonitoringTemplateUncheckedUpdateInput = {};

    //makesure project ada
    if (dto.project_id !== undefined) {
      const projectId = BigInt(dto.project_id);
      await this.assertProjectExists(projectId);
      data.project_id = projectId;
    }

    //petakan yang lainnya kalo undefined
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.instructions !== undefined) data.instructions = dto.instructions;
    if (dto.times !== undefined) data.times = dto.times;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.is_temporary !== undefined) data.is_temporary = dto.is_temporary;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    //tanggal
    if (dto.active_from !== undefined) {
      data.active_from = dto.active_from ? new Date(dto.active_from) : null;
    }
    if (dto.active_until !== undefined) {
      data.active_until = dto.active_until ? new Date(dto.active_until) : null;
    }

    //convert fk ke bigint
    if (dto.client_id !== undefined) data.client_id = toBigInt(dto.client_id);
    if (dto.user_creator_id !== undefined) data.user_creator_id = toBigInt(dto.user_creator_id);

    //update db
    return this.prisma.monitoringTemplate.update({
      where: { id },
      data,
      include: monitoringTemplateInclude,
    });
  }

  async remove(id: bigint) {
    await this.findOne(id);

    return this.prisma.monitoringTemplate.delete({
      where: { id },
      include: monitoringTemplateInclude,
    });
  }

  private buildWhere(f: QueryMonitoringTemplateDto): Prisma.MonitoringTemplateWhereInput{
    const where: Prisma.MonitoringTemplateWhereInput = {};

    // 1. Filter berdasarkan nama project (relasi ke tabel project)
    if (f.project) {
      where.project = {
        name: {
          contains: f.project,
          mode: 'insensitive',
        },
      };
    }

    // 2. Filter Foreign Keys lainnya (dikonversi ke BigInt)
    if (f.client_id) where.client_id = BigInt(f.client_id);
    if (f.user_creator_id) where.user_creator_id = BigInt(f.user_creator_id);

    // 3. Filter teks (name & instructions)
    if (f.name) {
      where.name = { contains: f.name, mode: 'insensitive' };
    }
    if (f.instructions) {
      where.instructions = { contains: f.instructions, mode: 'insensitive' };
    }

    // 4. Filter status & pengaturan waktu
    if (f.timezone) where.timezone = f.timezone;
    if (f.is_temporary !== undefined) where.is_temporary = f.is_temporary;
    if (f.is_active !== undefined) where.is_active = f.is_active;

    // 5. Filter tanggal aktif (active_from / active_until)
    if (f.active_from) {
      where.active_from = { gte: new Date(f.active_from) };
    }
    if (f.active_until) {
      where.active_until = { lte: new Date(f.active_until) };
    }

    return where;
  }

  //validasi keberadaan project
  private async assertProjectExists(projectId: bigint) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new BadRequestException(`project_id ${projectId} does not exist`);
    }
  }
}
