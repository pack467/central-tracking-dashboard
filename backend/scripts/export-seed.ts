// One-off: export reference data from the OLD database into JSON seed files.
// Run: npx tsx scripts/export-seed.ts
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import pg from 'pg';

const SCHEMA = 'ctd_config';

// Reference / master data only. Transactional tables (ticket_logs, handover,
// routine_*, monitoring_logs) are intentionally excluded.
const TABLES = [
  'user_role',
  'users',
  'tenants',
  'projects',
  'clients',
  'requesters',
  'ticket_categories',
  'ticket_severities',
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(`SET search_path TO ${SCHEMA}`);

mkdirSync('prisma/seed-data', { recursive: true });

for (const table of TABLES) {
  // pg returns BIGINT as string and BIT(1) as '0'/'1' -> both JSON-safe.
  const { rows } = await client.query(`SELECT * FROM ${table} ORDER BY id`);
  writeFileSync(`prisma/seed-data/${table}.json`, JSON.stringify(rows, null, 2));
  console.log(`${table.padEnd(20)} ${rows.length} rows`);
}

await client.end();