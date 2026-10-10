# Users (`/users`)

| Route | Who |
|---|---|
| `GET /users`, `GET /users/:id` | `users.read` (all default roles) |
| `POST /users`, `PATCH /users/:id`, `DELETE /users/:id` | `users.manage` (ADMIN, SUPER_ADMIN), plus the hierarchy rule below |

- `CreateUserDto`: name (required, ≤255), email (required, valid email, ≤255), nik, role_id (`"4"`, `4` or `null` to clear; must be digits), is_active, password (8–72 chars), photo_url (URL, ≤500), department. `UpdateUserDto = PartialType(CreateUserDto)`, which inherits the validators.
- The service hashes passwords with bcrypt (`BCRYPT_ROUNDS = 12`) and converts `role_id` to BigInt. It **never returns `password`**: every query uses `omit: { password: true }`. Fields that aren't sent are left unchanged.
- **Escalation rules** (`UsersService`, so they apply no matter which route calls it; the controller passes `@CurrentUser()` as `actor`). Violations return **403**. Based on permissions, not role names (see `permissions.md`):
  - **Without `users.manage.all`** (e.g. ADMIN): you can only edit, deactivate, reset the password of, or delete users whose role's permissions are a **strict subset** of yours, and only assign such roles. You can't change your own role, even downward (resending the same `role_id` is fine). With the defaults this means an ADMIN can't touch another ADMIN or a SUPER_ADMIN, or hand out ADMIN/SUPER_ADMIN, but fully manages TEAM_LEAD, AGENT and VIEWER users, and edits their own profile and password.
  - **With `users.manage.all`** (SUPER_ADMIN): no hierarchy limits, only the self-rules below.
  - **Everyone:** cannot deactivate (`is_active: false`) or delete **their own** account, so nobody can lock themselves out.
  - A non-existent `role_id` passes the check and is rejected by the FK as 409. Unknown entries in a role's permissions are ignored; a role with none (or only unknown ones) counts as having no permissions.
- Prisma error `P2002` (duplicate email or NIK) → 409. `P2003` (missing role, or a user that other records still reference on delete) → 409. `findOne` → 404 `User #id not found`.
- Auth-only helpers: `findForLogin(identifier)` (by email **or** NIK, includes the hash), `findAuthUser(id)` (is_active, role name and privilege), `findPasswordHash(id)` and `setPassword(id, plain)`.
- `entities/user.entity.ts` (`User`) is the documented response shape (no password); see `api-docs.md`.
