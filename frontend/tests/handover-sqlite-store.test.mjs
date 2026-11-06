import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openSqliteStore } from "../db/sqlite-store.ts";

const withDir = async (run) => {
  const dir = mkdtempSync(join(tmpdir(), "ctd-handover-"));
  try { return await run(dir); }
  finally { rmSync(dir, { recursive: true, force: true }); }
};
const withStore = (run) => withDir(async (dir) => {
  const db = await openSqliteStore(join(dir, "nested", "handover.sqlite"));
  try { return await run(db); } finally { db.close(); }
});
const insert = "INSERT INTO handover_notes (title, handover_date, content, create_request_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(create_request_id) DO NOTHING RETURNING id, revision";

test("the SQLite store answers the D1 calls the handover API makes", () => withStore(async (db) => {
  const first = await db.prepare(insert).bind("A", "2026-11-05", "{}", "req-1", "t", "t").first();
  assert.equal(first.id, 1);
  assert.equal(first.revision, 1, "the revision column starts at 1, as in D1");
  assert.equal(await db.prepare(insert).bind("A", "2026-11-05", "{}", "req-1", "t", "t").first(), null, "a replayed request id inserts nothing");

  const second = await db.prepare(insert).bind("B", "2026-11-06", "{}", "req-2", "t", "t").first();
  const { results } = await db.prepare("SELECT title FROM handover_notes WHERE handover_date >= ? ORDER BY id DESC").bind("2026-11-01").all();
  assert.deepEqual(results.map((row) => row.title), ["B", "A"]);

  const updated = await db.prepare("UPDATE handover_notes SET revision = revision + 1 WHERE id = ? AND revision = ? RETURNING revision").bind(1, 1).first();
  assert.equal(updated.revision, 2);
  assert.equal(await db.prepare("UPDATE handover_notes SET revision = revision + 1 WHERE id = ? AND revision = ? RETURNING revision").bind(1, 1).first(), null, "a stale revision changes nothing");

  assert.equal((await db.prepare("DELETE FROM handover_notes WHERE id = ? RETURNING id").bind(second.id).first()).id, second.id);
  assert.equal(await db.prepare("SELECT id FROM handover_notes WHERE id = ?").bind(second.id).first(), null);
}));

test("the list filter's json_each query works on this store", () => withStore(async (db) => {
  await db.prepare(insert).bind("A", "2026-11-05", JSON.stringify({ sourcePic: "Budi", targetPic: "Sari" }), "req-1", "t", "t").run();
  const query = "SELECT id FROM handover_notes WHERE EXISTS (SELECT 1 FROM json_each(?) AS pic WHERE instr(lower(json_extract(content, '$.sourcePic')), pic.value) > 0)";
  assert.equal((await db.prepare(query).bind(JSON.stringify(["budi"])).all()).results.length, 1);
  assert.equal((await db.prepare(query).bind(JSON.stringify(["agnes"])).all()).results.length, 0);
}));

test("notes survive reopening the file", () => withDir(async (dir) => {
  const path = join(dir, "handover.sqlite");
  const first = await openSqliteStore(path);
  await first.prepare(insert).bind("A", "2026-11-05", "{}", "req-1", "t", "t").run();
  first.close();
  const again = await openSqliteStore(path);
  try { assert.equal((await again.prepare("SELECT title FROM handover_notes").all()).results[0].title, "A"); }
  finally { again.close(); }
}));

test("a new drizzle migration must be added to the SQLite schema too", () => {
  const journal = JSON.parse(readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
  assert.equal(journal.entries.length, 2, "update SQLITE_SCHEMA in db/sqlite-store.ts for the new migration, then this number");
});
