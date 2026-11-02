import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("ClientSwitcher and ClientStatusGrid reflect No Image placeholder and removed tier/code badges", () => {
  const switcherPath = path.resolve("app/components/layout/ClientSwitcher.tsx");
  const switcherContent = fs.readFileSync(switcherPath, "utf-8");

  // Header button should NOT have client-avatar-badge or client-badge-tier
  assert.equal(switcherContent.includes("client-avatar-badge"), false, "Header button must not have client-avatar-badge");
  assert.equal(switcherContent.includes("client-badge-tier"), false, "Header button must not have client-badge-tier");
  assert.equal(switcherContent.includes("client-item-tier"), false, "Dropdown item must not have client-item-tier");
  assert.equal(switcherContent.includes("<NoImagePlaceholder"), true, "Dropdown item must render NoImagePlaceholder");

  const gridPath = path.resolve("app/components/dashboard/ClientStatusGrid.tsx");
  const gridContent = fs.readFileSync(gridPath, "utf-8");

  // Overview grid should render NoImagePlaceholder and NOT client-tier-pill
  assert.equal(gridContent.includes("<NoImagePlaceholder"), true, "Client cards must render NoImagePlaceholder");
  assert.equal(gridContent.includes("client-tier-pill"), false, "Client cards must not have client-tier-pill");
});
