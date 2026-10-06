import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { PERMISSIONS } from '../../auth/permissions.js';
import { TicketSeveritiesService } from './ticket-severities.service.js';
import {
  CreateTicketSeverityDto,
  TicketSeverity,
  UpdateTicketSeverityDto,
} from './dto/ticket-severity.dto.js';

const ID_PARAM = { name: 'id', type: String, example: '3', description: 'Severity id (digits only)' };

@ApiTags('ticket-severities')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token, or the user is inactive' })
@Controller('ticket-severities')
export class TicketSeveritiesController {
  constructor(private readonly severities: TicketSeveritiesService) {}

  @Get()
  @Can(PERMISSIONS.TICKETS_READ)
  @ApiOperation({ summary: 'List ticket severities', description: 'Requires tickets.read.' })
  @ApiForbiddenResponse({ description: 'Missing tickets.read' })
  @ApiOkResponse({ type: [TicketSeverity] })
  findAll() {
    return this.severities.findAll();
  }

  @Get(':id')
  @Can(PERMISSIONS.TICKETS_READ)
  @ApiOperation({ summary: 'Get a ticket severity', description: 'Requires tickets.read.' })
  @ApiForbiddenResponse({ description: 'Missing tickets.read' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: TicketSeverity })
  @ApiNotFoundResponse({ description: 'No severity with that id' })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.severities.findOne(id);
  }

  @Post()
  @Can(PERMISSIONS.TICKET_LOOKUPS_MANAGE)
  @ApiOperation({ summary: 'Create a ticket severity', description: 'Requires ticket-lookups.manage.' })
  @ApiCreatedResponse({ type: TicketSeverity })
  @ApiForbiddenResponse({ description: 'Missing ticket-lookups.manage' })
  @ApiConflictResponse({ description: 'code_name already in use' })
  create(@Body() dto: CreateTicketSeverityDto) {
    return this.severities.create(dto);
  }

  @Patch(':id')
  @Can(PERMISSIONS.TICKET_LOOKUPS_MANAGE)
  @ApiOperation({ summary: 'Update a ticket severity', description: 'Requires ticket-lookups.manage.' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: TicketSeverity })
  @ApiForbiddenResponse({ description: 'Missing ticket-lookups.manage' })
  @ApiNotFoundResponse({ description: 'No severity with that id' })
  @ApiConflictResponse({ description: 'code_name already in use' })
  update(@Param('id', ParseBigIntPipe) id: bigint, @Body() dto: UpdateTicketSeverityDto) {
    return this.severities.update(id, dto);
  }

  @Delete(':id')
  @Can(PERMISSIONS.TICKET_LOOKUPS_MANAGE)
  @ApiOperation({ summary: 'Delete a ticket severity', description: 'Requires ticket-lookups.manage. Refused while any ticket uses it.' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: TicketSeverity, description: 'The deleted severity' })
  @ApiForbiddenResponse({ description: 'Missing ticket-lookups.manage' })
  @ApiNotFoundResponse({ description: 'No severity with that id' })
  @ApiConflictResponse({ description: 'Still used by tickets' })
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.severities.remove(id);
  }
}
