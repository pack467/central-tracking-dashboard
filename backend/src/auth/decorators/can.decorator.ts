import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';
import type { Permission } from '../permissions.js';

export const PERMISSIONS_KEY = 'permissions';

// Requires ALL listed permissions (403 otherwise). Without @Can, any
// authenticated user is allowed. The requirement also appears in the OpenAPI
// doc as `x-required-permissions`; describe it in @ApiForbiddenResponse too.
export const Can = (...permissions: Permission[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    ApiExtension('x-required-permissions', permissions),
  );
