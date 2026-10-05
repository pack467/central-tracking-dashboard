# Known issues (as of 2026-10-05)

1. Users seeded with `SEED_DEFAULT_PASSWORD` all share that password until each person changes it, and nothing forces a change on first login.
2. There's no refresh token, logout or token revocation. Deactivating a user does take effect immediately, because the guard checks the DB.
3. Validation error details aren't returned to clients; `GlobalExceptionFilter` only sends "Bad Request Exception".
4. `export-seed.ts` references the `requesters` table, which isn't in the new schema.
5. `README.md` is stock Nest boilerplate and lists `start:dev`/`start:prod`, but the real scripts are `dev`/`prod`.
6. There are no indexes on the FK or status columns of `ticket_logs`, which will matter for dashboard queries at ~3.6k+ rows.
7. Throttling is per IP; set Express `trust proxy` when deploying behind a reverse proxy.
8. No endpoints for tenants, projects, clients, handovers, routine meetings/reports or monitoring logs yet. Tickets reference tenants/projects/clients by id (ids come from the seed data).
