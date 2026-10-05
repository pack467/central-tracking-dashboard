// Import historical ticket logs from CSV into ctd_config.ticket_logs.
//
// Usage (run from backend/):
//   npx tsx scripts/import-tickets.ts [file.csv] --dry-run       validate only, writes nothing
//   npx tsx scripts/import-tickets.ts [file.csv]                 import if there are 0 errors
//   npx tsx scripts/import-tickets.ts [file.csv] --skip-invalid  import valid rows, skip the rest
//
// Default file: prisma/seed-data/ticket_logs.csv
// Re-runnable: rows whose id (or third_party_ticket_id) already exists are skipped.
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';

const SCHEMA = 'ctd_config';
const TZ_OFFSET_HOURS = 7; // [●] CSV timestamps are WIB (UTC+7). Change if they are WITA (8) / WIT (9).
const CHUNK = 500;
const REPORT_FILE = 'scripts/import-tickets-report.txt';

const args = process.argv.slice(2);
const FILE = args.find((a) => !a.startsWith('--')) ?? 'prisma/seed-data/ticket_logs.csv';
const DRY_RUN = args.includes('--dry-run');
const SKIP_INVALID = args.includes('--skip-invalid');

const COLUMNS = [
  'id', 'third_party_ticket_id', 'project_id', 'client_id', 'tenant_id', 'user_id',
  'severity_id', 'category_id', 'subject', 'description', 'status', 'open_at', 'closed_at',
] as const;
type Column = (typeof COLUMNS)[number];

type Status = NonNullable<Prisma.TicketLogCreateManyInput['status']>;
const STATUS: Record<string, Status> = {
  open: 'Open', closed: 'Closed', activity: 'Activity',
  meeting: 'Meeting', pending: 'Pending', reopen: 'ReOpen',
};

type Issue = { line: number; id: string; message: string };
const errors: Issue[] = [];
const warnings: Issue[] = [];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }, { schema: SCHEMA }),
});

// "22/05/2025 09:06" (WIB) -> Date (UTC). Returns null if the format or the date is invalid.
const DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
function parseLocal(raw: string): Date | null {
  const m = DATE_RE.exec(raw);
  if (!m) return null;
  const [d, mo, y, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? '0'].map(Number);
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d || h > 23 || mi > 59 || s > 59) return null;
  return new Date(Date.UTC(y, mo - 1, d, h - TZ_OFFSET_HOURS, mi, s));
}

type Valid = { line: number; data: Prisma.TicketLogCreateManyInput };

function validate(): Valid[] {
  const parsed = parse(readFileSync(FILE), {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    info: true,
  }) as unknown as { record: string[]; info: { lines: number } }[];

  const [header, ...rows] = parsed;
  const got = header.record.map((h) => h.trim()).join(',');
  if (got !== COLUMNS.join(',')) {
    throw new Error(`Unexpected header.\n  expected: ${COLUMNS.join(',')}\n  got:      ${got}`);
  }

  const valid: Valid[] = [];
  const seenIds = new Map<string, number>();

  for (const { record, info } of rows) {
    const line = info.lines;
    const cells = record.map((v) => v.trim());
    const rawId = cells[0] ?? '?';

    if (cells.length !== COLUMNS.length) {
      errors.push({
        line, id: rawId,
        message: `expected ${COLUMNS.length} columns, got ${cells.length} (unquoted comma in subject/description?)`,
      });
      continue;
    }

    const row = Object.fromEntries(COLUMNS.map((c, i) => [c, cells[i]])) as Record<Column, string>;
    const problems: string[] = [];
    const warn = (message: string) => warnings.push({ line, id: rawId, message });

    const big = (col: Column): bigint | null => {
      const v = row[col];
      if (!v) return null;
      if (!/^\d+$/.test(v)) {
        problems.push(`${col} is not a whole number: "${v}"`);
        return null;
      }
      return BigInt(v);
    };
    const text = (col: Column, max?: number): string | null => {
      const v = row[col];
      if (!v) return null;
      if (max && v.length > max) problems.push(`${col} is ${v.length} chars, max ${max}`);
      return v;
    };
    const date = (col: Column): Date | null => {
      const v = row[col];
      if (!v) return null;
      const d = parseLocal(v);
      if (!d) problems.push(`${col} is not a valid DD/MM/YYYY HH:mm date: "${v}"`);
      return d;
    };

    const id = big('id');
    if (id === null && !problems.length) problems.push('id is required');

    const thirdParty = text('third_party_ticket_id', 100);
    const statusKey = row.status.toLowerCase().replace(/[^a-z]/g, '');
    const status: Status | undefined = statusKey ? STATUS[statusKey] : 'Open';
    if (statusKey && !status) problems.push(`unknown status "${row.status}"`);

    const openAt = date('open_at');
    const closedAt = date('closed_at');
    if (!row.open_at) problems.push('open_at is empty');

    // duplicates inside the file
    if (id !== null) {
      const prev = seenIds.get(id.toString());
      if (prev) problems.push(`duplicate id (also on line ${prev})`);
      else seenIds.set(id.toString(), line);
    }

    // suspicious but importable
    if (openAt && closedAt && closedAt < openAt) warn('closed_at is before open_at');
    if (status === 'Closed' && !row.closed_at) warn('status is Closed but closed_at is empty');
    if (status && status !== 'Closed' && row.closed_at) warn(`status is ${status} but closed_at is set`);

    const data: Prisma.TicketLogCreateManyInput = {
      id: id ?? 0n,
      third_party_ticket_id: thirdParty,
      project_id: big('project_id'),
      client_id: big('client_id'),
      tenant_id: big('tenant_id'),
      user_id: big('user_id'),
      severity_id: big('severity_id'),
      category_id: big('category_id'),
      subject: text('subject', 500),
      description: text('description'),
      status: status ?? 'Open',
      open_at: openAt ?? undefined,
      updated_at: closedAt ?? openAt ?? undefined,
      closed_at: closedAt,
      requester: null,
    };

    if (problems.length) {
      for (const message of problems) errors.push({ line, id: rawId, message });
    } else {
      valid.push({ line, data });
    }
  }

  return valid;
}

// Every referenced id must exist in its parent table (seed reference data first).
async function checkForeignKeys(rows: Valid[]): Promise<Valid[]> {
  type Fk = keyof Pick<Prisma.TicketLogCreateManyInput,
    'project_id' | 'client_id' | 'tenant_id' | 'user_id' | 'severity_id' | 'category_id'>;
  const lookups: [Fk, string, (ids: bigint[]) => Promise<{ id: bigint }[]>][] = [
    ['project_id', 'projects', (ids) => prisma.project.findMany({ where: { id: { in: ids } }, select: { id: true } })],
    ['client_id', 'clients', (ids) => prisma.client.findMany({ where: { id: { in: ids } }, select: { id: true } })],
    ['tenant_id', 'tenants', (ids) => prisma.tenant.findMany({ where: { id: { in: ids } }, select: { id: true } })],
    ['user_id', 'users', (ids) => prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } })],
    ['severity_id', 'ticket_severities', (ids) => prisma.ticketSeverity.findMany({ where: { id: { in: ids } }, select: { id: true } })],
    ['category_id', 'ticket_categories', (ids) => prisma.ticketCategory.findMany({ where: { id: { in: ids } }, select: { id: true } })],
  ];

  const bad = new Set<number>();
  for (const [col, table, find] of lookups) {
    const wanted = [...new Set(rows.map((r) => r.data[col]).filter((v): v is bigint => typeof v === 'bigint'))];
    if (!wanted.length) continue;
    const found = new Set((await find(wanted)).map((r) => r.id.toString()));
    for (const r of rows) {
      const v = r.data[col];
      if (typeof v === 'bigint' && !found.has(v.toString())) {
        errors.push({ line: r.line, id: String(r.data.id), message: `${col} ${v} does not exist in ${table}` });
        bad.add(r.line);
      }
    }
  }
  return rows.filter((r) => !bad.has(r.line));
}

async function resetSequence(table: string) {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${SCHEMA}"."${table}"', 'id'),
                   COALESCE((SELECT MAX(id) FROM "${SCHEMA}"."${table}"), 0) + 1, false)`,
  );
}

function writeReport(total: number, importable: number) {
  const fmt = (i: Issue) => `line ${String(i.line).padStart(5)}  id ${i.id.padEnd(6)}  ${i.message}`;
  const body = [
    `File: ${FILE}`,
    `Rows: ${total}  importable: ${importable}  errors: ${errors.length}  warnings: ${warnings.length}`,
    '',
    `ERRORS (${errors.length})`,
    ...errors.sort((a, b) => a.line - b.line).map(fmt),
    '',
    `WARNINGS (${warnings.length})`,
    ...warnings.sort((a, b) => a.line - b.line).map(fmt),
  ].join('\n');
  writeFileSync(REPORT_FILE, body);

  console.log(`\nRows in file: ${total}   importable: ${importable}   errors: ${errors.length}   warnings: ${warnings.length}`);
  for (const e of errors.slice(0, 15)) console.log(`  ERROR ${fmt(e)}`);
  if (errors.length > 15) console.log(`  ...and ${errors.length - 15} more`);
  console.log(`Full report: ${REPORT_FILE}\n`);
}

async function main() {
  const parsedValid = validate();
  const totalRows = parsedValid.length + new Set(errors.map((e) => e.line)).size;
  const importable = await checkForeignKeys(parsedValid);
  writeReport(totalRows, importable.length);

  if (DRY_RUN) {
    console.log('Dry run: nothing written.');
    return;
  }
  if (errors.length && !SKIP_INVALID) {
    console.log('Aborted: fix the errors above, or re-run with --skip-invalid to import only the valid rows.');
    process.exitCode = 1;
    return;
  }

  let inserted = 0;
  for (let i = 0; i < importable.length; i += CHUNK) {
    const chunk = importable.slice(i, i + CHUNK).map((r) => r.data);
    const res = await prisma.ticketLog.createMany({ data: chunk, skipDuplicates: true });
    inserted += res.count;
    console.log(`  ${Math.min(i + CHUNK, importable.length)}/${importable.length}`);
  }
  await resetSequence('ticket_logs');

  console.log(`Inserted ${inserted}, skipped ${importable.length - inserted} that already existed.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());