import { Module } from '@nestjs/common';
import { MonitoringTemplatesController } from './templates/monitoring-templates.controller.js';
import { MonitoringTemplatesService } from './templates/monitoring-templates.service.js';
import { MonitoringLogsController } from './logs/monitoring-logs.controller.js';
import { MonitoringLogsService } from './logs/monitoring-logs.service.js';

// Templates (what to check, and when) and logs (one check of a template at one slot).
@Module({
  controllers: [MonitoringTemplatesController, MonitoringLogsController],
  providers: [MonitoringTemplatesService, MonitoringLogsService],
})
export class MonitoringModule {}
