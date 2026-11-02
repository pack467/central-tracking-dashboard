# Monitoring (`src/monitoring/`)

One `MonitoringModule` with two controllers, laid out like `TicketsModule`: templates (`monitoring_templates`, in `templates/`) and logs (`monitoring_logs`, in `logs/`). Permissions are in `src/monitoring/monitoring.permissions.ts`; slot/time-zone helpers in `src/monitoring/monitoring-schedule.ts`. All routes need a login (session cookie), and writes need the CSRF token (see `auth.md`). The data model and the decisions behind it are in `data-model.md` (Monitoring section).

Built 2026-11-02, replacing the three earlier modules (`monitoring/`, `monitoring-template/`, `monitoring-logs/`; the old route was `/monitoring-template`). The earlier `monitorings.*` permissions were dropped; on the next boot the startup sync marks them obsolete.

## Routes and permissions

| Route | Permission | Default roles | Notes |
|---|---|---|---|
| `GET /monitoring-templates`, `/monitoring-templates/:id` | `monitoring.read` | all | |
| `POST/PATCH/DELETE /monitoring-templates[/:id]` | `monitoring.templates.manage` | TEAM_LEAD and up | delete refused while the template has logs |
| `GET /monitoring-logs`, `/monitoring-logs/:id` | `monitoring.read` | all | |
| `POST /monitoring-logs` | `monitoring.check` | AGENT and up | you are the checker |
| `PATCH /monitoring-logs/:id` | `monitoring.check` | AGENT and up | without `monitoring.check.any` (TEAM_LEAD and up): only logs you recorded |
| `PATCH /monitoring-logs/:id/review` | `monitoring.review` | TEAM_LEAD and up | |
| `DELETE /monitoring-logs/:id` | `monitoring.delete` | ADMIN, SUPER_ADMIN | refused while a handover refers to the log |

The split mirrors tickets (`write` / `write.any` / `delete`) and the names planned in `todo-monitoring-live.md`; chosen by Claude (2026-11-02) after the user asked to follow the ticket pattern. Existing databases only get these grants through `/roles` or a `db:reset` (the seed never overwrites grants).

## Templates

- **Body** (`CreateMonitoringTemplateDto`; `UpdateMonitoringTemplateDto` = `PartialType(..., { skipNullProperties: false })`):
  - `project_id` (required) and `name` (required, ≤255)
  - `times` (required): non-empty array of unique local `HH:mm`, stored sorted (`["09:00","13:00","17:00"]`)
  - `timezone` (IANA, `@IsTimeZone`), `is_temporary`, `is_active`: optional but never null (NOT NULL columns); not sent = the column default (`Asia/Jakarta`, false, true)
  - `instructions`, `client_id`, `active_from` / `active_until` (`YYYY-MM-DD`, calendar-checked): optional, `null` clears
- **Creator:** `user_creator_id` is always the logged-in user; it isn't in the body.
- **Checks:** project and client must exist (400 `project_id 9 does not exist`); `active_until` before `active_from` → 400, checked against the values after an update.
- **Switch off, don't delete:** `DELETE` → 409 "has N logs; switch it off (is_active: false) instead" when it has logs. Changing `times` or `timezone` leaves existing logs as they are.
- **List** (`QueryMonitoringTemplatesDto`): `project_id`, `project` (project name contains, case-insensitive), `client_id`, `is_active` / `is_temporary` (`true`/`false` in the query string, via `@QueryBoolean()`), `q` (name or instructions), `page`/`limit` (1–100, default 20), `sort` (`name` default, `created_at`, `updated_at`, `id`), `order` (`asc` default). Tie-break on `id`.
- **Each template includes** `project {id,name,code_prefix}`, `client {id,name}`, `creator {id,name,email}`. Logs are **not** included (they grow every day); use `GET /monitoring-logs?template_id=`.

## Logs

- **Create** (`CreateMonitoringLogDto`): `template_id`, `scheduled_at` (ISO 8601 instant), `result` (`OK`/`NOK`), optional `note`, `evidence_url` (URL), `ticket_id`. `checked_by` = you, `checked_at` = now.
- **Slot rule** (`assertSlot`): the template must exist (400) and be switched on; `scheduled_at`, read in the template's `timezone`, must be one of its `times` exactly on the minute, on a local day within `active_from`/`active_until`. So `2026-11-02T09:00:00+07:00` (= `02:00Z`) is the 09:00 WIB slot, while `09:00Z` is not. Uses `Intl` (no date library).
- **One log per slot:** a second one → 409 "already logged (#id); correct that log instead" (pre-checked; the unique index backs it up).
- **NOK needs a note** (non-blank), on create and against the values after an update. `ticket_id` must exist (400).
- **Correct** (`UpdateMonitoringLogDto` = partial of `result`, `note`, `evidence_url`, `ticket_id`): the slot can't change (sending `template_id`/`scheduled_at` → 400). `updated_at` shows the last correction.
- **Review** (`PATCH :id/review`, `{ review_note? }`): sets `reviewed_by` = you and `reviewed_at` = now; reviewing again replaces the earlier review. Review is optional per log.
- **Delete:** hard delete (the slot counts as missed again); 409 while a handover refers to it.
- **List** (`QueryMonitoringLogsDto`): `template_id`, `project_id` (the template's), `checked_by`, `result`, `reviewed` (`true`/`false`), `scheduled_from` / `scheduled_to` (inclusive), paging as for templates, `sort` (`scheduled_at` default, `checked_at`, `created_at`, `updated_at`, `id`), `order` (`desc` default).
- **Each log includes** `template {id,name,timezone,project {id,name,code_prefix}}`, `checker` and `reviewer` `{id,name,email}`, `ticket {id,third_party_ticket_id,subject,status}`.

## Shared helpers

- `src/monitoring/monitoring-schedule.ts`: `TIME_OF_DAY`, `DATE_ONLY`, `localDateTime(instant, timeZone)` (local date, `HH:mm`, and whether it's on the minute) and `toDateOnly(date)`.
- `src/common/validators/query-boolean.ts`: `@QueryBoolean()` for boolean query parameters.
- Swagger response classes: `templates/entities/monitoring-template.entity.ts` and `logs/entities/monitoring-log.entity.ts`. Their ref classes are prefixed `Monitoring…`, because Swagger keys schemas by class name and the tickets entity already has `Ref`, `UserRef`, `PageMeta`.

## Not covered yet

- **Missed slots and the day grid** (templates × slots for one project and day, with missed ones computed): the API that `todo-monitoring-live.md` and the metrics build on.
- **Future slots** aren't refused: a log for a slot later today or on a later day is accepted. Decide whether to allow early checks (and how early).
- **Correcting a reviewed log** keeps the review; decide whether a correction should clear it.
- Optimistic locking (`monitoring_logs.version`) is part of the live-page design, not built.
