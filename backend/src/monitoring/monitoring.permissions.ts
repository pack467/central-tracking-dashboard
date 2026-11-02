import { definePermission } from '../auth/permissions.js';

export const MONITORING_READ = definePermission('monitoring.read', 'Read monitoring templates and logs');
export const MONITORING_CHECK = definePermission(
  'monitoring.check',
  'Record monitoring checks (logs), and correct the ones you recorded',
);
export const MONITORING_CHECK_ANY = definePermission(
  'monitoring.check.any',
  "Correct anyone's monitoring logs (with monitoring.check)",
);
export const MONITORING_REVIEW = definePermission('monitoring.review', 'Review monitoring logs');
export const MONITORING_TEMPLATES_MANAGE = definePermission(
  'monitoring.templates.manage',
  'Create, update and delete monitoring templates',
);
export const MONITORING_DELETE = definePermission('monitoring.delete', 'Delete monitoring logs');
