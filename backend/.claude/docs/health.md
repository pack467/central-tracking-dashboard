# Health, readiness and root route

All three routes are `@Public()` and `@SkipThrottle()`, so probes need no token and are never rate-limited. They're independent: `/ready` is **not** under `/health`.

| Route | Purpose | Checks | OK | Failing |
|---|---|---|---|---|
| `GET /` | API info for humans | nothing | 200 `{ name, health: '/health', ready: '/ready', docs?: '/docs' }` | — |
| `GET /health` | **Health**: app **and** database | DB ping (`SELECT 1`, 3 s timeout) | 200 with `info.database.status: 'up'` and `responseTime` | **503** `{ statusCode: 503, message: 'Service unavailable' }` |
| `GET /ready` | **Readiness**: the app process alone | nothing, on purpose | 200 `{ status: 'ok', info: {}, error: {}, details: {} }` | no response (process dead/hung) |

- This split was the user's choice (2026-10-06): `/health` covers the app and its dependencies, and `/ready` covers only the app. Don't swap them back.
- **Probe wiring caveat:** if an orchestrator uses `/health` as a *restart* probe (e.g. a Kubernetes `livenessProbe`), a DB outage restarts every instance without fixing anything. For restarts use `/ready`; use `/health` for monitoring, alerting and load-balancer traffic checks.
- **The app starts even when the DB is down.** The pg adapter connects lazily, so `/ready` returns 200 and `/health` returns 503 until the DB is back. Tested against an unreachable DB.
- **Implementation:** `src/health/health.controller.ts` is `@Controller()` with `@Get('health')` (method `check()`) and `@Get('ready')` (method `ready()`). It uses `@nestjs/terminus` 12 (`TerminusModule`, `HealthCheckService` injected as `healthCheck`, `PrismaHealthIndicator`). `pingCheck('database', prisma).withTimeout(DB_PING_TIMEOUT_MS)` first tries a MongoDB ping, gets "Use the mongodb provider" back from Prisma, then falls back to `SELECT 1`. Unit-test mocks must reproduce that rejection (see `health.controller.spec.ts`).
- **No details leak:** terminus logs the failing check, including the DB error text, at `error` level ("Health Check has failed!"). `GlobalExceptionFilter` turns the response into a plain `503 Service unavailable`, because 5xx bodies never carry details.
- **Root `/`:** returns only where to go next: no version, environment or internals. The `docs` link only appears when Swagger is enabled (`isSwaggerEnabled()` in `src/common/swagger.ts`, shared with `main.ts`).
- **Adding a dependency check** (e.g. Redis or an external API later): add another indicator to the `check()` array (`/health`). Keep `ready()` dependency-free.
