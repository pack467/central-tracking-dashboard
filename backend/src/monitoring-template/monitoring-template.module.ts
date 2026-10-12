import { Module } from '@nestjs/common';
import { MonitoringTemplateService } from './monitoring-template.service.js';
import { MonitoringTemplateController } from './monitoring-template.controller.js';

@Module({
  controllers: [MonitoringTemplateController],
  providers: [MonitoringTemplateService],
})
export class MonitoringTemplateModule {}
