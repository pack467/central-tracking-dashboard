// A role's grants live in role_permissions. Use these in Prisma queries so every
// caller selects and reads them the same way:
//   select: { role: { select: { name: true, ...grantedKeysSelect } } }
//   parsePermissions(grantedKeys(user.role))
export const grantedKeysSelect = {
  permissions: { select: { permission_key: true } },
} as const;

export const grantedKeys = (
  role: { permissions: { permission_key: string }[] } | null | undefined,
): string[] => role?.permissions.map((p) => p.permission_key) ?? [];
