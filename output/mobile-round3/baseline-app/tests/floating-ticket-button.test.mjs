import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

test("FloatingNewTicketButton preserves '+ New Ticket' text and expands appropriately", () => {
  const fabPath = path.join(ROOT, "app", "components", "ui", "FloatingNewTicketButton.tsx");
  const fabSource = fs.readFileSync(fabPath, "utf8");

  // Verify label text and icon are present
  assert.ok(fabSource.includes("New Ticket"), "FloatingNewTicketButton must render 'New Ticket' label");
  assert.ok(fabSource.includes("Plus"), "FloatingNewTicketButton must render Plus icon");

  // Verify expansion logic: isExpanded = isHovered || isOpen
  assert.ok(fabSource.includes("isExpanded = isHovered || isOpen"), "Button must expand on hover or when window is open");
  assert.ok(fabSource.includes("[max-width:120px]"), "Expanded label must have max-width: 120px");
  assert.ok(fabSource.includes("[max-width:0]"), "Idle unhovered label must collapse with max-width: 0");

  // Verify isOpen prop is supported
  assert.ok(fabSource.includes("isOpen?: boolean"), "FloatingNewTicketButtonProps must accept isOpen");
  assert.ok(fabSource.includes("fab-modal-open"), "Must apply fab-modal-open styling when modal is open");

  // Verify page.tsx passes isOpen={ticketModalOpen}
  const pagePath = path.join(ROOT, "app", "page.tsx");
  const pageSource = fs.readFileSync(pagePath, "utf8");
  assert.ok(pageSource.includes("isOpen={ticketModalOpen}"), "page.tsx must pass ticketModalOpen to FloatingNewTicketButton");
});
