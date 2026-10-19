import { 
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query 
} from '@nestjs/common';
import { MonitoringTemplateService } from './monitoring-template.service.js';
import { CreateMonitoringTemplateDto } from './dto/create-monitoring-template.dto.js';
import { UpdateMonitoringTemplateDto } from './dto/update-monitoring-template.dto.js';
import { QueryMonitoringTemplateDto } from './dto/query-monitoring-template.dto.js';

@Controller('monitoring-template')
export class MonitoringTemplateController {
  constructor(private readonly monitoringTemplateService: MonitoringTemplateService) {}

  @Post()
  create(@Body() createMonitoringTemplateDto: CreateMonitoringTemplateDto) {
    return this.monitoringTemplateService.create(createMonitoringTemplateDto);
  }

  @Get()
  findAll(@Query() query: QueryMonitoringTemplateDto) {
    return this.monitoringTemplateService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.monitoringTemplateService.findOne(BigInt(id));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMonitoringTemplateDto: UpdateMonitoringTemplateDto
  ) {
    return this.monitoringTemplateService.update(BigInt(id), updateMonitoringTemplateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.monitoringTemplateService.remove(BigInt(id));
  }
}
