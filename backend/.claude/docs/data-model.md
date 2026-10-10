# Data model (`prisma/schema.prisma`)

Conventions:
- Every PK is `BigInt` with autoincrement (`BIGSERIAL`), including `UserRole.id`, which became autoincrement on 2026-10-05.
- `migrate status` only compares migration files with the DB, not with the schema. After editing `schema.prisma`, use `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` to see the real drift.
- Columns are snake_case. Models are PascalCase and mapped to snake_case tables with `@@map`.
- Every table has `created_at` and `updated_at` as `Timestamp(6)`, default `now()`, and `updated_at` uses `@updatedAt`.
- Almost every column is nullable. FKs use `onDelete: NoAction, onUpdate: NoAction`. The exception is `users.role_id`, which only sets `onUpdate: NoAction`, so its delete rule defaults to `ON DELETE SET NULL` in the migration.
- The only unique indexes are `users.nik` and `users.email`. There are no other indexes, including none on FK columns.

| Model → table | Fields (besides id/timestamps) | Relations |
|---|---|---|
| `User` → `users` | name(255), nik(255, unique), email(255, unique), role_id, is_active (default true), password(100, must be a hash, e.g. bcrypt `$2b$`), photo_url(500), department(255) | role → UserRole; handovers as `HandoverUpdatedBy` / `HandoverAcknowledgedBy`; routineMeetings, routineReports (as PIC); ticketLogs |
| `UserRole` → `user_role` | name(500, **required**), privilege(`text[]` of permissions, default `{}`, see `permissions.md`), info(500) | users |
| `Tenant` → `tenants` | name(255), detail_info(text) | projects, monitoringLogs, monitoringTemplates, ticketLogs |
| `Project` → `projects` | name(255), tenant_id, code_prefix(100) | tenant; handovers, monitoring*, routine*, ticketLogs |
| `Client` → `clients` | name(255), detail_info(text) | ticketLogs |
| `TicketLog` → `ticket_logs` | third_party_ticket_id(100), project_id, client_id, tenant_id, user_id, severity_id, category_id, requester(100), subject(500), description(text), status `TicketStatus` (default Open), open_at, closed_at | project, client, tenant, user, severity, category |
| `TicketCategory` → `ticket_categories` | name(255), description(text) | ticketLogs |
| `TicketSeverity` → `ticket_severities` | code_name(50), name(100) | ticketLogs |
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
