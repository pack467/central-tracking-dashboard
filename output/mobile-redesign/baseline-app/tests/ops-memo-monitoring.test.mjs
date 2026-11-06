import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

test("Live Ops View replaces snapshot with Shift Notepad Memo and Monitoring Checklist", async () => {
  const tsxPath = path.join(ROOT, "app", "components", "tickets", "TicketReportView.tsx");
  const content = await fs.readFile(tsxPath, "utf-8");

  // 1. Shift Notepad Memo
  assert.ok(content.includes("Memo & Catatan Shift"), "Renders Memo & Catatan Shift title");
  assert.ok(content.includes("memo-notepad-textarea"), "Renders notepad textarea");
  assert.ok(content.includes("ctd_shift_notepad_memo"), "Supports localStorage persistence for memo");
  assert.ok(content.includes("handleCopyMemo"), "Has copy to clipboard functionality");
  assert.ok(content.includes("handleAddBullet"), "Has add bullet point functionality");

  // 2. Monitoring Checklist (OK / NOK)
  assert.ok(content.includes("List Monitoring Shift"), "Renders List Monitoring Shift title");
  assert.ok(content.includes("toggleMonitoringStatus"), "Has toggle between OK and NOK");
  assert.ok(content.includes("btn-ok"), "Has OK button state");
  assert.ok(content.includes("btn-nok"), "Has NOK button state");
  assert.ok(content.includes("ctd_shift_monitoring_checklist"), "Supports localStorage persistence for checklist");
});
