# Tickets (`src/tickets/`)

One `TicketsModule` with three controllers: tickets (`ticket_logs` table), ticket categories and ticket severities. All routes need a token.

## Routes and permissions

| Route | Who | Notes |
|---|---|---|
| `GET /tickets` | any logged-in user | paginated list with filters, search, sort |
| `GET /tickets/summary` | any logged-in user | count per status; same filters as the list |
| `GET /tickets/:id` | any logged-in user | 404 if missing |
| `POST /tickets` | SUPER_ADMIN, ADMIN, TEAM_LEAD, AGENT | AGENT can only assign to themselves |
| `PATCH /tickets/:id` | SUPER_ADMIN, ADMIN, TEAM_LEAD (any ticket); AGENT (only tickets assigned to them, can't reassign) | |
| `DELETE /tickets/:id` | SUPER_ADMIN, ADMIN | hard delete |
| `GET /ticket-categories`, `GET /ticket-categories/:id` | any logged-in user | |
| `POST/PATCH/DELETE /ticket-categories[/:id]` | SUPER_ADMIN, ADMIN | |
| `GET /ticket-severities`, `GET /ticket-severities/:id` | any logged-in user | |
| `POST/PATCH/DELETE /ticket-severities[/:id]` | SUPER_ADMIN, ADMIN | |

VIEWER is read-only everywhere. These permissions were chosen by Claude (2026-10-06) under the user's "do it your way"; change them if the team wants different rules.

## List: `GET /tickets`

- **Query** (`QueryTicketsDto`; unknown params → 400):
  - `page` (≥1, default 1) and `limit` (1–100, default 20)
  - `sort`: `open_at` (default), `closed_at`, `created_at`, `updated_at` or `id`
  - `order`: `desc` (default) or `asc`. A tie-break on `id` in the same direction is always added. For `open_at`/`closed_at`, null values sort last.
- **Filters** (`TicketFiltersDto`, shared with `/summary`):
  - `status`: comma-separated (`Open,Pending`)
  - `project_id`, `tenant_id`, `client_id`, `user_id` (assignee), `severity_id`, `category_id`
  - `q`: case-insensitive `contains` across subject, description and third_party_ticket_id
  - `open_from` / `open_to`: ISO 8601, inclusive
- **Response:** `{ data: Ticket[], meta: { page, limit, total, total_pages } }`. `findMany` and `count` run in one `$transaction`.
- **Each ticket includes** `project {id,name,code_prefix}`, `tenant {id,name}`, `client {id,name}`, `user {id,name,email}` (assignee; never the password), `severity {id,code_name,name}` and `category {id,name}` (`ticketInclude` in the service).

## Summary: `GET /tickets/summary`

Returns `{ total, by_status: { Open, Closed, Activity, Meeting, Pending, ReOpen } }`. Every status is present, with 0 if there are none. It uses `groupBy` on `status`, and tickets with a null status count toward `total` only. With the current data: 3,649 total, of which 3,527 Closed, 119 Activity and 3 Meeting.

## Create and update rules (`TicketsService`)

- **Body** (`CreateTicketDto`; `UpdateTicketDto` = `PartialType` from `@nestjs/swagger`):
  - `subject` (required, ≤500) and `project_id` (required)
  - `description`, `third_party_ticket_id` (≤100), `requester` (≤100, free text)
  - `tenant_id`, `client_id`, `user_id`, `severity_id`, `category_id` (digit strings or numbers; `null` clears, except `project_id`)
  - `status` (`TicketStatus` enum), `open_at` and `closed_at` (ISO 8601)
- **Assignee:** defaults to the creator. A TEAM_LEAD or higher may pass another user or `null` (unassigned). The assignee must exist and be **active** (400 otherwise).
- **Tenant follows the project:** if `tenant_id` isn't sent, it's taken from the project, including when the project changes on update. If it's sent, it must equal the project's tenant (400 otherwise). `project_id` can't be cleared.
- **References** (project, tenant, client, user, severity, category) are checked before writing, so you get a clear 400 like `severity_id 9 does not exist` rather than a DB foreign-key error.
- **Status and `closed_at`:**
  - On create: `status` defaults to Open and `open_at` to now. Status Closed without `closed_at` stamps it with now.
  - On update: changing to Closed stamps `closed_at` (if not already set), and moving **out of** Closed clears it.
  - An explicit `closed_at` (or `null`) in the body always wins.
- `closed_at` before `open_at` → 400, checked against the values after the update.
- Category and severity names are unique case-insensitively (category `name`, severity `code_name`) → 409. Deleting one that tickets still use → 409 with the count, e.g. "used by 1322 tickets".

## Shared helpers

- `src/common/validators/bigint-id.ts`: the `@BigIntId()` decorator (`Transform` to string + `Matches(/^\d+$/)`) for BigInt id fields in bodies and queries, plus `toBigInt()` (undefined stays undefined, null stays null, otherwise BigInt).
- Response classes for Swagger only: `tickets/entities/ticket.entity.ts` (`Ticket`, `TicketPage`, `TicketSummary`) and the `TicketCategory`/`TicketSeverity` classes in their DTO files.
- `GET /tickets/summary` is declared before `GET /tickets/:id`, so "summary" isn't parsed as an id.

## Not covered yet

There are no endpoints for tenants, projects or clients. Tickets reference them by id, and the ids/names currently come from the seed data (see `seed-and-import.md`). There's also no ticket history or audit log.
