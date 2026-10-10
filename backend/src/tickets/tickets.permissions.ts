import { definePermission } from '../auth/permissions.js';

export const TICKETS_READ = definePermission(
  'tickets.read',
  'Read tickets, the ticket summary, categories and severities',
);
export const TICKETS_WRITE = definePermission(
  'tickets.write',
  'Create tickets, and update tickets assigned to you',
);
export const TICKETS_WRITE_ANY = definePermission(
  'tickets.write.any',
  'Update any ticket and choose any assignee (with tickets.write)',
);
export const TICKETS_DELETE = definePermission('tickets.delete', 'Delete tickets');
export const TICKET_LOOKUPS_MANAGE = definePermission(
  'ticket-lookups.manage',
  'Create, update and delete ticket categories and severities',
);
