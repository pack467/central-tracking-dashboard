// Seeds reference data from prisma/seed-data/*.json into the NEW database.
// Idempotent: safe to run repeatedly (upsert by id).
// Run: npx prisma db seed
import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const SCHEMA = 'ctd_config';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }, { schema: SCHEMA }),
});

type Row = Record<string, any>;

const load = (table: string): Row[] => {
  const file = `prisma/seed-data/${table}.json`;
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
};

const big = (v: unknown): bigint | null => (v === null || v === undefined ? null : BigInt(v as string));
const id = (v: unknown): bigint => BigInt(v as string);
const bool = (v: unknown, fallback: boolean): boolean =>
  v === null || v === undefined ? fallback : v === '1' || v === true;

// Inserting explicit ids does NOT advance the autoincrement sequence.
// Without this, the app's first insert would collide with id 1.
async function resetSequence(table: string) {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${SCHEMA}"."${table}"', 'id'),
                   COALESCE((SELECT MAX(id) FROM "${SCHEMA}"."${table}"), 0) + 1, false)`,
  );
}

async function seed(table: string, upsert: (r: Row) => Promise<unknown>) {
  const rows = load(table);
  for (const r of rows) await upsert(r);
  await resetSequence(table);
  console.log(`${table.padEnd(20)} ${rows.length} rows`);
}

async function main() {
  // Order matters: parents before children (FKs).
  await seed('user_role', (r) => {
    // Permissions are seeded separately (role_permissions), below.
    const data = { id: id(r.id), name: r.name, info: r.info };
    return prisma.userRole.upsert({ where: { id: data.id }, update: data, create: data });
  });
  await setDefaultRolePermissions();

  await seed('users', (r) => {
    const data = {
      id: id(r.id),
      name: r.name,
      nik: r.nik,
      email: r.email,
      role_id: big(r.role_id),
      is_active: bool(r.is_active, true),
      photo_url: r.photo_url ?? null,
      department: r.department ?? null,
      // Only written when the JSON has one, so re-seeding never wipes passwords set in the app.
      // Must already be a hash (e.g. $2b$...), never plaintext.
      ...(r.password && { password: r.password }),
    };
    return prisma.user.upsert({ where: { id: data.id }, update: data, create: data });
  });
  await setDefaultPasswords();

  await seed('tenants', (r) => {
    const data = { id: id(r.id), name: r.name, detail_info: r.detail_info };
    return prisma.tenant.upsert({ where: { id: data.id }, update: data, create: data });
  });

  await seed('projects', (r) => {
    const data = { id: id(r.id), name: r.name, tenant_id: big(r.tenant_id), code_prefix: r.code_prefix };
    return prisma.project.upsert({ where: { id: data.id }, update: data, create: data });
  });

  await seed('clients', (r) => {
    const data = { id: id(r.id), name: r.name, detail_info: r.detail_info };
    return prisma.client.upsert({ where: { id: data.id }, update: data, create: data });
  });

  await seed('ticket_categories', (r) => {
    const data = { id: id(r.id), name: r.name, description: r.description };
    return prisma.ticketCategory.upsert({ where: { id: data.id }, update: data, create: data });
  });

  await seed('ticket_severities', (r) => {
    const data = { id: id(r.id), code_name: r.code_name, name: r.name };
    return prisma.ticketSeverity.upsert({ where: { id: data.id }, update: data, create: data });
  });

  await runImportTickets();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

// Gives each role in user_role.json its `permissions`, but only if the role has
// no grants yet, so re-seeding never overwrites permissions changed via /roles.
// Permission keys are created first (role_permissions has an FK to them); their
// descriptions are filled in by the app's startup sync, which reads the code.
async function setDefaultRolePermissions() {
  const roles = load('user_role');
  const keys = [...new Set(roles.flatMap((r) => (Array.isArray(r.permissions) ? r.permissions : [])))];
  await prisma.permission.createMany({ data: keys.map((key) => ({ key })), skipDuplicates: true });

  let seeded = 0;
  for (const r of roles) {
    if (!Array.isArray(r.permissions) || !r.permissions.length) continue;
    const role_id = id(r.id);
    if (await prisma.rolePermission.count({ where: { role_id } })) continue;
    const { count } = await prisma.rolePermission.createMany({
      data: (r.permissions as string[]).map((permission_key) => ({ role_id, permission_key })),
      skipDuplicates: true,
    });
    seeded += count;
  }
  console.log(`${'role permissions'.padEnd(20)} ${seeded} grants (${keys.length} keys)`);
}

// Gives users without a password a starting one, so they can log in and change it.
// Never touches users that already have a password.
async function setDefaultPasswords() {
  const plain = process.env.SEED_DEFAULT_PASSWORD;
  if (!plain) {
    console.log('SEED_DEFAULT_PASSWORD not set; users without a password cannot log in');
    return;
  }
  if (plain.length < 8) throw new Error('SEED_DEFAULT_PASSWORD must be at least 8 characters');
  const { count } = await prisma.user.updateMany({
    where: { password: null },
    data: { password: await bcrypt.hash(plain, 12) },
  });
  console.log(`${'default passwords'.padEnd(20)} ${count} users`);
}

async function runImportTickets() {
  console.log('\n--- Running ticket import ---');
  const result = spawnSync('npx', ['tsx', 'scripts/import-tickets.ts'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`import-tickets.ts exited with code ${result.status}`);
  }
  console.log('--- Ticket import complete ---\n');
}