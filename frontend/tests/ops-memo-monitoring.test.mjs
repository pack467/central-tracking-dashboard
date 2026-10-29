import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFile(path.join(ROOT, "app", ...parts), "utf-8");

test("Live Ops View shows the Memo & Catatan Shift card, the notes modal and the Monitoring Checklist", async () => {
  const view = await read("components", "tickets", "TicketReportView.tsx");

  // 1. Shift memo: a card on the dashboard and a modal with notes, Simpan and a format toolbar
  assert.ok(view.includes("Memo & Catatan Shift"), "Renders Memo & Catatan Shift title");
  assert.ok(view.includes("<MemoCard"), "Renders the memo card");
  assert.ok(view.includes("<MemoModal"), "Renders the memo modal");

  const modal = await read("components", "dashboard", "MemoModal.tsx");
  assert.ok(modal.includes("Simpan"), "The main button is Simpan");
  assert.ok(!/>\s*Selesai\s*</.test(modal), "There is no Selesai button any more");
  assert.ok(modal.includes("Simpan perubahan?"), "Closing with unsaved changes asks first");
  assert.ok(modal.includes("MemoTabs") && modal.includes("MemoToolbar") && modal.includes("NoteEditor"), "Uses the note bar, the toolbar and the editor");

  const store = await read("lib", "shift-notes.ts");
  assert.ok(store.includes("ctd.memo.v2"), "Notes persist under a versioned key");
  assert.ok(store.includes("ctd_shift_notepad_memo"), "The old single-string memo is still read for migration");

  // 2. Monitoring Checklist (OK / NOK)
  assert.ok(view.includes("List Monitoring Shift"), "Renders List Monitoring Shift title");
  assert.ok(view.includes("toggleMonitoringStatus"), "Has toggle between OK and NOK");
  assert.ok(view.includes("btn-ok"), "Has OK button state");
  assert.ok(view.includes("btn-nok"), "Has NOK button state");
  assert.ok(view.includes("ctd_shift_monitoring_checklist"), "Supports localStorage persistence for checklist");
});
