# Known issues (as of 2026-10-13)

1. Users seeded with `SEED_DEFAULT_PASSWORD` all share that password until each person changes it, and nothing forces a change on first login.
2. Validation error details aren't returned to clients; `GlobalExceptionFilter` only sends "Bad Request Exception".
3. `export-seed.ts` references the `requesters` table, which isn't in the new schema.
4. `README.md` is stock Nest boilerplate and lists `start:dev`/`start:prod`, but the real scripts are `dev`/`prod`.
5. Throttling is per IP and counted in memory per instance: behind a reverse proxy set `TRUST_PROXY` (otherwise every client looks like the proxy's IP, and secure session cookies aren't sent over proxied HTTPS), and with 2+ instances the limits multiply (shared Redis storage planned: `todo-redis.md`).
6. No endpoints for tenants, projects, clients, handovers or routine meetings/reports yet; the monitoring template/log modules are scaffolds. Tickets reference tenants/projects/clients by id (ids come from the seed data).
7. **Data to decide on** (found 2026-10-10): 102 `third_party_ticket_id` values repeat (is a ticket_logs row a ticket or an activity?); 16 tickets have a tenant different from their project's tenant (legacy data; `ticket_logs.tenant_id` duplicates the project's tenant); `TicketStatus` mixes lifecycle (Open/Pending/Closed/ReOpen) with work types (Activity/Meeting).
8. **Clients still using Bearer tokens get 401** since sessions replaced JWTs (2026-10-13): every client must switch to the session cookie + `X-CSRF-Token` (see `auth.md`) and every user logs in once.
