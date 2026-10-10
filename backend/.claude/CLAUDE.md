# Backend — Central Tracking Dashboard

NestJS + Prisma 7 + PostgreSQL API for the operations dashboard. It covers ticket logs, shift handovers, routine meetings and reports, and monitoring checkpoints, all organised by tenant and project. The data model and reference data were migrated from an older database that used the same `ctd_config` schema.

This file covers only `backend/`. Do not read, reference, or modify `../frontend`.

## Conventions to follow

- Use ESM imports with the `.js` suffix, Prettier style (single quotes, trailing commas), and no floating promises (oxlint error). `any` is allowed.
- Use snake_case DB fields directly in DTOs and queries, matching the schema.
- Any script that writes explicit ids must reset the sequence afterwards.
- Destructive DB scripts must go through `db:guard`. Never run `db:reset`/`db:fresh` against a production `DATABASE_URL`.
- `password` must only ever hold a hash, never plaintext. Any user query that returns data to a client uses `omit: { password: true }`.
- New routes are protected by default. Add `@Public()` only on purpose, and guard them with `@Can(X)` where `X` comes from the module's own `*.permissions.ts` (`definePermission`). There is no central permission list. Never check role names in access logic; see `docs/permissions.md`.
- Document every new route for Swagger (tag, summary, response type, error responses, `@ApiBearerAuth()`); see `docs/api-docs.md`.
- Take `:id` params with `ParseBigIntPipe` and pass them to Prisma as `bigint`. Never use `+id`.
- Commit style: Conventional Commits with a scope, e.g. `feat(backend): ...` or `feat(backend - users): ...`.
- When something changes, update the matching file in `docs/` below, not this index.

## Docs

Each topic lives in its own file under `.claude/docs/`, imported here so it loads with this file.

| File | Covers |
|---|---|
| `docs/stack.md` | Libraries, versions, TS/ESM setup, npm `allowScripts` |
| `docs/layout.md` | Folder and file tree |
| `docs/scripts-and-env.md` | npm scripts (incl. `db:*`), `.env` variables |
| `docs/runtime.md` | Bootstrap, AppModule, global guards, middleware, error filter, logging, metrics, Prisma service |
| `docs/auth.md` | JWT login, guards, decorators, rate limits, bcrypt |
| `docs/permissions.md` | Permission-based access: `definePermission` per module, `permissions`/`role_permissions` tables, startup sync, `@Can`, seeded defaults, hierarchy rule |
| `docs/roles.md` | `/roles` (CRUD, grant/revoke one, replace set) and `/permissions` (catalogue, descriptions); read with `roles.read`, write with `roles.manage`; grant/self-lockout rules |
| `docs/api-docs.md` | Swagger UI at `/docs`, CLI plugin, how to document new routes |
| `docs/health.md` | `/`, `/health` (app + DB), `/ready` (app only) |
| `docs/users.md` | `/users` routes, DTO, role-escalation rules |
| `docs/tickets.md` | `/tickets` (list, filters, summary, CRUD), ticket categories and severities, permissions and status rules |
| `docs/data-model.md` | Prisma schema: tables, fields, relations, enums |
| `docs/seed-and-import.md` | Reference data, `seed.ts`, ticket CSV import, export script |
| `docs/testing.md` | Unit and e2e tests |
| `docs/known-issues.md` | Open problems and follow-ups |

@docs/stack.md
@docs/layout.md
@docs/scripts-and-env.md
@docs/runtime.md
@docs/auth.md
@docs/permissions.md
@docs/roles.md
@docs/api-docs.md
@docs/health.md
@docs/users.md
@docs/tickets.md
@docs/data-model.md
@docs/seed-and-import.md
@docs/testing.md
@docs/known-issues.md
