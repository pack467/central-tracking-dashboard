# Auth (`src/auth/`)

- **Endpoints:**
  - `POST /auth/login` `{ identifier, password }` is `@Public()`, limited to **5 requests/min per IP**, and returns `{ access_token, token_type: 'Bearer' }`. The identifier is an email or a NIK.
  - `GET /auth/me` returns the current user (no password).
  - `PATCH /auth/password` `{ current_password, new_password }` is limited to 5/min and returns 204.
- **Token:** HS256 JWT. The payload is only `{ sub: '<user id as string>' }`. The secret is `JWT_SECRET`, and **the app refuses to start if it's missing or shorter than 32 characters**. Expiry is `JWT_EXPIRES_IN` (default `7d`). It's sent as `Authorization: Bearer <token>`. There are no refresh tokens and no logout or denylist.
- **AuthGuard** (global): routes marked `@Public()` skip it. Otherwise it verifies the token and then **loads the user from the DB on every request**. Inactive users (`is_active = false`) and deleted users get 401 immediately, and the role is always the current DB role, never one taken from the token. It sets `request.user = { id: bigint, role: string | null }`.
- **RolesGuard** (global): `@Roles('SUPER_ADMIN', ...)` restricts a route; anything else returns 403. With no `@Roles`, any authenticated user is allowed.
- **Decorators:** `@Public()`, `@Roles(...RoleName[])` and `@CurrentUser()`. `RoleName` is `'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'AGENT' | 'VIEWER'`.
- **Login safety:** unknown user, wrong password, inactive user and null password all return the same `401 Invalid credentials`. When the user doesn't exist, bcrypt compares against a fixed `DUMMY_HASH` so the response time doesn't reveal which accounts exist.
- **Public routes:** `GET /` (`AppController`), `GET /health`, `GET /ready`, `POST /auth/login` and `/metrics`. **Every new route is protected by default.**
- **Rate limiting:** `@nestjs/throttler` tracks per client IP. Behind a reverse proxy, every client looks like the proxy's IP unless Express `trust proxy` is set.
- **bcrypt:** this is native `bcrypt@6`. It needs `"bcrypt@6.0.0": true` in `package.json` `allowScripts` because npm 11 enforces install-script approval. **When bcrypt is upgraded, re-approve it** (`npm install-scripts approve bcrypt`).
