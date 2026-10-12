import { PartialType } from '@nestjs/swagger';
import { CreateMonitoringLogDto } from './create-monitoring-log.dto.js';

export class UpdateMonitoringLogDto extends PartialType(CreateMonitoringLogDto) {}
