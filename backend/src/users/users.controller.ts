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
import { Can } from '../auth/decorators/can.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';
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
  @Can(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({
    summary: 'Create a user',
    description:
      'Requires users.manage. You can only assign a role with fewer permissions than your own, unless you have users.manage.all.',
  })
  @ApiCreatedResponse({ type: User })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiForbiddenResponse({ description: 'Missing users.manage, or the role is not below yours' })
  @ApiConflictResponse({ description: 'Email or NIK already in use, or role_id does not exist' })
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.usersService.create(createUserDto, actor);
  }

  @Get()
  @Can(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'List all users', description: 'Requires users.read.' })
  @ApiForbiddenResponse({ description: 'Missing users.read' })
  @ApiOkResponse({ type: [User] })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Can(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Get a user', description: 'Requires users.read.' })
  @ApiForbiddenResponse({ description: 'Missing users.read' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: User })
  @ApiNotFoundResponse({ description: 'No user with that id' })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Can(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({
    summary: 'Update a user',
    description:
      'Requires users.manage. Without users.manage.all you can only modify users (and assign roles) with fewer permissions than you, and cannot change your own role. Nobody can deactivate their own account.',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: User })
  @ApiBadRequestResponse({ description: 'Invalid body or id' })
  @ApiForbiddenResponse({ description: 'Missing users.manage, target or role not below yours, or a blocked self-action' })
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
  @Can(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({
    summary: 'Delete a user',
    description:
      'Requires users.manage. Without users.manage.all you can only delete users with fewer permissions than you. Nobody can delete their own account.',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: User, description: 'The deleted user' })
  @ApiForbiddenResponse({ description: 'Missing users.manage, target not below you, or deleting yourself' })
  @ApiNotFoundResponse({ description: 'No user with that id' })
  @ApiConflictResponse({ description: 'The user is still referenced by tickets, handovers or other records' })
  remove(@Param('id', ParseBigIntPipe) id: bigint, @CurrentUser() actor: AuthUser) {
    return this.usersService.remove(id, actor);
  }
}
