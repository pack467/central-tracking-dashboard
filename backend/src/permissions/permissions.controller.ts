import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Can } from '../auth/decorators/can.decorator.js';
import { ROLES_MANAGE, ROLES_READ } from '../roles/roles.permissions.js';
import { PermissionsService } from './permissions.service.js';
import { PermissionInfo, UpdatePermissionDto } from './dto/permission.dto.js';

// The permission catalogue. Keys come from definePermission() in code and are
// registered at startup; only descriptions are editable here.
@ApiTags('permissions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token, or the user is inactive' })
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  @Can(ROLES_READ)
  @ApiOperation({
    summary: 'List all permissions',
    description:
      'Requires roles.read. Every key the code defines, plus "*", with its description, whether it is obsolete, and which roles have it.',
  })
  @ApiOkResponse({ type: [PermissionInfo] })
  @ApiForbiddenResponse({ description: 'Missing roles.read' })
  findAll() {
    return this.permissions.findAll();
  }

  @Patch(':key')
  @Can(ROLES_MANAGE)
  @ApiOperation({
    summary: "Edit a permission's description",
    description: 'Requires roles.manage. Keys themselves come from code and cannot be created or renamed here.',
  })
  @ApiParam({ name: 'key', example: 'tickets.read' })
  @ApiOkResponse({ type: PermissionInfo })
  @ApiForbiddenResponse({ description: 'Missing roles.manage' })
  @ApiNotFoundResponse({ description: 'No permission with that key' })
  updateDescription(@Param('key') key: string, @Body() dto: UpdatePermissionDto) {
    return this.permissions.updateDescription(key, dto.description);
  }
}
