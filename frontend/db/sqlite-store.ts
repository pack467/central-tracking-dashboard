import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Handover notes on plain Node (`npm run start`): one SQLite file with the same table as D1, behind the few D1 calls the handover API uses.
 * This one server owns the file, so it only suits a single instance on a disk that survives a deploy: set HANDOVER_DB_PATH to such a place.
 * The table below is drizzle/0000 + 0001 as one statement. A new migration must be added here too (tests/handover-sqlite-store.test.mjs fails until it is).
 */
export const SQLITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS handover_notes (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    title text NOT NULL,
    handover_date text NOT NULL,
    content text NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    create_request_id text
  );
  CREATE INDEX IF NOT EXISTS idx_handover_notes_handover_date ON handover_notes (handover_date);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_handover_notes_create_request ON handover_notes (create_request_id);
`;

const DEFAULT_PATH = ".data/handover.sqlite";
// Kept out of the bundler's sight: this file is also in the Workers build, where the module does not exist and this code never runs.
const SQLITE_MODULE = "node:sqlite";

type SqliteDatabase = InstanceType<typeof import("node:sqlite").DatabaseSync>;
type SqliteValue = string | number | bigint | null | Uint8Array;

class Statement {
  constructor(private db: SqliteDatabase, private sql: string, private params: SqliteValue[] = []) {}
  bind(...params: SqliteValue[]) { return new Statement(this.db, this.sql, params); }
  async first() { return this.db.prepare(this.sql).get(...this.params) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.params) }; }
  async run() { return this.db.prepare(this.sql).run(...this.params); }
}

export async function openSqliteStore(configuredPath = process.env.HANDOVER_DB_PATH?.trim()): Promise<D1Database> {
  const { DatabaseSync } = (await import(/* @vite-ignore */ SQLITE_MODULE)) as typeof import("node:sqlite");
  if (!configuredPath && process.env.NODE_ENV === "production") {
    console.warn(`[handover] HANDOVER_DB_PATH is not set: notes are stored in ${DEFAULT_PATH} inside the app folder and are lost if a deploy replaces that folder.`);
  }
  const path = resolve(configuredPath || DEFAULT_PATH);
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  // another process on the same file (a restart overlapping the old one) waits a moment instead of failing
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  db.exec(SQLITE_SCHEMA);
  return { prepare: (sql: string) => new Statement(db, sql), close: () => db.close() } as unknown as D1Database;
}
