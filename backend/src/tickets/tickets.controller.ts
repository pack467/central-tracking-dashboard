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
import { Can } from '../auth/decorators/can.decorator.js';
import { TICKETS_DELETE, TICKETS_READ, TICKETS_WRITE } from './tickets.permissions.js';
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
  @Can(TICKETS_READ)
  @ApiOperation({
    summary: 'List tickets',
    description: 'Paginated, with filters and search. Requires tickets.read.',
  })
  @ApiForbiddenResponse({ description: 'Missing tickets.read' })
  @ApiOkResponse({ type: TicketPage })
  @ApiBadRequestResponse({ description: 'Invalid query parameter' })
  findAll(@Query() query: QueryTicketsDto) {
    return this.tickets.findAll(query);
  }

  // Declared before ':id' so "summary" isn't read as an id.
  @Get('summary')
  @Can(TICKETS_READ)
  @ApiOperation({
    summary: 'Count tickets per status',
    description: 'Takes the same filters as the list. Requires tickets.read.',
  })
  @ApiForbiddenResponse({ description: 'Missing tickets.read' })
  @ApiOkResponse({ type: TicketSummary })
  summary(@Query() filters: TicketFiltersDto) {
    return this.tickets.summary(filters);
  }

  @Get(':id')
  @Can(TICKETS_READ)
  @ApiOperation({ summary: 'Get a ticket', description: 'Requires tickets.read.' })
  @ApiForbiddenResponse({ description: 'Missing tickets.read' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: Ticket })
  @ApiNotFoundResponse({ description: 'No ticket with that id' })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.tickets.findOne(id);
  }

  @Post()
  @Can(TICKETS_WRITE)
  @ApiOperation({
    summary: 'Create a ticket',
    description:
      'Requires tickets.write. Assigned to you unless user_id is given; choosing another assignee (or none) also requires tickets.write.any. Tenant comes from the project. Status Closed stamps closed_at.',
  })
  @ApiCreatedResponse({ type: Ticket })
  @ApiBadRequestResponse({ description: 'Invalid body, unknown or inactive reference, tenant/project mismatch, or closed_at before open_at' })
  @ApiForbiddenResponse({ description: 'Missing tickets.write, or assigning to someone else without tickets.write.any' })
  create(@Body() dto: CreateTicketDto, @CurrentUser() actor: AuthUser) {
    return this.tickets.create(dto, actor);
  }

  @Patch(':id')
  @Can(TICKETS_WRITE)
  @ApiOperation({
    summary: 'Update a ticket',
    description:
      'Requires tickets.write. With tickets.write.any: any ticket, any assignee. Without it: only tickets assigned to you, and no reassigning. Changing status to Closed stamps closed_at; moving out of Closed clears it (unless closed_at is sent).',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: Ticket })
  @ApiBadRequestResponse({ description: 'Invalid body, unknown or inactive reference, tenant/project mismatch, or closed_at before open_at' })
  @ApiForbiddenResponse({ description: 'Missing tickets.write, or editing/reassigning a ticket that is not yours without tickets.write.any' })
  @ApiNotFoundResponse({ description: 'No ticket with that id' })
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.tickets.update(id, dto, actor);
  }

  @Delete(':id')
  @Can(TICKETS_DELETE)
  @ApiOperation({ summary: 'Delete a ticket', description: 'Requires tickets.delete.' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: Ticket, description: 'The deleted ticket' })
  @ApiForbiddenResponse({ description: 'Missing tickets.delete' })
  @ApiNotFoundResponse({ description: 'No ticket with that id' })
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.tickets.remove(id);
  }
}
