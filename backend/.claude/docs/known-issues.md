# Known issues (as of 2026-10-10)

1. Users seeded with `SEED_DEFAULT_PASSWORD` all share that password until each person changes it, and nothing forces a change on first login.
2. There's no logout or token revocation: changing or resetting a password does **not** end existing logins (tokens stay valid up to 12h). Deactivating a user does take effect immediately, because the guard checks the DB. **Fix decided: `todo-session-auth.md`** (server-side sessions with `express-session`; not built yet).
3. Validation error details aren't returned to clients; `GlobalExceptionFilter` only sends "Bad Request Exception".
4. `export-seed.ts` references the `requesters` table, which isn't in the new schema.
5. `README.md` is stock Nest boilerplate and lists `start:dev`/`start:prod`, but the real scripts are `dev`/`prod`.
6. Throttling is per IP and counted in memory per instance: set Express `trust proxy` behind a reverse proxy, and with 2+ instances the limits multiply (shared Redis storage planned: `todo-redis.md`).
7. No endpoints for tenants, projects, clients, handovers, routine meetings/reports or monitoring (templates/logs) yet. Tickets reference tenants/projects/clients by id (ids come from the seed data).
8. **Data to decide on** (found 2026-10-10): 102 `third_party_ticket_id` values repeat (is a ticket_logs row a ticket or an activity?); 16 tickets have a tenant different from their project's tenant (legacy data; `ticket_logs.tenant_id` duplicates the project's tenant); `TicketStatus` mixes lifecycle (Open/Pending/Closed/ReOpen) with work types (Activity/Meeting).
