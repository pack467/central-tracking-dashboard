# Roles and the permission catalogue (`/roles`, `/permissions`)

A role is a name plus a set of granted permissions (rows in `role_permissions`; see `permissions.md`). **Reading needs `roles.read`** (ADMIN and SUPER_ADMIN by default, so an ADMIN's user form can list roles). **Changing needs `roles.manage`**, which by default only SUPER_ADMIN has, through `*`; the user asked for writes to be "only super admin". Both are permissions, not role-name checks. Don't grant `roles.manage` to other roles unless delegation is intended.

## Routes

| Route | Permission | Notes |
|---|---|---|
| `GET /permissions` | `roles.read` | The catalogue: `[{ key, description, obsolete, obsolete_at, roles: [{id, name}], created_at, updated_at }]`, including `*`. `roles` lists direct grants only (not through `*`). |
| `PATCH /permissions/:key` | `roles.manage` | `{ description }`. Keys themselves come from code and can't be created or renamed through the API. 404 for an unknown key. |
| `GET /roles` | `roles.read` | All roles: `{ id, name, description, permissions (granted keys as stored, may be ["*"] or include obsolete keys), effective_permissions ("*" expanded, obsolete dropped), user_count, created_at, updated_at }` |
| `GET /roles/:id` | `roles.read` | 404 if missing |
| `POST /roles` | `roles.manage` | `{ name, description?, permissions }` → 201 |
| `PATCH /roles/:id` | `roles.manage` | Any of `name`, `description`, `permissions` (`permissions` replaces the whole set) |
| `PUT /roles/:id/permissions` | `roles.manage` | `{ permissions }`: replace the whole set (a checkbox editor's "save") |
| `POST /roles/:id/permissions/:key` | `roles.manage` | Grant one. Idempotent: no change if already granted. |
| `DELETE /roles/:id/permissions/:key` | `roles.manage` | Revoke one. Idempotent: no change if not granted. |
| `DELETE /roles/:id` | `roles.manage` | Hard delete; its grants go with it (ON DELETE CASCADE) |

Every grant change **takes effect for the role's users on their next request**, because AuthGuard reads grants from the DB each time. Replacing a set runs as one Prisma nested write (`deleteMany` + `create`), so it's atomic.

## Rules (`RolesService`)

- **Validation:** `permissions` must be an array of unique keys in key format or `"*"` (400). Then every key must **exist in the `permissions` table** ("Unknown permission(s): …") and **not be obsolete** ("Obsolete permission(s): …"), both 400. `name` is trimmed and unique case-insensitively (409).
- **Grant only what you have:** every requested key must be in the actor's own effective permissions (403 "missing: …"). `"*"` can only be granted by someone whose **own role holds the `*` row**; the service loads the actor's stored grants for this, since `AuthUser.permissions` is already expanded.
- **Modify only roles within yours:** changing, granting to, revoking from or deleting a role that has `*` (when you don't) or any permission you lack → 403.
- **No self-lockout:** you can't end up without `roles.manage` on your own role (via PATCH, PUT or revoke, including revoking `*`), and you can't delete your own role (403).
- **Delete refused while in use:** a role with users → 409 "assigned to N user(s); move them to another role first". The `users.role_id` FK would otherwise silently set them to null.
- The user-management hierarchy (`users.md`) works unchanged with custom roles, because it compares permission sets.
- Reading shows every role, including ones above the reader (an ADMIN sees SUPER_ADMIN and its `*`). Assigning a role above yourself is still refused by the user hierarchy rule.
