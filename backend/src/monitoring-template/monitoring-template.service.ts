import { 
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { MONITORINGS_WRITE_ANY } from './entities/monitoring.template.permission.js';
import { toBigInt } from '../common/validators/bigint-id.js';
import { CreateMonitoringTemplateDto } from './dto/create-monitoring-template.dto.js';
import { UpdateMonitoringTemplateDto } from './dto/update-monitoring-template.dto.js';
import { QueryMonitoringTemplateDto, MonitoringTemplateFiltersDto } from './dto/query-monitoring-template.dto.js';


@Injectable()
export class MonitoringTemplateService {
  create(createMonitoringTemplateDto: CreateMonitoringTemplateDto) {
    return 'This action adds a new monitoringTemplate';
  }

  findAll() {
    return `This action returns all monitoringTemplate`;
  }

  findOne(id: number) {
    return `This action returns a #${id} monitoringTemplate`;
  }

  update(id: number, updateMonitoringTemplateDto: UpdateMonitoringTemplateDto) {
    return `This action updates a #${id} monitoringTemplate`;
  }

  remove(id: number) {
    return `This action removes a #${id} monitoringTemplate`;
  }
}
