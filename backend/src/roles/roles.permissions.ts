import { definePermission } from '../auth/permissions.js';

export const ROLES_READ = definePermission(
  'roles.read',
  'List and view roles, their permissions and the permission catalogue',
);
export const ROLES_MANAGE = definePermission(
  'roles.manage',
  'Create, update and delete roles, grant and revoke their permissions, and edit permission descriptions',
);
