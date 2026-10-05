# Stack

| Concern | Choice |
|---|---|
| Framework | NestJS 12 (`@nestjs/common`, `core`, `config`, `platform-express`, `mapped-types`) |
| Module system | **ESM** (`"type": "module"`, `module`/`moduleResolution: nodenext`). Relative imports **must end in `.js`** (`./users.service.js`) |
| ORM | Prisma 7.10 with the `prisma-client` generator (not `prisma-client-js`). The client is output to `src/generated/prisma` (gitignored) |
| DB driver | `@prisma/adapter-pg` + `pg`. Prisma 7 **requires** a driver adapter, and `schema.prisma` has no `url` |
| DB | PostgreSQL, schema **`ctd_config`** (`.env` uses `?schema=ctd_config`) |
| Validation | `class-validator` + `class-transformer` (global `ValidationPipe`) |
| Logging | `nestjs-pino` / `pino`, plus `pino-pretty` outside production |
| Metrics | `@willsoto/nestjs-prometheus` exposes `GET /metrics` |
| API docs | `@nestjs/swagger` 12: Swagger UI at `/docs`, plus its Nest CLI plugin (see `api-docs.md`) |
| Health checks | `@nestjs/terminus` 12 (see `health.md`) |
| Auth | `@nestjs/jwt` (HS256 Bearer tokens), native `bcrypt@6` (cost 12), `@nestjs/throttler` |
| Tests | Vitest 4 (`globals: true`), `vite-tsconfig-paths`, `@nestjs/testing`, `supertest` |
| Lint / format | oxlint (`--type-aware`, via `oxlint-tsgolint`), Prettier (single quotes, trailing commas) |
| TS | TypeScript 6, target ES2023, `strict` but `strictPropertyInitialization: false`, decorators + metadata on |
| Scripts runner | `tsx` (seed and scripts) |
| Deploy tooling | `@nestjs/mau` is installed (`npm run deploy` → `nest deploy`) |

`package.json` `allowScripts` allows install scripts only for `@prisma/engines@7.10.0`, `prisma@7.10.0` and `bcrypt@6.0.0`. npm 11 enforces this, and approvals are pinned to exact versions. Deliberately not approved: `esbuild@0.28.2` (used by tsx and Vitest; works without its postinstall script) and `@scarf/scarf@1.4.0` (download-analytics postinstall pulled in by Swagger UI; blocking it just disables the tracking). npm prints a warning for both on install.
