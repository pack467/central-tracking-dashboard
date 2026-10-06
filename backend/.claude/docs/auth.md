# Auth (`src/auth/`)

- **Endpoints:**
  - `POST /auth/login` `{ identifier, password }` is `@Public()`, limited to **5 requests/min per IP**, and returns `{ access_token, token_type: 'Bearer' }`. The identifier is an email or a NIK.
  - `GET /auth/me` returns the current user (no password) plus `role` and `permissions`.
  - `PATCH /auth/password` `{ current_password, new_password }` is limited to 5/min and returns 204.
- **Token:** HS256 JWT. The payload is only `{ sub: '<user id as string>' }`. The secret is `JWT_SECRET`, and **the app refuses to start if it's missing or shorter than 32 characters**. Expiry is `JWT_EXPIRES_IN` (default `12h`; changed from `7d` on 2026-10-06). It's sent as `Authorization: Bearer <token>`. There are no refresh tokens and no logout or denylist.
- **AuthGuard** (global): routes marked `@Public()` skip it. Otherwise it verifies the token and then **loads the user from the DB on every request**. Inactive users (`is_active = false`) and deleted users get 401 immediately, and the role and its permissions are always the current DB values, never taken from the token. It sets `request.user = { id: bigint, role: string | null, permissions: Set<Permission> }` (permissions parsed from `user_role.privilege`).
- **PermissionsGuard** (global, after AuthGuard): `@Can(PERMISSIONS.X, ...)` requires all listed permissions, otherwise 403. With no `@Can`, any authenticated user is allowed. See `permissions.md`.
- **Decorators:** `@Public()`, `@Can(...Permission[])` and `@CurrentUser()` (gives `AuthUser = { id, role, permissions }`).
- **Login safety:** unknown user, wrong password, inactive user and null password all return the same `401 Invalid credentials`. When the user doesn't exist, bcrypt compares against a fixed `DUMMY_HASH` so the response time doesn't reveal which accounts exist.
- **Public routes:** `GET /` (`AppController`), `GET /health`, `GET /ready`, `POST /auth/login` and `/metrics`. **Every new route is protected by default.**
- **Rate limiting:** `@nestjs/throttler` tracks per client IP. Behind a reverse proxy, every client looks like the proxy's IP unless Express `trust proxy` is set.
- **bcrypt:** this is native `bcrypt@6`. It needs `"bcrypt@6.0.0": true` in `package.json` `allowScripts` because npm 11 enforces install-script approval. **When bcrypt is upgraded, re-approve it** (`npm install-scripts approve bcrypt`).
