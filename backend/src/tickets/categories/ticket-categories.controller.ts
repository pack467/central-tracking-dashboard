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
  @ApiOperation({ summary: 'List ticket categories' })
  @ApiOkResponse({ type: [TicketCategory] })
  findAll() {
    return this.categories.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket category' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: TicketCategory })
  @ApiNotFoundResponse({ description: 'No category with that id' })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.categories.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create a ticket category', description: 'SUPER_ADMIN or ADMIN.' })
  @ApiCreatedResponse({ type: TicketCategory })
  @ApiForbiddenResponse({ description: 'Not allowed for your role' })
  @ApiConflictResponse({ description: 'Name already in use' })
  create(@Body() dto: CreateTicketCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update a ticket category', description: 'SUPER_ADMIN or ADMIN.' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: TicketCategory })
  @ApiForbiddenResponse({ description: 'Not allowed for your role' })
  @ApiNotFoundResponse({ description: 'No category with that id' })
  @ApiConflictResponse({ description: 'Name already in use' })
  update(@Param('id', ParseBigIntPipe) id: bigint, @Body() dto: UpdateTicketCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete a ticket category', description: 'SUPER_ADMIN or ADMIN. Refused while any ticket uses it.' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: TicketCategory, description: 'The deleted category' })
  @ApiForbiddenResponse({ description: 'Not allowed for your role' })
  @ApiNotFoundResponse({ description: 'No category with that id' })
  @ApiConflictResponse({ description: 'Still used by tickets' })
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.categories.remove(id);
  }
}
