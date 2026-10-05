import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { TicketsService } from './tickets.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { QueryTicketsDto, TicketFiltersDto } from './dto/query-tickets.dto.js';
import { Ticket, TicketPage, TicketSummary } from './entities/ticket.entity.js';

const ID_PARAM = { name: 'id', type: String, example: '3650', description: 'Ticket id (digits only)' };

@ApiTags('tickets')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token, or the user is inactive' })
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @ApiOperation({
    summary: 'List tickets',
    description: 'Paginated, with filters and search. Any logged-in user.',
  })
  @ApiOkResponse({ type: TicketPage })
  @ApiBadRequestResponse({ description: 'Invalid query parameter' })
  findAll(@Query() query: QueryTicketsDto) {
    return this.tickets.findAll(query);
  }

  // Declared before ':id' so "summary" isn't read as an id.
  @Get('summary')
  @ApiOperation({
    summary: 'Count tickets per status',
    description: 'Takes the same filters as the list. Any logged-in user.',
  })
  @ApiOkResponse({ type: TicketSummary })
  summary(@Query() filters: TicketFiltersDto) {
    return this.tickets.summary(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: Ticket })
  @ApiNotFoundResponse({ description: 'No ticket with that id' })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.tickets.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD', 'AGENT')
  @ApiOperation({
    summary: 'Create a ticket',
    description:
      'SUPER_ADMIN, ADMIN, TEAM_LEAD or AGENT. Assigned to you unless user_id is given; an AGENT can only assign it to themselves. Tenant comes from the project. Status Closed stamps closed_at.',
  })
  @ApiCreatedResponse({ type: Ticket })
  @ApiBadRequestResponse({ description: 'Invalid body, unknown or inactive reference, tenant/project mismatch, or closed_at before open_at' })
  @ApiForbiddenResponse({ description: 'VIEWER, or an AGENT assigning to someone else' })
  create(@Body() dto: CreateTicketDto, @CurrentUser() actor: AuthUser) {
    return this.tickets.create(dto, actor);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD', 'AGENT')
  @ApiOperation({
    summary: 'Update a ticket',
    description:
      'SUPER_ADMIN, ADMIN or TEAM_LEAD: any ticket. AGENT: only tickets assigned to them, and cannot reassign. Changing status to Closed stamps closed_at; moving out of Closed clears it (unless closed_at is sent).',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: Ticket })
  @ApiBadRequestResponse({ description: 'Invalid body, unknown or inactive reference, tenant/project mismatch, or closed_at before open_at' })
  @ApiForbiddenResponse({ description: 'VIEWER, or an AGENT editing or reassigning a ticket that is not theirs' })
  @ApiNotFoundResponse({ description: 'No ticket with that id' })
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.tickets.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete a ticket', description: 'SUPER_ADMIN or ADMIN.' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: Ticket, description: 'The deleted ticket' })
  @ApiForbiddenResponse({ description: 'Not allowed for your role' })
  @ApiNotFoundResponse({ description: 'No ticket with that id' })
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.tickets.remove(id);
  }
}
