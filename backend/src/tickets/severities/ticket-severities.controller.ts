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
import { Roles } from '../../auth/decorators/roles.decorator.js';
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
  @ApiOperation({ summary: 'List ticket severities' })
  @ApiOkResponse({ type: [TicketSeverity] })
  findAll() {
    return this.severities.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket severity' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: TicketSeverity })
  @ApiNotFoundResponse({ description: 'No severity with that id' })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.severities.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create a ticket severity', description: 'SUPER_ADMIN or ADMIN.' })
  @ApiCreatedResponse({ type: TicketSeverity })
  @ApiForbiddenResponse({ description: 'Not allowed for your role' })
  @ApiConflictResponse({ description: 'code_name already in use' })
  create(@Body() dto: CreateTicketSeverityDto) {
    return this.severities.create(dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update a ticket severity', description: 'SUPER_ADMIN or ADMIN.' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: TicketSeverity })
  @ApiForbiddenResponse({ description: 'Not allowed for your role' })
  @ApiNotFoundResponse({ description: 'No severity with that id' })
  @ApiConflictResponse({ description: 'code_name already in use' })
  update(@Param('id', ParseBigIntPipe) id: bigint, @Body() dto: UpdateTicketSeverityDto) {
    return this.severities.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete a ticket severity', description: 'SUPER_ADMIN or ADMIN. Refused while any ticket uses it.' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: TicketSeverity, description: 'The deleted severity' })
  @ApiForbiddenResponse({ description: 'Not allowed for your role' })
  @ApiNotFoundResponse({ description: 'No severity with that id' })
  @ApiConflictResponse({ description: 'Still used by tickets' })
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.severities.remove(id);
  }
}
