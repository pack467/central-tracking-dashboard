# Tests

- Unit tests (8 files, 54 tests, no DB needed): `app.controller`; `prisma.service` (mocked `ConfigService`); `users.controller` and `users.service` (mocked Prisma: hashing, role_id conversion, password omitted, 404/409 mapping, and every role-escalation rule for ADMIN, SUPER_ADMIN and self-actions); `auth.service` (login success plus the 4 failure cases with the same error, changePassword); `auth.guard` (public routes, missing, forged and inactive cases, user attached); `roles.guard`; `parse-bigint.pipe`.
- In tests, `vi` and `describe`/`it`/`expect` are globals. Mock collaborators with `{ provide: X, useValue: {...} }`.
- e2e test: `test/app.e2e-spec.ts` boots the full `AppModule` and expects `GET /` to return 200 with "Hello World!". It needs a reachable DB and env vars (`DATABASE_URL`, `JWT_SECRET`), because PrismaService connects on init and JwtModule validates the secret.
