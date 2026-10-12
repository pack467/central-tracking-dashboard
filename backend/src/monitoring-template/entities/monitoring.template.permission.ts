import { definePermission } from '../../auth/permissions.js';

export const MONITORINGS_READ = definePermission(
  'monitorings.read',
  'Read list monitoring'
);

export const MONITORINGS_WRITE = definePermission(
  'monitorings.write',
  'Creating and Updating list Monitorings assigned to you'
);

export const MONITORINGS_WRITE_ANY = definePermission(
  'monitorings.write.any',
  'Update any monitoring and choose any asignee (with monitorings.write)'
);

export const MONITORINGS_DELETE = definePermission(
  'monitorings.delete',
  'Delete Monitoring(s)'
);

// export const MONITORINGS_LOOKUPS_MANAGE = definePermission(
//   'monitoring-lookups.manage',
//   'Create, update, and delete'
// );
