# Data model (`prisma/schema.prisma`)

Conventions:
- Every PK is `BigInt` with autoincrement (`BIGSERIAL`), including `UserRole.id`, which became autoincrement on 2026-10-05.
- `migrate status` only compares migration files with the DB, not with the schema. After editing `schema.prisma`, use `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` to see the real drift.
- Columns are snake_case. Models are PascalCase and mapped to snake_case tables with `@@map`.
- **All timestamps are `timestamptz`** (`@db.Timestamptz(6)`, 39 columns, since 2026-10-10): the DB stores unambiguous instants. The app writes UTC (the ticket import converts WIB → UTC; ticket 1's "22/05/2025 09:06 WIB" reads back as `2025-05-22T02:06:00Z`). `log_date` (`Date`) and `checkpoint_time` (`Time`) are unchanged. Every table has `created_at`/`updated_at` (default `now()`, `updated_at` via `@updatedAt`).
- **`citext`** (Postgres case-insensitive text; extension enabled via `extensions = [citext]` plus the `postgresqlExtensions` preview feature in the generator) is used for `users.email`, `user_role.name`, `ticket_categories.name` and `ticket_severities.code_name`. Each has `@unique`, so **the DB itself rejects values differing only in case** (e.g. "admin" vs "ADMIN"). Caveat: Prisma compares parameters as plain text, so `where: { email: x }` is **case-sensitive** from Prisma. That's why emails are also **stored lowercase** (DTO transform, seed) and login lowercases the identifier.
- **Required (NOT NULL) where the app requires it** (2026-10-10, data had 0 nulls): `users.name/email`, `ticket_logs.subject/project_id/status/open_at` (`open_at` defaults to `now()`), `projects.name/tenant_id`, `tenants.name`, `clients.name`, `ticket_categories.name`, `ticket_severities.code_name/name`, `user_role.name`. Other columns stay nullable. Update DTOs use `PartialType(..., { skipNullProperties: false })` so `null` for a required field is a 400, not a DB error.
- FKs use `onDelete: NoAction, onUpdate: NoAction`, except `users.role_id` (only `onUpdate: NoAction`, so the delete rule defaults to `ON DELETE SET NULL`; the roles API refuses to delete a role in use) and `role_permissions` (see below).
- **Indexes** (27, besides primary keys):
  - unique: `users.nik`, `users.email`, `user_role.name`, `ticket_categories.name`, `ticket_severities.code_name`
  - `ticket_logs`: `open_at DESC` (default list sort), `status` (filter + summary), `(project_id, open_at DESC)`, and one each on `user_id`, `tenant_id`, `client_id`, `severity_id`, `category_id`
  - other foreign keys: `users.role_id`, `projects.tenant_id`, `role_permissions.permission_key`, and the handover/routine/monitoring FKs (`monitoring_logs` is on `(project_id, log_date)`)
- A unique violation the services don't pre-check (a race) is mapped to **409** by `GlobalExceptionFilter` (Prisma `P2002`).

| Model → table | Fields (besides id/timestamps) | Relations |
|---|---|---|
| `User` → `users` | **name**(255), nik(255, unique), **email**(citext, unique, stored lowercase), role_id, is_active (default true), password(100, must be a hash, e.g. bcrypt `$2b$`), photo_url(500), department(255) | role → UserRole; handovers as `HandoverUpdatedBy` / `HandoverAcknowledgedBy`; routineMeetings, routineReports (as PIC); ticketLogs |
| `UserRole` → `user_role` | **name**(citext, unique), description(500) | users; permissions (RolePermission) |
| `Permission` → `permissions` | **key**(100, PK), description(text), obsolete_at, timestamps | roles (RolePermission) |
| `RolePermission` → `role_permissions` | **PK (role_id, permission_key)**, created_at; index on permission_key | role → UserRole (**ON DELETE CASCADE**), permission → Permission (**ON DELETE RESTRICT**, ON UPDATE CASCADE). See `permissions.md`. |
| `Tenant` → `tenants` | **name**(255), detail_info(text) | projects, monitoringLogs, monitoringTemplates, ticketLogs |
| `Project` → `projects` | **name**(255), **tenant_id**, code_prefix(100) | tenant; handovers, monitoring*, routine*, ticketLogs |
| `Client` → `clients` | **name**(255), detail_info(text) | ticketLogs |
| `TicketLog` → `ticket_logs` | third_party_ticket_id(100, **not unique**: 102 values repeat), **project_id**, client_id, tenant_id, user_id, severity_id, category_id, requester(100), **subject**(500), description(text), **status** `TicketStatus` (default Open), **open_at** (default now), closed_at | project, client, tenant, user, severity, category |
| `TicketCategory` → `ticket_categories` | **name**(citext, unique), description(text) | ticketLogs |
| `TicketSeverity` → `ticket_severities` | **code_name**(citext, unique), **name**(100) | ticketLogs |
| `Handover` → `handover` | updated_user_id, acknowledge_user_id, project_id, content(text), status `RoutineStatus` (default Open), category `HandoverCategory`, is_repeatable (default false) | updatedBy, acknowledgedBy (User), project |
| `RoutineMeeting` → `routine_meetings` | project_id, pic_user_id, meeting_name(255), start_at, target_completed_at, status_update(500), meeting_room_url(text), status `RoutineStatus`, is_temporary (default false) | pic (User), project |
| `RoutineReport` → `routine_reports` | project_id, pic_user_id, report_name(255), start_at, target_completed_at, status_update(500), doc_url(text), status `RoutineStatus` | pic (User), project |
| `MonitoringLog` → `monitoring_logs` | project_id, tenant_id, log_date (`Date`), checkpoint_time (`Time(6)`), checkpoint_description(255), result_note(text) | project, tenant |
| `MonitoringTemplate` → `monitoring_template` | same as MonitoringLog + is_temporary (default false) | project, tenant |

Enums (with their Postgres type names):
- `TicketStatus` (`ticket_status_enum`): Open, Closed, Activity, Meeting, Pending, ReOpen
- `RoutineStatus` (`routine_status_enum`): Open, Closed, ReOpen, Pending
- `HandoverCategory` (`handover_category_enum`): Note, Task, Monitoring

There is no `requesters` table. `ticket_logs.requester` is a free-text column, and the import always sets it to `null`.
