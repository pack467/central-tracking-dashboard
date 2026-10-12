import { PartialType } from '@nestjs/swagger';
import { CreateMonitoringTemplateDto } from './create-monitoring-template.dto.js';

export class UpdateMonitoringTemplateDto extends PartialType(CreateMonitoringTemplateDto) {}
