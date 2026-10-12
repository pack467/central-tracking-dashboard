import { Injectable } from '@nestjs/common';
import { CreateMonitoringLogDto } from './dto/create-monitoring-log.dto.js';
import { UpdateMonitoringLogDto } from './dto/update-monitoring-log.dto.js';

@Injectable()
export class MonitoringLogsService {
  create(createMonitoringLogDto: CreateMonitoringLogDto) {
    return 'This action adds a new monitoringLog';
  }

  findAll() {
    return `This action returns all monitoringLogs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} monitoringLog`;
  }

  update(id: number, updateMonitoringLogDto: UpdateMonitoringLogDto) {
    return `This action updates a #${id} monitoringLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} monitoringLog`;
  }
}
