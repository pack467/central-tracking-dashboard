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
import {
  MONITORING_CHECK,
  MONITORING_DELETE,
  MONITORING_READ,
  MONITORING_REVIEW,
} from '../monitoring.permissions.js';
import { MonitoringLogsService } from './monitoring-logs.service.js';
import { CreateMonitoringLogDto } from './dto/create-monitoring-log.dto.js';
import { UpdateMonitoringLogDto } from './dto/update-monitoring-log.dto.js';
import { ReviewMonitoringLogDto } from './dto/review-monitoring-log.dto.js';
import { QueryMonitoringLogsDto } from './dto/query-monitoring-logs.dto.js';
import { MonitoringLog, MonitoringLogPage } from './entities/monitoring-log.entity.js';

const ID_PARAM = { name: 'id', type: String, example: '501', description: 'Log id (digits only)' };

@ApiTags('monitoring-logs')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Not logged in (no or expired session), or the user is inactive' })
@Controller('monitoring-logs')
export class MonitoringLogsController {
  constructor(private readonly logs: MonitoringLogsService) {}

  @Get()
  @Can(MONITORING_READ)
  @ApiOperation({
    summary: 'List monitoring logs',
    description: 'Paginated, with filters. Newest slot first by default. Requires monitoring.read.',
  })
  @ApiForbiddenResponse({ description: 'Missing monitoring.read' })
  @ApiOkResponse({ type: MonitoringLogPage })
  @ApiBadRequestResponse({ description: 'Invalid query parameter' })
  findAll(@Query() query: QueryMonitoringLogsDto) {
    return this.logs.findAll(query);
  }

  @Get(':id')
  @Can(MONITORING_READ)
  @ApiOperation({ summary: 'Get a monitoring log', description: 'Requires monitoring.read.' })
  @ApiForbiddenResponse({ description: 'Missing monitoring.read' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: MonitoringLog })
  @ApiNotFoundResponse({ description: 'No log with that id' })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.logs.findOne(id);
  }

  @Post()
  @Can(MONITORING_CHECK)
  @ApiOperation({
    summary: 'Record a check (create a monitoring log)',
    description:
      "Requires monitoring.check. You are recorded as the checker, and checked_at is now. scheduled_at is the slot checked (usually that day at the template's time); it isn't validated against the template. One log per template and slot. NOK needs a note.",
  })
  @ApiCreatedResponse({ type: MonitoringLog })
  @ApiBadRequestResponse({ description: 'Invalid body, unknown template or ticket, or NOK without a note' })
  @ApiForbiddenResponse({ description: 'Missing monitoring.check' })
  @ApiConflictResponse({ description: 'The slot is already logged' })
  create(@Body() dto: CreateMonitoringLogDto, @CurrentUser() actor: AuthUser) {
    return this.logs.create(dto, actor);
  }

  @Patch(':id')
  @Can(MONITORING_CHECK)
  @ApiOperation({
    summary: 'Correct a monitoring log',
    description:
      "Requires monitoring.check. Without monitoring.check.any: only logs you recorded. The slot (template_id, scheduled_at) can't change. NOK needs a note.",
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: MonitoringLog })
  @ApiBadRequestResponse({ description: 'Invalid body, unknown ticket, or NOK without a note' })
  @ApiForbiddenResponse({ description: "Missing monitoring.check, or correcting someone else's log without monitoring.check.any" })
  @ApiNotFoundResponse({ description: 'No log with that id' })
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: UpdateMonitoringLogDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.logs.update(id, dto, actor);
  }

  @Patch(':id/review')
  @Can(MONITORING_REVIEW)
  @ApiOperation({
    summary: 'Review a monitoring log',
    description: 'Requires monitoring.review. Records you as the reviewer, now; reviewing again replaces the earlier review.',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: MonitoringLog })
  @ApiForbiddenResponse({ description: 'Missing monitoring.review' })
  @ApiNotFoundResponse({ description: 'No log with that id' })
  review(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: ReviewMonitoringLogDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.logs.review(id, dto, actor);
  }

  @Delete(':id')
  @Can(MONITORING_DELETE)
  @ApiOperation({ summary: 'Delete a monitoring log', description: 'Requires monitoring.delete. The slot becomes missed again.' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: MonitoringLog, description: 'The deleted log' })
  @ApiForbiddenResponse({ description: 'Missing monitoring.delete' })
  @ApiNotFoundResponse({ description: 'No log with that id' })
  @ApiConflictResponse({ description: 'A handover refers to the log' })
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.logs.remove(id);
  }
}
