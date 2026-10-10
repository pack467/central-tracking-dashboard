import { definePermission } from '../auth/permissions.js';

export const USERS_READ = definePermission('users.read', 'Read users');
export const USERS_MANAGE = definePermission(
  'users.manage',
  'Create, update and delete users whose role is below yours',
);
export const USERS_MANAGE_ALL = definePermission(
  'users.manage.all',
  'Manage any user and assign any role, with no hierarchy limit',
);
