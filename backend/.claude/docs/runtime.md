# Runtime behaviour (src)

- **main.ts:** `NestFactory.create(AppModule, { bufferLogs: true })`, `app.useLogger(pino Logger)`, global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`, global `GlobalExceptionFilter(logger)`, `enableCors({ origin: CORS_ORIGIN split on commas })`, `enableShutdownHooks()`, listen on `PORT ?? 3000`.
- **AppModule:** the first line is `import './common/bigint-json.js'`, which makes BigInt serialise to JSON as a **string**. It imports `ConfigModule.forRoot({ isGlobal: true })`, `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])`, `LoggerModule`, `PrismaModule`, `UsersModule`, `MetricsModule` and `AuthModule`. It registers the **global guards in order: `ThrottlerGuard` → `AuthGuard` → `RolesGuard`**, and applies `RequestIdMiddleware` to `'*'`.
- **RequestIdMiddleware:** reuses the incoming `x-request-id` header or generates `randomUUID()`, sets `req.requestId`, and returns the `X-Request-ID` response header.
- **GlobalExceptionFilter** (`@Catch()` for everything): logs `{ err, requestId, method, url, statusCode }`. Status ≥ 500 logs at `error` ("Unhandled exception"); 4xx logs at `warn` ("Request rejected"). It responds with `{ statusCode, message }`. For status ≥ 500 or non-HttpExceptions the message is always `"Internal server error"`. Otherwise it is `exception.message`. Note that validation error *details* (the message array) are not returned, only "Bad Request Exception".
- **LoggerModule:** pino-http level `LOG_LEVEL ?? 'info'`. Uses pino-pretty (colorize, singleLine, `SYS:standard`) when `NODE_ENV !== 'production'`. Redacts `req.headers.authorization`, `req.headers.cookie`, `password`, `token`, `accessToken` and `refreshToken` as `[REDACTED]`.
- **MetricsModule:** `PrometheusModule.register({ path: '/metrics', controller: MetricsController })`. `MetricsController` extends `PrometheusController` and is `@Public()` and `@SkipThrottle()`, so Prometheus can scrape without a JWT. Restrict it at the network or proxy level when deployed.
- **PrismaModule** is `@Global()`, so it provides and exports `PrismaService` everywhere. **PrismaService** extends `PrismaClient`, and its constructor builds `PrismaPg({ connectionString: DATABASE_URL }, { schema: DB_SCHEMA })` where `DB_SCHEMA = 'ctd_config'`. It calls `$connect()` on init and `$disconnect()` on destroy.
- **ParseBigIntPipe** (`src/common/pipes/`): turns a `:id` param into `bigint` and returns 400 for anything that isn't digits only.

## Prisma client usage pattern (working example: seed.ts / import-tickets.ts)

```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }, { schema: 'ctd_config' }),
});
```
