# Users (`/users`)

| Route | Who |
|---|---|
| `GET /users`, `GET /users/:id` | any authenticated user |
| `POST /users`, `PATCH /users/:id`, `DELETE /users/:id` | `SUPER_ADMIN`, `ADMIN` |

- `CreateUserDto`: name (required, ≤255), email (required, valid email, ≤255), nik, role_id (`"4"`, `4` or `null` to clear; must be digits), is_active, password (8–72 chars), photo_url (URL, ≤500), department. `UpdateUserDto = PartialType(CreateUserDto)`, which inherits the validators.
- The service hashes passwords with bcrypt (`BCRYPT_ROUNDS = 12`) and converts `role_id` to BigInt. It **never returns `password`**: every query uses `omit: { password: true }`. Fields that aren't sent are left unchanged.
- **Role-escalation rules** (`UsersService`, so they apply no matter which route calls it; the controller passes `@CurrentUser()` as `actor`). Violations return **403**:
  - **ADMIN** cannot assign `SUPER_ADMIN` or `ADMIN` (on create or update); cannot change **their own** role, even downward (resending the same `role_id` is fine); cannot edit, deactivate, reset the password of, or delete **another** `ADMIN` or any `SUPER_ADMIN`. They can still edit their own profile and password, and fully manage TEAM_LEAD, AGENT and VIEWER users.
  - **SUPER_ADMIN** has no restrictions except the self-rules below.
  - **Everyone:** cannot deactivate (`is_active: false`) or delete **their own** account, so nobody can lock themselves out.
  - Checks use role **names** (`PRIVILEGED_ROLES = ['SUPER_ADMIN', 'ADMIN']`), looked up from `user_role`, never hardcoded ids. A non-existent `role_id` passes the check and is rejected by the FK as 409.
- Prisma error `P2002` (duplicate email or NIK) → 409. `P2003` (missing role, or a user that other records still reference on delete) → 409. `findOne` → 404 `User #id not found`.
- Auth-only helpers: `findForLogin(identifier)` (by email **or** NIK, includes the hash), `findAuthUser(id)` (is_active and role name), `findPasswordHash(id)` and `setPassword(id, plain)`.
- The `User` entity class is still empty and unused.
