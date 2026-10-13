# Auth (`src/auth/`, `src/sessions/`)

Logins are **server-side sessions** (since 2026-10-13; they replaced stateless JWTs): `express-session` with our own store on the `user_sessions` table. The browser only holds a signed, httpOnly cookie with the session id. Ending a session deletes its row, so that device gets 401 on its next request: logout, "log out other devices" and password changes take effect immediately.

## Endpoints (`/auth`)

| Route | Who | Notes |
|---|---|---|
| `POST /auth/login` | `@Public()`, **5/min per IP** | `{ identifier, password }` (email or NIK). Starts a session: sets `ctd.sid` (httpOnly) and `ctd.csrf` (readable). Returns `{ user, csrf_token }`, where `user` has the same shape as `GET /auth/me`. Replaces any session that browser already had. |
| `POST /auth/logout` | logged in | Ends this session and clears both cookies. 204. |
| `POST /auth/logout-all` | logged in | Ends **all** your sessions, this one included. 204. |
| `GET /auth/me` | logged in | The user (no password) plus `role` and effective `permissions`. |
| `GET /auth/csrf` | logged in | `{ csrf_token }` (the same for the whole session) and re-sets the `ctd.csrf` cookie. |
| `PATCH /auth/password` | logged in, 5/min per IP | `{ current_password, new_password }` → 204. Ends all your **other** sessions and gives this one a new id; the CSRF token stays the same. |
| `GET /auth/sessions` | logged in | Your active sessions, most recently used first: `{ id, current, user_agent, ip, created_at (login), last_used_at (updated at most once a minute), expires_at }`. The sid is never returned. |
| `DELETE /auth/sessions/:id` | logged in | Ends one of your sessions (404 if it isn't yours). Ending the current one is a logout (cookies cleared). 204. |

## Sessions

- **Cookie `ctd.sid`:** the session id signed with `SESSION_SECRET` (`s:<sid>.<hmac>`), `HttpOnly` (JavaScript can't read it, so XSS can't steal it), `SameSite=Lax`, `Path=/`, `Secure` when `NODE_ENV=production`. Several comma-separated secrets are accepted: the first signs, all verify (rotation without logging everyone out). The app refuses to start without a secret of ≥ 32 characters.
- **Lifetime:** **absolute `SESSION_MAX_AGE` (default 12h) from login**, however active the user is; there is no idle logout (the user's choice, 2026-10-13). An optional `SESSION_IDLE_TIMEOUT` adds one (the cookie then rolls with every response). Enforced on the server: `user_sessions.expires_at` = the earlier of login + max age and the (sliding) cookie expiry; an expired row is ignored and deleted.
- **Only logged-in sessions are stored:** `saveUninitialized: false`, and the store never writes a session without a `userId`. Session data (`user_sessions.data`): `userId`, `csrfToken`, `loginAt`, `userAgent`, `ip`, plus express-session's `cookie`. `user_id`, `user_agent` and `ip` are also real columns.
- **Login always creates a new session id** (`req.session.regenerate()`), so an id planted before login is useless (session fixation).
- **Ended sessions are deleted, not kept** (the user's choice, 2026-10-13). Every start and end is logged by `SessionsService`, e.g. `Session started for user 7 from ::1`, `Session ended for user 7: logout`, `Ended 2 session(s) of user 7: password_changed`.
- **What ends sessions:**

| Event | Sessions ended | Log reason |
|---|---|---|
| `POST /auth/logout` | this one | `logout` |
| `POST /auth/logout-all` | all of the user's | `logout_all` |
| `DELETE /auth/sessions/:id` | that one | `revoked` |
| `PATCH /auth/password` | all the user's **others**; the current one gets a new id | `password_changed` |
| `PATCH /users/:id` with `password` (admin reset) | **all** of that user's, yourself included if you reset your own password there | `password_reset` |
| `PATCH /users/:id` with `is_active: false` | all of that user's | `deactivated` |
| User deleted | all (FK `ON DELETE CASCADE`) | — |
| AuthGuard finds the user inactive or gone | that one | `user_inactive` |
| Role or permission change | none needed: AuthGuard reloads them on every request | — |

- **Housekeeping:** `PrismaSessionStore` deletes expired rows hourly (and once at startup; failures are logged, never thrown). `last_used_at` is written at most once a minute per session: an in-memory map skips the DB on most requests, and the update itself is conditional (`last_used_at < now − 60s`), which also covers other instances.
- **Several instances:** works as is, since sessions live in Postgres. Only the "touched recently" map is per instance.

## CSRF

Cookies are sent by the browser automatically, so other sites could trigger requests. Two layers protect against that, plus `SameSite=Lax`:

1. **Session-bound token (`CsrfGuard`, global, after AuthGuard):** every `POST/PATCH/PUT/DELETE` by a logged-in user must send the session's token in `X-CSRF-Token`, otherwise **403 "Invalid CSRF token"** (compared timing-safe). `GET/HEAD/OPTIONS` and `@Public()` routes are exempt. The token is stored **in the session** (synchronizer-token pattern; no `csrf-csrf`/`cookie-parser` needed, since the session is server-side). **One token per session**: created at login, unchanged for the whole session (also across the password-change rotation), new at the next login. Per-request tokens would break multiple tabs and parallel requests.
2. **Origin check (`OriginCheckMiddleware`):** a write whose `Origin` header is neither in `CORS_ORIGIN` nor the API's own host gets **403 "Origin not allowed"** before any DB work. This protects `POST /auth/login`, which has no token yet (the user's choice, 2026-10-13, instead of a pre-login token), and backs up the token everywhere else. Requests without `Origin` (curl, Postman, server-to-server) don't come from a web page and pass.

The token reaches clients three ways: `csrf_token` in the login response, `GET /auth/csrf`, and the readable `ctd.csrf` cookie (a browser-session cookie, mainly for Swagger UI on the same origin).

## Guards and middleware

- **Middleware** (AppModule, every route, in this order): `RequestIdMiddleware` → `OriginCheckMiddleware` → `SessionMiddleware` (express-session on `PrismaSessionStore`; skips `/health`, `/ready` and `/metrics`; an error loading the session becomes an exception for the global filter).
- **Global guards**, in order: `ThrottlerGuard` → `AuthGuard` → `CsrfGuard` → `PermissionsGuard`.
- **AuthGuard:** routes marked `@Public()` skip it. Otherwise it reads `req.session.userId` (none, e.g. no cookie, an unknown/expired/ended session → 401) and **loads the user from the DB on every request** (`AuthService.loadUser`). An inactive or deleted user gets 401 and that session is ended. The role and its permissions are always the current DB values. It sets `request.user = { id: bigint, role: string | null, permissions: Set<Permission> }` (permissions from the role's `role_permissions` rows, `*` expanded).
- **PermissionsGuard** (after CsrfGuard): `@Can(X, ...)` (constants from each module's `*.permissions.ts`) requires all listed permissions, otherwise 403. With no `@Can`, any logged-in user is allowed. See `permissions.md`.
- **Decorators:** `@Public()`, `@Can(...Permission[])` and `@CurrentUser()` (gives `AuthUser = { id, role, permissions }`).

## Using the API from a client

- **Browser apps:** send cookies on every call (`fetch(url, { credentials: 'include' })`, axios `withCredentials: true`); keep `csrf_token` in memory and send it as `X-CSRF-Token` on every write; on **403 "Invalid CSRF token"**, fetch `GET /auth/csrf` and retry once; on **401**, go to the login page. The app's origin must be in `CORS_ORIGIN` (CORS runs with `credentials: true`). App and API should be on the same site (e.g. `app.company.com` + `api.company.com`) so `SameSite=Lax` cookies are sent; `localhost` ports count as the same site. Clients that still send `Authorization: Bearer` get 401: since the switch, everyone logs in once.
- **Swagger UI:** log in once with `POST /auth/login`; see `api-docs.md`.
- **Postman** keeps cookies after login (add the `X-CSRF-Token` header for writes). **curl:** `-c cookies.txt -b cookies.txt` plus `-H "X-CSRF-Token: …"`.

## Login safety

- Unknown user, wrong password, inactive user and null password all return the same `401 Invalid credentials`. When the user doesn't exist, bcrypt compares against a fixed `DUMMY_HASH` so the response time doesn't reveal which accounts exist.
- **Public routes:** `GET /` (`AppController`), `GET /health`, `GET /ready`, `POST /auth/login` and `/metrics`. **Every new route is protected by default.**
- **Rate limiting:** `@nestjs/throttler` tracks per client IP. Behind a reverse proxy, set `TRUST_PROXY`, or every client looks like the proxy's IP (and `Secure` cookies are never sent over the proxied HTTPS connection).
- **bcrypt:** this is native `bcrypt@6`. It needs `"bcrypt@6.0.0": true` in `package.json` `allowScripts` because npm 11 enforces install-script approval. **When bcrypt is upgraded, re-approve it** (`npm install-scripts approve bcrypt`).

## Code map

- `src/sessions/`: `session.config.ts` (env parsing, cookie names `ctd.sid`/`ctd.csrf`, header `x-csrf-token`, shared cookie attributes), `prisma-session.store.ts` (`get/set/destroy/touch`, expiry, hourly cleanup), `session.middleware.ts`, `sessions.service.ts` (`start`, `rotate`, `end`, `endAll`, `revokeAll`, `list`, `revoke`, `csrfToken`, cookie helpers), `session.types.ts` (the `SessionData` fields), `sessions.module.ts` (exports the config, store and service; `UsersModule` and `AuthModule` import it).
- `src/auth/`: `auth.controller.ts`, `auth.service.ts` (`verifyCredentials`, `loadUser`, `profile`, `changePassword`), `auth.guard.ts`, `csrf.guard.ts`, `permissions.guard.ts`, decorators and DTOs.
- `src/common/middleware/origin-check.middleware.ts`, `src/common/http-env.ts` (`parseOrigins`, `parseTrustProxy`).
