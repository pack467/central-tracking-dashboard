import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MonitoringLogsService } from './monitoring-logs.service.js';
import { CreateMonitoringLogDto } from './dto/create-monitoring-log.dto.js';
import { UpdateMonitoringLogDto } from './dto/update-monitoring-log.dto.js';

@Controller('monitoring-logs')
export class MonitoringLogsController {
  constructor(private readonly monitoringLogsService: MonitoringLogsService) {}

  @Post()
  create(@Body() createMonitoringLogDto: CreateMonitoringLogDto) {
    return this.monitoringLogsService.create(createMonitoringLogDto);
  }

  @Get()
  findAll() {
    return this.monitoringLogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.monitoringLogsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMonitoringLogDto: UpdateMonitoringLogDto) {
    return this.monitoringLogsService.update(+id, updateMonitoringLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.monitoringLogsService.remove(+id);
  }
}
