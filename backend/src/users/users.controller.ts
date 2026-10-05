import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';

const ID_PARAM = { name: 'id', type: String, example: '10', description: 'User id (digits only)' };

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token, or the user is inactive' })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Create a user',
    description: 'SUPER_ADMIN or ADMIN. Only a SUPER_ADMIN can assign the SUPER_ADMIN or ADMIN role.',
  })
  @ApiCreatedResponse({ type: User })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiForbiddenResponse({ description: 'Not allowed for your role' })
  @ApiConflictResponse({ description: 'Email or NIK already in use, or role_id does not exist' })
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.usersService.create(createUserDto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiOkResponse({ type: [User] })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: User })
  @ApiNotFoundResponse({ description: 'No user with that id' })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Update a user',
    description:
      'SUPER_ADMIN or ADMIN. An ADMIN cannot change their own role, assign SUPER_ADMIN/ADMIN, or modify other admins or super admins. Nobody can deactivate their own account.',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: User })
  @ApiBadRequestResponse({ description: 'Invalid body or id' })
  @ApiForbiddenResponse({ description: 'Not allowed for your role, or a self-action that is blocked' })
  @ApiNotFoundResponse({ description: 'No user with that id' })
  @ApiConflictResponse({ description: 'Email or NIK already in use, or role_id does not exist' })
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.update(id, updateUserDto, actor);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Delete a user',
    description: 'SUPER_ADMIN or ADMIN. An ADMIN cannot delete admins or super admins. Nobody can delete their own account.',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: User, description: 'The deleted user' })
  @ApiForbiddenResponse({ description: 'Not allowed for your role, or deleting yourself' })
  @ApiNotFoundResponse({ description: 'No user with that id' })
  @ApiConflictResponse({ description: 'The user is still referenced by tickets, handovers or other records' })
  remove(@Param('id', ParseBigIntPipe) id: bigint, @CurrentUser() actor: AuthUser) {
    return this.usersService.remove(id, actor);
  }
}
