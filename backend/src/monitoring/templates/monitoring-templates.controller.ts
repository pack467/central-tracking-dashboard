import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe.js';
import { Can } from '../../auth/decorators/can.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../../auth/auth.types.js';
import { MONITORING_READ, MONITORING_TEMPLATES_MANAGE } from '../monitoring.permissions.js';
import { MonitoringTemplatesService } from './monitoring-templates.service.js';
import { CreateMonitoringTemplateDto } from './dto/create-monitoring-template.dto.js';
import { UpdateMonitoringTemplateDto } from './dto/update-monitoring-template.dto.js';
import { QueryMonitoringTemplatesDto } from './dto/query-monitoring-templates.dto.js';
import { MonitoringTemplate, MonitoringTemplatePage } from './entities/monitoring-template.entity.js';

const ID_PARAM = { name: 'id', type: String, example: '12', description: 'Template id (digits only)' };

@ApiTags('monitoring-templates')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Not logged in (no or expired session), or the user is inactive' })
@Controller('monitoring-templates')
export class MonitoringTemplatesController {
  constructor(private readonly templates: MonitoringTemplatesService) {}

  @Get()
  @Can(MONITORING_READ)
  @ApiOperation({
    summary: 'List monitoring templates',
    description: 'Paginated, with filters and search. Requires monitoring.read.',
  })
  @ApiForbiddenResponse({ description: 'Missing monitoring.read' })
  @ApiOkResponse({ type: MonitoringTemplatePage })
  @ApiBadRequestResponse({ description: 'Invalid query parameter' })
  findAll(@Query() query: QueryMonitoringTemplatesDto) {
    return this.templates.findAll(query);
  }

  @Get(':id')
  @Can(MONITORING_READ)
  @ApiOperation({ summary: 'Get a monitoring template', description: 'Requires monitoring.read.' })
  @ApiForbiddenResponse({ description: 'Missing monitoring.read' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: MonitoringTemplate })
  @ApiNotFoundResponse({ description: 'No template with that id' })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.templates.findOne(id);
  }

  @Post()
  @Can(MONITORING_TEMPLATES_MANAGE)
  @ApiOperation({
    summary: 'Create a monitoring template',
    description:
      'Requires monitoring.templates.manage. You are recorded as its creator. times are local HH:mm in timezone (default Asia/Jakarta), due every day between active_from and active_until.',
  })
  @ApiCreatedResponse({ type: MonitoringTemplate })
  @ApiBadRequestResponse({ description: 'Invalid body, unknown project or client, or active_until before active_from' })
  @ApiForbiddenResponse({ description: 'Missing monitoring.templates.manage' })
  create(@Body() dto: CreateMonitoringTemplateDto, @CurrentUser() actor: AuthUser) {
    return this.templates.create(dto, actor);
  }

  @Patch(':id')
  @Can(MONITORING_TEMPLATES_MANAGE)
  @ApiOperation({
    summary: 'Update a monitoring template',
    description:
      'Requires monitoring.templates.manage. Send is_active: false to switch it off. Existing logs keep their slots when times change.',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: MonitoringTemplate })
  @ApiBadRequestResponse({ description: 'Invalid body, unknown project or client, or active_until before active_from' })
  @ApiForbiddenResponse({ description: 'Missing monitoring.templates.manage' })
  @ApiNotFoundResponse({ description: 'No template with that id' })
  update(@Param('id', ParseBigIntPipe) id: bigint, @Body() dto: UpdateMonitoringTemplateDto) {
    return this.templates.update(id, dto);
  }

  @Delete(':id')
  @Can(MONITORING_TEMPLATES_MANAGE)
  @ApiOperation({
    summary: 'Delete a monitoring template',
    description:
      'Requires monitoring.templates.manage. Refused while it has logs: switch it off with is_active: false instead.',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: MonitoringTemplate, description: 'The deleted template' })
  @ApiForbiddenResponse({ description: 'Missing monitoring.templates.manage' })
  @ApiNotFoundResponse({ description: 'No template with that id' })
  @ApiConflictResponse({ description: 'The template has logs' })
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.templates.remove(id);
  }
}
