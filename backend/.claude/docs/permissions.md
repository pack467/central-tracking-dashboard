# Permissions (access control)

Access is **permission-based** (switched from role-name checks on 2026-10-06). The code checks permissions, never role names. Which role has which permissions is **data**, stored per role in the database, so a future roles endpoint can create roles or change their access without a deploy.

## Pieces

- **`src/auth/permissions.ts`:**
  - `PERMISSIONS`: the only list of permissions the code knows. The `Permission` type and `ALL_PERMISSIONS` derive from it.
  - `DEFAULT_ROLE_PERMISSIONS`: the starting permissions for the five seeded roles.
  - Helpers: `parsePermissions()`, `toStoredPermissions()` (unique and sorted, as stored), `resolvePermissions()` and `isStrictSubset()`.
- **Storage:** `user_role.privilege` is a **Postgres `text[]`** (Prisma `String[] @default([])`; it was a JSON string in TEXT until 2026-10-10), e.g. `{tickets.read,users.read}`, or `{*}` (the `ALL` wildcard) for **every** permission. Prisma returns it as `string[]`, so no parsing is needed, and it can be queried natively (`privilege: { has: 'users.manage' }`, or `'x' = ANY(privilege)` in SQL). `*` is expanded when read (`resolvePermissions`), so a role with it automatically gets permissions added to `PERMISSIONS` later. It only counts as an exact whole entry: `tickets.*` or `'* '` grant nothing. `parsePermissions` **fails closed**: null (the column is nullable in Postgres), `[]` and unknown entries (matching is exact and case-sensitive) grant nothing. `*` anywhere in the array grants everything.
- **`AuthGuard`** already loads the user and role on every request. It now also reads `role.privilege` and sets `request.user = { id, role (name, display only), permissions: Set<Permission> }`. Permission changes therefore apply on the next request.
- **`@Can(...permissions)`** (`auth/decorators/can.decorator.ts`) requires **all** listed permissions, and **`PermissionsGuard`** (global, runs after `AuthGuard`) enforces it with a 403. A route without `@Can` is open to any logged-in user. `@Can` also adds `x-required-permissions` to the route in the OpenAPI doc. Describe the 403 yourself with `@ApiForbiddenResponse`.
- **`GET /auth/me`** returns the user plus `role` and a sorted `permissions` array (`MeResponseDto`), so clients can show or hide actions. The server still enforces everything.

## Permissions and defaults

| Permission | Allows | VIEWER | AGENT | TEAM_LEAD | ADMIN | SUPER_ADMIN |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `tickets.read` | read tickets, summary, categories, severities | ✓ | ✓ | ✓ | ✓ | ✓ |
| `users.read` | read users | ✓ | ✓ | ✓ | ✓ | ✓ |
| `tickets.write` | create tickets; update tickets assigned to you | | ✓ | ✓ | ✓ | ✓ |
| `tickets.write.any` | update **any** ticket, pick any assignee or none | | | ✓ | ✓ | ✓ |
| `tickets.delete` | delete tickets | | | | ✓ | ✓ |
| `ticket-lookups.manage` | create/update/delete categories and severities | | | | ✓ | ✓ |
| `users.manage` | create/update/delete users **below you** | | | | ✓ | ✓ |
| `users.manage.all` | manage **any** user and assign **any** role (no hierarchy limit) | | | | | ✓ |
| `roles.manage` | reserved for the roles endpoint (not built yet) | | | | | ✓ |

SUPER_ADMIN is stored as `["*"]` (since 2026-10-06, at the user's request), so its ✓ column means "everything, including future permissions". The other roles list their permissions explicitly.

The defaults reproduce exactly what each role could do under the old role-name checks, and the roles nest strictly: VIEWER ⊂ AGENT ⊂ TEAM_LEAD ⊂ ADMIN ⊂ SUPER_ADMIN (tested in `permissions.spec.ts`).

## Hierarchy rule for users ("below you")

Without `users.manage.all`, you can only **edit, deactivate, reset the password of, or delete** a user, and only **assign** a role, whose permissions are a **strict subset** of yours (`isStrictSubset`). You also can't change your own role. That's how "an ADMIN can't touch another ADMIN or a SUPER_ADMIN, or promote anyone to ADMIN" now works, without naming roles. It also holds for custom roles: an ADMIN can assign a custom role made of their own permissions, but not one with `users.manage.all`. A user with no role, or a role with no (or only unknown) permissions, counts as having none, so they're below anyone who has some. Nobody, SUPER_ADMIN included, can deactivate or delete their own account.

## Seeding

`prisma db seed` (`setDefaultRolePermissions()`) writes `DEFAULT_ROLE_PERMISSIONS` to roles with those names **only where `privilege` is empty** (`{ isEmpty: true }`). The `user_role` upsert only writes `privilege` if the JSON row has a non-empty array. So re-seeding never overwrites permissions changed later. The nonprod DB was rebuilt with `db:reset` on 2026-10-10 for the `text[]` change, so every role holds its default permissions (SUPER_ADMIN `{*}`).

## Adding a permission or route

1. Add the permission to `PERMISSIONS` (with a doc comment).
2. Put it on the route: `@Can(PERMISSIONS.X)` plus `@ApiForbiddenResponse({ description: 'Missing x' })`.
3. Grant it. SUPER_ADMIN (`*`) has it automatically. For other roles, add it to `DEFAULT_ROLE_PERMISSIONS`. **Existing databases don't pick it up from the seed** (their `privilege` isn't empty), so add it to the stored arrays with a one-off update, or later through the roles endpoint. Keep the defaults strictly nested.
4. Never compare `actor.role` (the name) in access logic; use `actor.permissions.has(...)`. Never check for `'*'` in code either; it's already expanded in `actor.permissions`.
5. **When the roles endpoint is built:** only someone who has `*` themselves should be able to grant `*`. The strict-subset rule already blocks everyone else, because `*` resolves to more than they have.
