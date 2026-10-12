import { Module } from '@nestjs/common';
import { MonitoringLogsService } from './monitoring-logs.service.js';
import { MonitoringLogsController } from './monitoring-logs.controller.js';

@Module({
  controllers: [MonitoringLogsController],
  providers: [MonitoringLogsService],
})
export class MonitoringLogsModule {}
