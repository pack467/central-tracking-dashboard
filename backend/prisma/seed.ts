// Seeds reference data from prisma/seed-data/*.json into the NEW database.
// Idempotent: safe to run repeatedly (upsert by id).
// Run: npx prisma db seed
import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
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

async function seed(table: string, upsert: (r: Row) => Promise<unknown>, hasSequence = true) {
  const rows = load(table);
  for (const r of rows) await upsert(r);
  if (hasSequence) await resetSequence(table);
  console.log(`${table.padEnd(20)} ${rows.length} rows`);
}

async function main() {
  // Order matters: parents before children (FKs).
  await seed(
    'user_role',
    (r) => {
      const data = { id: id(r.id), name: r.name, privilege: r.privilege ?? null, info: r.info };
      return prisma.userRole.upsert({ where: { id: data.id }, update: data, create: data });
    },
    false, // user_role.id has no autoincrement
  );

  await seed('users', (r) => {
    const data = {
      id: id(r.id),
      name: r.name,
      nik: r.nik,
      email: r.email,
      role_id: big(r.role_id),
      is_active: bool(r.is_active, true),
      password: r.password ?? null, // must already be a hash (e.g. $2b$...), never plaintext
      photo_url: r.photo_url ?? null,
      department: r.department ?? null,
    };
    return prisma.user.upsert({ where: { id: data.id }, update: data, create: data });
  });

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());