# npm scripts and environment

## npm scripts

| Script | Command / notes |
|---|---|
| `build` | `nest build` (`deleteOutDir: true`, `tsconfig.build.json` excludes test + `*spec.ts`) |
| `start` / `dev` / `debug` | `nest start` / `--watch` / `--debug --watch` |
| `prod` | `node dist/main` |
| `deploy` | `nest deploy` (Mau) |
| `format` | prettier on `src/**/*.ts` and `test/**/*.ts` |
| `lint` | `oxlint --type-aware src/ test/` |
| `test`, `test:watch`, `test:cov`, `test:debug` | vitest (`**/*.spec.ts`) |
| `test:e2e` | vitest with `vitest.config.e2e.ts` (`**/*.e2e-spec.ts`) |
| `db:guard` | refuses unless `DATABASE_URL` contains `localhost`, `127.0.0.1` or `nonprod` |
| `db:clean-migrations` | **deletes `prisma/migrations` entirely** |
| `db:reset` | guard → delete migrations → `prisma format` → `migrate reset --force` → `migrate dev --name init` → `generate` → `db seed` (regenerates the init migration from scratch) |
| `db:fresh` | guard → `migrate reset --force` → `generate` → `db seed` (keeps existing migrations) |

`prisma db seed` runs `tsx prisma/seed.ts`, which **also runs the ticket CSV import**. Both `db:reset` and `db:fresh` therefore import tickets. Previously `db:reset` ran `import-tickets.ts` as a separate step.

## Environment (`.env.example`)

```
NODE_ENV=development   PORT=3000   APP_NAME=nestjs-app   APP_URL=http://localhost:3000
DATABASE_URL="postgresql://...?schema=ctd_config"
SEED_DEFAULT_PASSWORD=                     # optional; seed gives it to users with no password
SESSION_SECRET=...                         # signs the ctd.sid cookie; ≥ 32 chars or the app won't start; "new,old" to rotate
SESSION_MAX_AGE=12h                        # absolute session lifetime from login (unit required: 30m, 12h, 7d); default 12h
# SESSION_IDLE_TIMEOUT=2h                  # optional idle logout (≤ SESSION_MAX_AGE); unset = off
# TRUST_PROXY=1                            # behind a reverse proxy: true, hop count or addresses; unset = off
CORS_ORIGIN=http://localhost:3001          # comma-separated browser origins allowed to call with cookies; writes from other origins → 403
LOG_LEVEL=debug
SWAGGER_ENABLED=                           # optional; /docs defaults to on unless NODE_ENV=production
```

`JWT_SECRET`/`JWT_EXPIRES_IN` are gone since sessions replaced JWTs (2026-10-13); leftover lines in a `.env` are ignored. `SESSION_*` and `TRUST_PROXY` are read through `src/sessions/session.config.ts` and `src/common/http-env.ts` (see `auth.md`).

The schema is hardcoded as `'ctd_config'` in `PrismaService` (`DB_SCHEMA`) and in the seed, import and export scripts (`SCHEMA`). Keep them consistent with `DATABASE_URL`.
