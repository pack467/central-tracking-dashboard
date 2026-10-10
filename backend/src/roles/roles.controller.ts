import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
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
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe.js';
import { Can } from '../auth/decorators/can.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ROLES_MANAGE, ROLES_READ } from './roles.permissions.js';
import type { AuthUser } from '../auth/auth.types.js';
import { RolesService } from './roles.service.js';
import { CreateRoleDto, Role, SetRolePermissionsDto, UpdateRoleDto } from './dto/role.dto.js';

const ID_PARAM = { name: 'id', type: String, example: '6', description: 'Role id (digits only)' };
const KEY_PARAM = { name: 'key', example: 'tickets.delete', description: 'Permission key, or "*"' };
const WRITE_FORBIDDEN =
  'Missing roles.manage, role exceeds yours, granting what you lack, or removing roles.manage from your own role';

// Reading needs roles.read (ADMIN and SUPER_ADMIN by default); changing needs
// roles.manage (only SUPER_ADMIN by default, through "*"). The permission
// catalogue itself is at /permissions.
@ApiTags('roles')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token, or the user is inactive' })
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @Can(ROLES_READ)
  @ApiOperation({ summary: 'List roles', description: 'Requires roles.read.' })
  @ApiOkResponse({ type: [Role] })
  @ApiForbiddenResponse({ description: 'Missing roles.read' })
  findAll() {
    return this.roles.findAll();
  }

  @Get(':id')
  @Can(ROLES_READ)
  @ApiOperation({ summary: 'Get a role', description: 'Requires roles.read.' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: Role })
  @ApiForbiddenResponse({ description: 'Missing roles.read' })
  @ApiNotFoundResponse({ description: 'No role with that id' })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.roles.findOne(id);
  }

  @Post()
  @Can(ROLES_MANAGE)
  @ApiOperation({
    summary: 'Create a role',
    description:
      'Requires roles.manage. Permissions must exist in GET /permissions and not be obsolete. You can only grant permissions you have, and "*" only if your own role has "*".',
  })
  @ApiCreatedResponse({ type: Role })
  @ApiBadRequestResponse({ description: 'Invalid body, or unknown/obsolete permission' })
  @ApiForbiddenResponse({ description: 'Missing roles.manage, or granting a permission you do not have' })
  @ApiConflictResponse({ description: 'Name already in use' })
  create(@Body() dto: CreateRoleDto, @CurrentUser() actor: AuthUser) {
    return this.roles.create(dto, actor);
  }

  @Patch(':id')
  @Can(ROLES_MANAGE)
  @ApiOperation({
    summary: 'Update a role',
    description:
      'Requires roles.manage. `permissions`, if sent, replaces the whole list. Changes apply to its users on their next request.',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: Role })
  @ApiBadRequestResponse({ description: 'Invalid body, or unknown/obsolete permission' })
  @ApiForbiddenResponse({ description: WRITE_FORBIDDEN })
  @ApiNotFoundResponse({ description: 'No role with that id' })
  @ApiConflictResponse({ description: 'Name already in use' })
  update(@Param('id', ParseBigIntPipe) id: bigint, @Body() dto: UpdateRoleDto, @CurrentUser() actor: AuthUser) {
    return this.roles.update(id, dto, actor);
  }

  @Put(':id/permissions')
  @Can(ROLES_MANAGE)
  @ApiOperation({
    summary: "Replace a role's permissions",
    description: 'Requires roles.manage. The "save" of a checkbox editor: the role ends up with exactly these.',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: Role })
  @ApiBadRequestResponse({ description: 'Invalid body, or unknown/obsolete permission' })
  @ApiForbiddenResponse({ description: WRITE_FORBIDDEN })
  @ApiNotFoundResponse({ description: 'No role with that id' })
  setPermissions(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: SetRolePermissionsDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.roles.setPermissions(id, dto.permissions, actor);
  }

  @Post(':id/permissions/:key')
  @Can(ROLES_MANAGE)
  @ApiOperation({
    summary: 'Grant one permission to a role',
    description: 'Requires roles.manage. Does nothing if the role already has it.',
  })
  @ApiParam(ID_PARAM)
  @ApiParam(KEY_PARAM)
  @ApiCreatedResponse({ type: Role })
  @ApiBadRequestResponse({ description: 'Unknown or obsolete permission' })
  @ApiForbiddenResponse({ description: WRITE_FORBIDDEN })
  @ApiNotFoundResponse({ description: 'No role with that id' })
  grant(@Param('id', ParseBigIntPipe) id: bigint, @Param('key') key: string, @CurrentUser() actor: AuthUser) {
    return this.roles.grant(id, key, actor);
  }

  @Delete(':id/permissions/:key')
  @Can(ROLES_MANAGE)
  @ApiOperation({
    summary: 'Revoke one permission from a role',
    description: 'Requires roles.manage. Does nothing if the role does not have it.',
  })
  @ApiParam(ID_PARAM)
  @ApiParam(KEY_PARAM)
  @ApiOkResponse({ type: Role })
  @ApiForbiddenResponse({ description: WRITE_FORBIDDEN })
  @ApiNotFoundResponse({ description: 'No role with that id' })
  revoke(@Param('id', ParseBigIntPipe) id: bigint, @Param('key') key: string, @CurrentUser() actor: AuthUser) {
    return this.roles.revoke(id, key, actor);
  }

  @Delete(':id')
  @Can(ROLES_MANAGE)
  @ApiOperation({
    summary: 'Delete a role',
    description: 'Requires roles.manage. Refused while users still have the role, and for your own role.',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: Role, description: 'The deleted role' })
  @ApiForbiddenResponse({ description: 'Missing roles.manage, role exceeds yours, or it is your own role' })
  @ApiNotFoundResponse({ description: 'No role with that id' })
  @ApiConflictResponse({ description: 'Users still have this role' })
  remove(@Param('id', ParseBigIntPipe) id: bigint, @CurrentUser() actor: AuthUser) {
    return this.roles.remove(id, actor);
  }
}
