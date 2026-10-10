# Seed data and import scripts

## Reference data (`prisma/seed-data/`)

Ids are strings in the JSON because pg returns BIGINT as a string. Booleans came from `BIT(1)` as `'0'`/`'1'`.

- **user_role (5):** 1 SUPER_ADMIN, 2 ADMIN, 3 TEAM_LEAD, 4 AGENT, 5 VIEWER with a `permissions` array each (the default grants: SUPER_ADMIN `["*"]`, ADMIN 8, TEAM_LEAD 4, AGENT 3, VIEWER 2). This file is the source of the defaults; `test/helpers/seeded-roles.ts` reads it so tests check the real data.
- **users (20):** all emails are `@hutabyte.com`, NIK format `YYYY-NNNN`, `password` and `department` all null. Roles: SUPER_ADMIN ids 3, 5, 6, 10; ADMIN id 4; TEAM_LEAD ids 15–18; VIEWER id 20; the rest are AGENT. Inactive users (`is_active '0'`): ids 12, 13, 19.
- **tenants (2):** 1 Telkomsel, 2 Lintasarta
- **clients (2):** 1 Tritronik, 2 IoTera
- **projects (11)** (id, name, tenant, code_prefix):
  1 Single Mediation (T1, SM) · 2 Message Broker (T1, MB) · 3 Enterprise Product Catalog - Core (T1, EPC) · 4 Enterprise Product Catalog - Tools (T1, EPC Tools) · 5 ERICA (T1, **EPC Tools**, which duplicates project 4's prefix) · 6 Umbrella SIEM (T1, USIEM) · 7 Unified Network Mediation (T1, UNEM) · 8 APH Mediation (T1, APH) · 9 B2B Surveillance (T1, B2B) · 10 Device Management (**T2 Lintasarta**, DM) · 11 ALINA-CDR-LUADR (T1, CDR-LUADR)
- **ticket_categories (7):** 1 Ad-hoc Request, 2 Escalation Handling, 3 Incident & Issue Handling, 4 Validate End-to-End Process Flow, 5 Knowledge Management & Documentation, 6 Monitoring VM, Platform & Services, 7 Others. Descriptions are in Indonesian.
- **ticket_severities (3):** 1 Low/Low, 2 Med/Medium, 3 High/High
- **ticket_logs.csv:** 3,649 rows plus a header, UTF-8 with BOM. Third-party ids look like `TS-856290` or `HTB-000001`. Subjects are often prefixed `[EPC]` and similar. Text is mostly Indonesian.

## seed.ts

- **Role permissions:** after `user_role`, `setDefaultRolePermissions()` creates every key referenced in the JSON in `permissions` (no description; the app's startup sync fills it), then inserts the role's grants into `role_permissions` **only if that role has none yet**. Re-seeding never overwrites grants changed through the API.
- Idempotent: `upsert` by id. Order is parents → children: user_role, users, tenants, projects, clients, ticket_categories, ticket_severities. After that it calls `runImportTickets()`, which `spawnSync`s `npx tsx scripts/import-tickets.ts` with `shell: true` and throws on a non-zero exit.
- It loads `prisma/seed-data/<table>.json` and silently treats a missing file as `[]`.
- Helpers: `id()` → BigInt, `big()` → BigInt|null, and `bool(v, fallback)` (true for `'1'` or `true`).
- **Passwords:** the users upsert only writes `password` when the JSON row has one, which must already be a hash. **Re-seeding never wipes passwords set in the app.** After the users step, `setDefaultPasswords()` bcrypt-hashes `SEED_DEFAULT_PASSWORD` (≥ 8 chars) into every user whose password is still null, and never overwrites an existing one. If the env var isn't set, the step is skipped with a message.
- `resetSequence(table)` runs `setval(pg_get_serial_sequence('"ctd_config"."<table>"','id'), MAX(id)+1, false)` after every table, including `user_role`. **This is required whenever rows are inserted with explicit ids**, otherwise the next app insert collides.
- It prints `table   N rows` for each table.

## scripts/import-tickets.ts

- Usage, from `backend/`: `npx tsx scripts/import-tickets.ts [file.csv] [--dry-run | --skip-invalid]`. The default file is `prisma/seed-data/ticket_logs.csv`.
- The header must be exactly `id,third_party_ticket_id,project_id,client_id,tenant_id,user_id,severity_id,category_id,subject,description,status,open_at,closed_at`.
- Dates are `DD/MM/YYYY HH:mm[:ss]` in **WIB (UTC+7)** and are converted to UTC (`TZ_OFFSET_HOURS = 7`; use 8 for WITA and 9 for WIT). Calendar-invalid dates are rejected.
- Errors include: wrong column count (usually an unquoted comma), non-integer ids, missing id, subject > 500 chars, third_party_ticket_id > 100 chars, unknown status, empty `open_at`, bad dates, duplicate ids within the file, and FK ids missing from the parent tables (checked in bulk against the DB).
- Status matching is case- and punctuation-insensitive (`re-open` → ReOpen). An empty status becomes Open.
- Warnings (still imported): closed_at < open_at; Closed with no closed_at; a non-Closed status with closed_at set.
- Field mapping: `updated_at = closed_at ?? open_at`, `requester = null`, and `created_at` keeps its default (the import time).
- Inserts use `createMany({ skipDuplicates: true })` in chunks of 500. Re-running is safe because rows with existing ids are skipped. The script then resets the `ticket_logs` sequence.
- If there are any errors and `--skip-invalid` is not set, it aborts with exit code 1, which also fails `prisma db seed`.
- It writes the full report to `scripts/import-tickets-report.txt`. The last run had 3,649 rows, all importable, 0 errors and 122 warnings: 119 "Activity but closed_at set" and 3 "Meeting but closed_at set", all from line ~1708 onward.

## scripts/export-seed.ts

A one-off script. It connects with raw `pg` to the **old** DB (via `DATABASE_URL`), runs `SET search_path TO ctd_config`, and dumps `SELECT * ... ORDER BY id` for user_role, users, tenants, projects, clients, **requesters**, ticket_categories and ticket_severities into `prisma/seed-data/*.json`. Transactional tables are deliberately excluded. `requesters` doesn't exist in the new schema, and there is no `requesters.json`.
