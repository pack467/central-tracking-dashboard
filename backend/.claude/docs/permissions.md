# Permissions (access control)

Access is **permission-based**: code checks permissions, never role names. Since 2026-10-10 the permission catalogue and the role→permission grants live in the **database**, and **there is no central list in code**: each module declares its own permissions next to the code that uses them.

## How a permission exists

1. **Declared in its module** with `definePermission(key, description)` in that module's `*.permissions.ts`:
   - `src/tickets/tickets.permissions.ts`: `TICKETS_READ`, `TICKETS_WRITE`, `TICKETS_WRITE_ANY`, `TICKETS_DELETE`, `TICKET_LOOKUPS_MANAGE`
   - `src/users/users.permissions.ts`: `USERS_READ`, `USERS_MANAGE`, `USERS_MANAGE_ALL`
   - `src/roles/roles.permissions.ts`: `ROLES_READ`, `ROLES_MANAGE`
2. **Used** on a route with `@Can(TICKETS_DELETE)`, or in a service with `actor.permissions.has(TICKETS_WRITE_ANY)`.
3. **Registered** in the `permissions` table at app startup by `PermissionsService.sync()` (`OnApplicationBootstrap`).
4. **Granted** to roles through the API (`/roles`, see `roles.md`); stored as rows in `role_permissions`.

`definePermission()` returns a **branded `Permission` type**, so `@Can('tickets.delte')` with a raw string doesn't compile: routes must use the exported constants. Keys must be dotted lowercase (`reports.export`, `tickets.write.any`); `*` and malformed keys throw at load time. Defining the same key twice with different descriptions throws, since that means two modules are claiming it.

## Adding a permission (e.g. `reports.export`)

1. In the feature's own `reports.permissions.ts`: `export const REPORTS_EXPORT = definePermission('reports.export', 'Export ticket reports');`
2. Use it: `@Can(REPORTS_EXPORT)` plus `@ApiForbiddenResponse({ description: 'Missing reports.export' })`.
3. Deploy. On startup it appears in the `permissions` table and in `GET /permissions`. SUPER_ADMIN has it immediately through `*`.
4. Grant it to other roles via `POST /roles/:id/permissions/reports.export` (or `PUT /roles/:id/permissions`). No code change is needed for this step.
5. Optionally add it to `prisma/seed-data/user_role.json` so fresh databases grant it by default. Keep the seeded roles strictly nested (a test checks this).

**Never** compare `actor.role` (the name) in access logic, and never check for `'*'` in code; it's already expanded in `actor.permissions`.

## Database

| Table | Columns | Notes |
|---|---|---|
| `permissions` | `key` VARCHAR(100) **PK**, `description` TEXT?, `obsolete_at` TIMESTAMP?, `created_at`, `updated_at` | The catalogue. Includes the `*` row. |
| `role_permissions` | `role_id` → `user_role.id` (**ON DELETE CASCADE**), `permission_key` → `permissions.key` (**ON DELETE RESTRICT**, ON UPDATE CASCADE), `created_at`; **PK (role_id, permission_key)**; index on `permission_key` | Which role has which permission. The FK means a grant for a non-existent key is impossible. |

`user_role` no longer has a `privilege` column (it held a JSON string, then a `text[]`; replaced by `role_permissions` on 2026-10-10, with the nonprod DB rebuilt via `db:reset`).

## Startup sync (`src/permissions/permissions.service.ts`)

On every boot it makes the `permissions` table match the code (the registry plus `*`):
- **adds** keys the code defines, with the code's description (`createMany … skipDuplicates`, safe if several instances start at once);
- **fills a description only where it's empty**: rows created by the seed get one, but **a description edited via the API is never overwritten**;
- **marks keys the code no longer defines as obsolete** (`obsolete_at`, logged as a warning). It **never deletes** them; existing grants stay but give nothing. Remove them deliberately.
- **un-marks** an obsolete key when the code defines it again.

It logs e.g. `Permissions synced: 11 defined, 2 added, 9 described, 0 restored, 0 marked obsolete`. Note that the developer's `nest start --watch` dev server also runs it whenever it restarts.

## Runtime

- `src/auth/permissions.ts`: the registry (`definePermission`, `definedPermissions`, `isDefinedPermission`), `ALL` (`*`), `resolvePermissions` (expands `*` to every defined key; drops keys the code doesn't define, so obsolete/unknown keys **fail closed**), `parsePermissions`, `toStoredPermissions` (unique and sorted) and `isStrictSubset`.
- `src/auth/role-permissions.ts`: `grantedKeysSelect` (spread into a Prisma `role: { select }`) and `grantedKeys(role)`, so every reader of grants does it the same way.
- `AuthGuard` loads the user, role and grants in its one per-request query and sets `request.user = { id, role (name, display only), permissions: Set<Permission> }`. Grant changes therefore apply on the next request.
- `@Can(...permissions)` requires **all** of them, enforced by the global `PermissionsGuard` (403). It also adds `x-required-permissions` to the OpenAPI doc. Without `@Can`, any logged-in user is allowed.
- `GET /auth/me` returns `role` and the effective `permissions` (sorted, `*` expanded) for clients to show or hide actions.

## Current permissions and seeded defaults

| Permission | VIEWER | AGENT | TEAM_LEAD | ADMIN | SUPER_ADMIN |
|---|:-:|:-:|:-:|:-:|:-:|
| `tickets.read`, `users.read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `tickets.write` | | ✓ | ✓ | ✓ | ✓ |
| `tickets.write.any` | | | ✓ | ✓ | ✓ |
| `tickets.delete`, `ticket-lookups.manage`, `users.manage`, `roles.read` | | | | ✓ | ✓ |
| `users.manage.all`, `roles.manage` | | | | | ✓ |

SUPER_ADMIN is granted `*` (one row), so it automatically has every future permission. Defaults come from `prisma/seed-data/user_role.json` (`permissions` arrays). The seed creates any referenced keys (no description; the startup sync fills it), then grants them **only to roles that have no grants yet**, so re-seeding never overwrites changes made through the API. Live grants: SUPER_ADMIN 1, ADMIN 8, TEAM_LEAD 4, AGENT 3, VIEWER 2 (18 rows).

## Hierarchy rule for users ("below you")

Without `users.manage.all`, you can only edit, deactivate, reset the password of, or delete a user, and only assign a role, whose effective permissions are a **strict subset** of yours (`isStrictSubset`). You can't change your own role either. A user with no role, or a role with no (or only unknown/obsolete) permissions, counts as having none. Nobody, SUPER_ADMIN included, can deactivate or delete their own account.
