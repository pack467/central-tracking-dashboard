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
import { TICKETS_READ, TICKET_LOOKUPS_MANAGE } from '../tickets.permissions.js';
import { TicketCategoriesService } from './ticket-categories.service.js';
import {
  CreateTicketCategoryDto,
  TicketCategory,
  UpdateTicketCategoryDto,
} from './dto/ticket-category.dto.js';

const ID_PARAM = { name: 'id', type: String, example: '3', description: 'Category id (digits only)' };

@ApiTags('ticket-categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token, or the user is inactive' })
@Controller('ticket-categories')
export class TicketCategoriesController {
  constructor(private readonly categories: TicketCategoriesService) {}

  @Get()
  @Can(TICKETS_READ)
  @ApiOperation({ summary: 'List ticket categories', description: 'Requires tickets.read.' })
  @ApiForbiddenResponse({ description: 'Missing tickets.read' })
  @ApiOkResponse({ type: [TicketCategory] })
  findAll() {
    return this.categories.findAll();
  }

  @Get(':id')
  @Can(TICKETS_READ)
  @ApiOperation({ summary: 'Get a ticket category', description: 'Requires tickets.read.' })
  @ApiForbiddenResponse({ description: 'Missing tickets.read' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: TicketCategory })
  @ApiNotFoundResponse({ description: 'No category with that id' })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.categories.findOne(id);
  }

  @Post()
  @Can(TICKET_LOOKUPS_MANAGE)
  @ApiOperation({ summary: 'Create a ticket category', description: 'Requires ticket-lookups.manage.' })
  @ApiCreatedResponse({ type: TicketCategory })
  @ApiForbiddenResponse({ description: 'Missing ticket-lookups.manage' })
  @ApiConflictResponse({ description: 'Name already in use' })
  create(@Body() dto: CreateTicketCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @Can(TICKET_LOOKUPS_MANAGE)
  @ApiOperation({ summary: 'Update a ticket category', description: 'Requires ticket-lookups.manage.' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: TicketCategory })
  @ApiForbiddenResponse({ description: 'Missing ticket-lookups.manage' })
  @ApiNotFoundResponse({ description: 'No category with that id' })
  @ApiConflictResponse({ description: 'Name already in use' })
  update(@Param('id', ParseBigIntPipe) id: bigint, @Body() dto: UpdateTicketCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @Can(TICKET_LOOKUPS_MANAGE)
  @ApiOperation({ summary: 'Delete a ticket category', description: 'Requires ticket-lookups.manage. Refused while any ticket uses it.' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: TicketCategory, description: 'The deleted category' })
  @ApiForbiddenResponse({ description: 'Missing ticket-lookups.manage' })
  @ApiNotFoundResponse({ description: 'No category with that id' })
  @ApiConflictResponse({ description: 'Still used by tickets' })
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.categories.remove(id);
  }
}
