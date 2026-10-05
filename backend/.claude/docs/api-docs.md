# API docs (Swagger / OpenAPI)

- **URLs:** Swagger UI at `GET /docs`, raw OpenAPI JSON at `GET /docs-json`. They're registered directly on Express by `SwaggerModule.setup` in `main.ts`, so the global guards don't apply and no token is needed to view them.
- **When it's on:** by default outside production; `NODE_ENV=production` → `/docs` is 404. `SWAGGER_ENABLED=true|false` overrides either way.
- **Auth in the UI:** `DocumentBuilder().addBearerAuth()`. Call `POST /auth/login`, then click **Authorize** and paste the `access_token`. `persistAuthorization: true` keeps the token across page reloads.
- **Nest CLI plugin** (`nest-cli.json` → `compilerOptions.plugins: [{ name: '@nestjs/swagger', options: { classValidatorShim: true, introspectComments: true } }]`): at `nest build`, it generates request schemas from DTO properties and their class-validator decorators (required/optional, max/min length, email/uri format, regex pattern). **DTOs don't need `@ApiProperty`**. It emits no `require()` calls, so it's safe with this ESM build. It only runs under `nest build`/`nest start`, not under Vitest or `tsx`; that doesn't matter for tests.
- **`PartialType` must come from `@nestjs/swagger`**, not `@nestjs/mapped-types`, or the update DTO loses its schema. It still inherits the validators.
- **Response shapes** need explicit classes, because services return Prisma types the plugin can't see:
  - `users/entities/user.entity.ts` (`User`) is the public user shape, with ids as strings and **no password**.
  - `auth/dto/login-response.dto.ts` (`LoginResponseDto`) is `{ access_token, token_type }`.
- **Controller annotations:**
  - each controller has `@ApiTags('<group>')`
  - each route has `@ApiOperation({ summary })`, `@Api<Status>Response(...)` for each status it can return, and `@ApiParam` for `:id` (typed as a string of digits)
  - protected routes get `@ApiBearerAuth()`
- **Tags in use:** `app` (`GET /`), `auth`, `users`, `tickets`, `ticket-categories`, `ticket-severities`, `health` and `metrics`. Terminus's `@HealthCheck()` decorator documents the 200/503 health responses.
- **When adding a route:** give it a tag, summary, response type and error responses, plus `@ApiBearerAuth()` unless it's `@Public()`. Then check it at `/docs`.
