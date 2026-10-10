import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ALL, ALL_DESCRIPTION, definedPermissions } from '../auth/permissions.js';

@Injectable()
export class PermissionsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Every module's *.permissions.ts has been loaded by the time the app boots,
  // so the registry is complete here.
  async onApplicationBootstrap() {
    await this.sync();
  }

  // Makes the permissions table match the code:
  // - adds keys the code defines (with the code's description),
  // - fills a description only where it's still empty (an edited one is kept),
  // - marks keys the code no longer defines as obsolete (never deletes them),
  // - un-marks obsolete keys that the code defines again.
  async sync() {
    const defined = [
      ...definedPermissions().map(({ key, description }) => ({ key: key as string, description })),
      { key: ALL, description: ALL_DESCRIPTION },
    ];
    const definedKeys = defined.map((d) => d.key);
    const existing = await this.prisma.permission.findMany({
      select: { key: true, description: true, obsolete_at: true },
    });
    const byKey = new Map(existing.map((p) => [p.key, p]));

    const added = defined.filter((d) => !byKey.has(d.key));
    if (added.length) await this.prisma.permission.createMany({ data: added, skipDuplicates: true });

    const described = defined.filter((d) => byKey.has(d.key) && !byKey.get(d.key)!.description);
    for (const { key, description } of described) {
      await this.prisma.permission.update({ where: { key }, data: { description } });
    }

    const restored = existing.filter((p) => p.obsolete_at && definedKeys.includes(p.key)).map((p) => p.key);
    if (restored.length) {
      await this.prisma.permission.updateMany({ where: { key: { in: restored } }, data: { obsolete_at: null } });
    }

    const obsolete = existing.filter((p) => !p.obsolete_at && !definedKeys.includes(p.key)).map((p) => p.key);
    if (obsolete.length) {
      await this.prisma.permission.updateMany({ where: { key: { in: obsolete } }, data: { obsolete_at: new Date() } });
      this.logger.warn(`Permissions no longer defined in code, marked obsolete: ${obsolete.join(', ')}`);
    }

    this.logger.log(
      `Permissions synced: ${defined.length} defined, ${added.length} added, ${described.length} described, ` +
        `${restored.length} restored, ${obsolete.length} marked obsolete`,
    );
    return { added: added.map((d) => d.key), described: described.map((d) => d.key), restored, obsolete };
  }

  async findAll() {
    const rows = await this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
      include: { roles: { select: { role: { select: { id: true, name: true } } } } },
    });
    return rows.map(({ roles, ...p }) => ({
      ...p,
      obsolete: p.obsolete_at !== null,
      roles: roles.map((r) => r.role).sort((a, b) => Number(a.id - b.id)),
    }));
  }

  async updateDescription(key: string, description: string) {
    const exists = await this.prisma.permission.findUnique({ where: { key }, select: { key: true } });
    if (!exists) throw new NotFoundException(`Permission "${key}" not found`);
    await this.prisma.permission.update({ where: { key }, data: { description } });
    return (await this.findAll()).find((p) => p.key === key)!;
  }
}
