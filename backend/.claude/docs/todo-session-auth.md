# TODO: server-side sessions (`express-session`) instead of stateless JWT

**Status: decided, not started.** The team has agreed to switch to server-side sessions with `express-session` (confirmed by the user 2026-10-11), including the frontend changes below. Nothing is implemented yet; today's auth is still the JWT setup in `auth.md`.

## The problem

Tokens are stateless JWTs (12h, `Authorization: Bearer`). The server keeps no record of them, so:
- **changing a password does not log anyone out**: every token issued before stays valid until it expires (up to 12h). If the password was changed because someone else knew it, they stay logged in;
- an **admin password reset** has the same gap;
- there is **no real logout** (the client just forgets the token);
- you can't see or end the sessions of one device.

What already works: deactivating a user, or changing their role or permissions, takes effect on the next request, because `AuthGuard` loads the user from the DB every time.

## Options considered

| Option | Password change → | Log out one device | List/kill devices | Notes |
|---|---|---|---|---|
| Today (stateless JWT) | nothing until expiry | ✗ | ✗ | — |
| Token version (`users.token_version`, bumped to kill all tokens) | all devices out | ✗ | ✗ | 1 column; too coarse |
| A. JWT + own `user_sessions` table (token carries `sid`) | other devices out, current stays | ✓ | ✓ | no frontend change; not chosen |
| Access + refresh tokens on top of A | same as A | ✓ | ✓ | solves a scale problem we don't have (we already hit the DB per request) |
| Denylist of revoked tokens (Redis) | awkward | ✓ | ✗ | extra infrastructure |
| **B. `express-session` + custom store on our `user_sessions` table** (chosen) | other devices out, current stays | ✓ | ✓ | httpOnly cookie, so XSS can't steal it; needs frontend + CSRF changes |

**Decision: B (agreed with the team).** It's the more secure end state for a browser dashboard: the session ID lives in an httpOnly cookie that JavaScript can't read, and it makes Swagger simpler. The per-request DB lookup that sessions need is something `AuthGuard` already does. The frontend team accepts the cookie + CSRF changes, so A is no longer the fallback.

Nest has no session library of its own; its docs (Techniques → Session) use Express's `express-session`. Ready-made stores exist (`connect-pg-simple`, `@quixo3/prisma-session-store`, `connect-redis`), but they keep the session as a JSON blob, which makes "all sessions of user X" awkward. So: **write our own small store** on a table with a real `user_id` column.

## Database

```prisma
model UserSession {
  sid            String    @id @db.VarChar(128)   // express-session's session id
  user_id        BigInt?                          // null until login
  data           Json                              // what express-session stores
  expires_at     DateTime  @db.Timestamptz(6)
  created_at     DateTime  @default(now()) @db.Timestamptz(6)
  last_used_at   DateTime  @default(now()) @db.Timestamptz(6)
  revoked_reason String?   @db.VarChar(50)        // logout | password_changed | admin | expired (kept only if we keep history)
  user_agent     String?   @db.VarChar(500)       // "Chrome on Windows"
  ip             String?   @db.VarChar(64)

  user User? @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([expires_at])
  @@map("user_sessions")
}
```
Revoking a session = deleting its row, so the cookie stops working on the next request. Decide whether to keep revoked rows for audit (then filter on a `revoked_at` column instead of deleting). Expired rows need cleanup, either by the store on read or by a periodic job.

## Backend changes

| Area | Change |
|---|---|
| Packages | **add** `express-session`, `csrf-csrf`; **remove** `@nestjs/jwt` (check versions work with Nest 12 / Express 5 first) |
| Env | `SESSION_SECRET` (signs the cookie, ≥ 32 chars, app refuses to start without it), `SESSION_MAX_AGE` (e.g. `12h`), optional `SESSION_IDLE_TIMEOUT`; **remove** `JWT_SECRET`, `JWT_EXPIRES_IN` |
| `main.ts` | `app.use(session({ name: 'ctd.sid', store, secret, resave: false, saveUninitialized: false, rolling: true, cookie: { httpOnly: true, secure: <production>, sameSite: 'lax', maxAge } }))`; `enableCors({ origin: CORS_ORIGIN list, credentials: true })` (origins must stay an explicit list, never `*`); set Express `trust proxy` when behind a reverse proxy (needed for `secure` cookies and correct IPs) |
| Session store | a small class (~50 lines) extending `session.Store`: `get`, `set`, `destroy`, `touch` on `user_sessions`, filling `user_id`, `user_agent`, `ip`, `last_used_at` (throttle `last_used_at` writes, e.g. at most once a minute) |
| `POST /auth/login` | validate as today, then **`req.session.regenerate()`** (prevents session fixation), store the user id, save. Respond with the user (no token). The browser gets `Set-Cookie: ctd.sid=…` |
| `AuthGuard` | read the user id from `req.session` instead of the Bearer header; the rest stays (load user + role + permissions, reject inactive). **`@Can`, `PermissionsGuard`, `@CurrentUser`, all permission rules unchanged** |
| `POST /auth/logout` | `req.session.destroy()` and clear the cookie |
| `POST /auth/logout-all` | delete all of the user's sessions |
| `PATCH /auth/password` | after changing, delete the user's **other** sessions (current one stays) and rotate the current session (regenerate) |
| Admin reset (`PATCH /users/:id` with password) and deactivation | delete **all** of that user's sessions |
| `GET /auth/sessions` | your active sessions: device (user agent), IP, created, last used, which one is current |
| `DELETE /auth/sessions/:id` | end one of your sessions |
| Idle timeout (optional) | reject and delete sessions whose `last_used_at` is older than the idle limit |
| Logging | the `cookie` header is already redacted; also redact `set-cookie` in responses if it gets logged |
| Throttling | unchanged (login still 5/min per IP) |

## CSRF

Cookies are sent by the browser automatically, so other sites could trigger requests. That needs CSRF protection.
- **Signed double-submit token** (`csrf-csrf`), **tied to the session**.
- **One token per session, not per request.** It stays the same while the session lives and is **rotated at login** (the session is regenerated). It dies with the session at logout, revocation or expiry. Per-request tokens break multiple tabs, the back button and parallel requests, and OWASP considers per-session tokens sufficient.
- `GET /auth/csrf` returns the token, which is also set in a **readable** (not httpOnly) cookie.
- Every **POST/PATCH/PUT/DELETE** must send it in the `X-CSRF-Token` header, or gets **403 "invalid CSRF token"**. GET/HEAD/OPTIONS are exempt.
- `POST /auth/login` itself: exempt, or protected with a pre-login token. Decide during implementation.
- `SameSite=Lax` cookies add a second layer of protection.

## Frontend changes (agreed; done by the frontend team, the backend work doesn't touch `frontend/`)

Frontend and backend have to ship together: once the backend switches, the old Bearer-token frontend stops working.


1. Stop storing and sending the token; send cookies on every API call: `fetch(url, { credentials: 'include' })` / axios `withCredentials: true`.
2. After login, get the CSRF token once (`GET /auth/csrf` or the cookie), keep it in memory, and send `X-CSRF-Token` on every write.
3. On **403 invalid CSRF**: fetch the token again and retry once (the session may have rotated, e.g. a re-login in another tab).
4. On **401**: go to the login page (as today).
5. Logout button → `POST /auth/logout`. Optionally a "my sessions" screen using `GET /auth/sessions`.
6. **Deployment:** frontend and API on the **same site** (e.g. `dashboard.company.com` + `api.company.com`, or one domain with `/api`), so `SameSite=Lax` works. Dev is fine: `localhost:3001` → `localhost:3000` is the same site, since ports don't matter for cookies. Different registrable domains would need `SameSite=None; Secure` (HTTPS only), which is more fragile; avoid it.

## Swagger

- `/docs` is served by the API (same origin), so the browser keeps and sends the session cookie for "Try it out" automatically: run **`POST /auth/login` in Swagger once**, and everything after works. No Authorize button and no copy-pasting.
- Add a Swagger `requestInterceptor` (in `SwaggerModule.setup` options) that reads the CSRF cookie and adds `X-CSRF-Token` to every request, so writes work from Swagger with no manual step. Rotation at login is handled because it reads the current cookie each time.
- Replace `addBearerAuth()` / `@ApiBearerAuth()` with `addCookieAuth('ctd.sid')` / `@ApiCookieAuth('ctd.sid')`, and say "log in with `/auth/login` first" in the API description.
- Postman keeps the cookie automatically after login; curl needs `-c cookies.txt -b cookies.txt`; scripts need a cookie jar.

## Tests

- Rewrite `auth.guard.spec` (session instead of Bearer) and `auth.service.spec` (no JWT signing).
- Unit-test the store (`get/set/destroy/touch`, user_id filling, expiry) and the revocation rules: password change keeps the current session and kills the others; admin reset, deactivation and logout-all kill all of them.
- e2e with a **supertest agent** (keeps cookies): login → request → logout → 401; CSRF missing → 403; password change on one agent logs out a second agent.
- Live check like the earlier ones: two "devices", change the password on one, and the other gets 401 on its next request.

## Rollout notes

- When it ships, all existing JWTs stop working (no session), so **everyone logs in once**. Announce it.
- Update docs: `auth.md` (rewrite), `api-docs.md` (cookie auth + interceptor), `scripts-and-env.md` (env vars), `data-model.md` (table), `runtime.md` (middleware order), `testing.md`.
- Remove this file and known issue 2 when done.

## Decided

- Use `express-session` with a custom store on our `user_sessions` table (option B), not JWT.
- The frontend team adopts `credentials: 'include'` + the `X-CSRF-Token` header.
- CSRF tokens are per session, rotated at login, not per request.

## Still open (decide before or during implementation)

1. **Idle timeout:** add one (e.g. 2h of inactivity) on top of the 12h maximum? How long?
2. **Keep revoked sessions** for audit (`revoked_at`/`revoked_reason`) or delete them?
3. **Login CSRF:** exempt `POST /auth/login`, or require a pre-login token?
4. **Production domains** for the frontend and API (they decide the cookie `SameSite`/`domain` settings).
5. **Release coordination:** which release ships the backend and frontend changes together.
