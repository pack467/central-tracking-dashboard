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
  - other foreign keys: `users.role_id`, `projects.tenant_id`, `role_permissions.permission_key`, the handover/routine FKs, and monitoring: `monitoring_checkpoints` (project_id, is_active, client_id, created_by), `monitoring_checks` (scheduled_at, checked_by, reviewed_by, result)
- A unique violation the services don't pre-check (a race) is mapped to **409** by `GlobalExceptionFilter` (Prisma `P2002`).

| Model → table | Fields (besides id/timestamps) | Relations |
|---|---|---|
| `User` → `users` | **name**(255), nik(255, unique), **email**(citext, unique, stored lowercase), role_id, is_active (default true), password(100, must be a hash, e.g. bcrypt `$2b$`), photo_url(500), department(255) | role → UserRole; handovers as `HandoverUpdatedBy` / `HandoverAcknowledgedBy`; routineMeetings, routineReports (as PIC); ticketLogs |
| `UserRole` → `user_role` | **name**(citext, unique), description(500) | users; permissions (RolePermission) |
| `Permission` → `permissions` | **key**(100, PK), description(text), obsolete_at, timestamps | roles (RolePermission) |
| `RolePermission` → `role_permissions` | **PK (role_id, permission_key)**, created_at; index on permission_key | role → UserRole (**ON DELETE CASCADE**), permission → Permission (**ON DELETE RESTRICT**, ON UPDATE CASCADE). See `permissions.md`. |
| `Tenant` → `tenants` | **name**(255), detail_info(text) | projects, ticketLogs |
| `Project` → `projects` | **name**(255), **tenant_id**, code_prefix(100) | tenant; handovers, monitoringCheckpoints, routine*, ticketLogs |
| `Client` → `clients` | **name**(255), detail_info(text) | ticketLogs |
| `TicketLog` → `ticket_logs` | third_party_ticket_id(100, **not unique**: 102 values repeat), **project_id**, client_id, tenant_id, user_id, severity_id, category_id, requester(100), **subject**(500), description(text), **status** `TicketStatus` (default Open), **open_at** (default now), closed_at | project, client, tenant, user, severity, category |
| `TicketCategory` → `ticket_categories` | **name**(citext, unique), description(text) | ticketLogs |
| `TicketSeverity` → `ticket_severities` | **code_name**(citext, unique), **name**(100) | ticketLogs |
| `Handover` → `handover` | updated_user_id, acknowledge_user_id, project_id, content(text), status `RoutineStatus` (default Open), category `HandoverCategory`, is_repeatable (default false), monitoring_check_id (for a Monitoring handover: the check it hands over) | updatedBy, acknowledgedBy (User), project, monitoringCheck |
| `RoutineMeeting` → `routine_meetings` | project_id, pic_user_id, meeting_name(255), start_at, target_completed_at, status_update(500), meeting_room_url(text), status `RoutineStatus`, is_temporary (default false) | pic (User), project |
| `RoutineReport` → `routine_reports` | project_id, pic_user_id, report_name(255), start_at, target_completed_at, status_update(500), doc_url(text), status `RoutineStatus` | pic (User), project |
| `MonitoringCheckpoint` → `monitoring_checkpoints` | **project_id**, **name**(255), instructions(text), **times** (`text[]` of local "HH:mm", e.g. `{09:00,13:00,17:00}`), **timezone**(64, default `Asia/Jakarta`), is_temporary (default false), active_from / active_until (`Date`, null = open), **is_active** (default true), client_id, created_by | project, client, createdBy (User), checks |
| `MonitoringCheck` → `monitoring_checks` | **checkpoint_id**, **scheduled_at** (timestamptz: the slot as an instant), **checked_at** (default now), **checked_by**, **result** `MonitoringResult`, note (required for NOK, by the API), evidence_url (image link), ticket_id (optional ticket for a NOK), reviewed_by, reviewed_at, review_note; **unique (checkpoint_id, scheduled_at)** | checkpoint, checker (User), reviewer (User), ticket (TicketLog), handovers |

Enums (with their Postgres type names):
- `TicketStatus` (`ticket_status_enum`): Open, Closed, Activity, Meeting, Pending, ReOpen
- `RoutineStatus` (`routine_status_enum`): Open, Closed, ReOpen, Pending
- `HandoverCategory` (`handover_category_enum`): Note, Task, Monitoring

There is no `requesters` table. `ticket_logs.requester` is a free-text column, and the import always sets it to `null`.

## Monitoring (redesigned 2026-10-10; schema only, no API or business logic yet)

Replaced the old `monitoring_logs` / `monitoring_template` (both were empty), which had copied fields, no link between them, no performer, no result status, everything nullable, and both project and tenant.

- A **checkpoint** defines *what* to check for a project and *when*: e.g. "check node lastcoll on smng232" at `{09:00,13:00,17:00}` WIB every day. The tenant comes from the project.
- **Temporary** checkpoints (`is_temporary`) are limited by `active_from`/`active_until` and/or switched off with `is_active = false` when the client no longer needs them; `client_id` records who asked. Switch off instead of deleting, so history stays.
- A **check** is one performance of a checkpoint at one scheduled slot (`scheduled_at`, an exact instant): done by an **AGENT** (`checked_by`), result **OK/NOK**, optionally reviewed by a **TEAM_LEAD** (`reviewed_by`, `reviewed_at`, `review_note`). One check per slot (unique).
- **Missed checks are not stored**: they are the scheduled slots (from active checkpoints' `times` in their `timezone`) with no check row; to be computed by the API.
- **Decided for the business-logic phase (user, 2026-10-11)**; none of this is enforced by the DB:
  - **TEAM_LEAD creates and edits checkpoints** (and ADMIN/SUPER_ADMIN, by permission).
  - **Review is light**: not required per check; reviewing is optional (`reviewed_by` stays null until someone reviews).
  - **NOK requires a `note`**; linking a ticket (`ticket_id`) and an image (`evidence_url`) is optional.
  - **Agents can correct a check after saving it** (`updated_at` shows the last change).
  - **Schedules are daily, several times a day** (e.g. `{08:00,14:00}`); no weekday-only schedules, so no `days_of_week`.
  - **Handover link**: a `Monitoring` handover can point to the check it hands over (`handover.monitoring_check_id`), mainly for NOK; for OK checks it rarely matters.
- "NOK needs a note" is a rule for the API, not a DB `CHECK` constraint: Prisma can't express CHECK constraints, and raw SQL added to a migration would be lost on the next `db:reset`.
