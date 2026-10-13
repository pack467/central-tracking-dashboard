# API docs (Swagger / OpenAPI)

- **URLs:** Swagger UI at `GET /docs`, raw OpenAPI JSON at `GET /docs-json`. They're registered directly on Express by `SwaggerModule.setup` in `main.ts`, so the global guards and middleware don't apply and no login is needed to view them.
- **When it's on:** by default outside production; `NODE_ENV=production` → `/docs` is 404. `SWAGGER_ENABLED=true|false` overrides either way.
- **Auth in the UI:** run **`POST /auth/login` once** with "Try it out". `/docs` is on the same origin as the API, so the browser keeps the `ctd.sid` session cookie and sends it with every call after that: there is no Authorize step and nothing to paste. Writes need `X-CSRF-Token`: a `requestInterceptor` (in `swaggerOptions`, `main.ts`) copies it from the readable `ctd.csrf` cookie into every request. Swagger UI inlines that function with `toString()`, so it must stay self-contained (it uses the literal cookie name). The document declares the scheme with `addCookieAuth('ctd.sid')` (security name `cookie`); it's documentation only, as browsers don't let Swagger set cookies itself.
- **Nest CLI plugin** (`nest-cli.json` → `compilerOptions.plugins: [{ name: '@nestjs/swagger', options: { classValidatorShim: true, introspectComments: true } }]`): at `nest build`, it generates request schemas from DTO properties and their class-validator decorators (required/optional, max/min length, email/uri format, regex pattern). **DTOs don't need `@ApiProperty`**. It emits no `require()` calls, so it's safe with this ESM build. It only runs under `nest build`/`nest start`, not under Vitest or `tsx`; that doesn't matter for tests.
- **`PartialType` must come from `@nestjs/swagger`**, not `@nestjs/mapped-types`, or the update DTO loses its schema. It still inherits the validators.
- **Response shapes** need explicit classes, because services return Prisma types the plugin can't see:
  - `users/entities/user.entity.ts` (`User`) is the public user shape, with ids as strings and **no password**.
  - `auth/dto/login-response.dto.ts` (`LoginResponseDto`) is `{ user: MeResponseDto, csrf_token }`; `CsrfTokenDto` (`GET /auth/csrf`) and `SessionInfoDto` (`GET /auth/sessions`) are in the same folder.
- **Controller annotations:**
  - each controller has `@ApiTags('<group>')`
  - each route has `@ApiOperation({ summary })`, `@Api<Status>Response(...)` for each status it can return, and `@ApiParam` for `:id` (typed as a string of digits)
  - protected routes get `@ApiCookieAuth()` (usually on the controller class), and the class-level 401 reads "Not logged in (no or expired session), or the user is inactive"
- **Tags in use:** `app` (`GET /`), `auth`, `users`, `roles`, `permissions`, `tickets`, `ticket-categories`, `ticket-severities`, `health` and `metrics`. Terminus's `@HealthCheck()` decorator documents the 200/503 health responses.
- **When adding a route:** give it a tag, summary, response type and error responses, plus `@ApiCookieAuth()` unless it's `@Public()`. A write's 403 can also mean a missing CSRF token; the API description explains that once, so routes don't repeat it. Then check it at `/docs`.
