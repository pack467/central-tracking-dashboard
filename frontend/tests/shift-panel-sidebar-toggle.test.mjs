import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const frontendRoot = resolve(import.meta.dirname, "..");

test("Shift coverage panel open state disables the left sidebar collapse toggle button", () => {
  const sidebarPath = resolve(frontendRoot, "app/components/layout/Sidebar.tsx");
  assert.ok(existsSync(sidebarPath), "Sidebar.tsx must exist");
  const sidebarContent = readFileSync(sidebarPath, "utf8");

  // 1. SidebarProps accepts shiftPanelOpen
  assert.ok(sidebarContent.includes("shiftPanelOpen?: boolean"), "SidebarProps must have shiftPanelOpen");

  // 2. Button has disabled and pointer-events-none when shiftPanelOpen is true
  assert.ok(sidebarContent.includes("disabled={shiftPanelOpen}"), "Sidebar toggle tab must be disabled when shiftPanelOpen is true");
  assert.ok(sidebarContent.includes("aria-disabled={shiftPanelOpen}"), "Sidebar toggle tab must set aria-disabled");
  assert.ok(sidebarContent.includes("shiftPanelOpen ? undefined : onToggleCollapse"), "Sidebar toggle tab onClick must be blocked when shiftPanelOpen is true");
  assert.ok(sidebarContent.includes("shiftPanelOpen ? undefined : (collapsed ?"), "Sidebar toggle tab title must be undefined when shiftPanelOpen is true to prevent tooltip");
  assert.ok(sidebarContent.includes("!z-[20]"), "Sidebar toggle tab must drop z-index behind backdrop when shiftPanelOpen is active");
  assert.ok(sidebarContent.includes("!pointer-events-none"), "Sidebar toggle tab must disable pointer-events");

  // 3. Page.tsx passes shiftPanelOpen to Sidebar
  const pagePath = resolve(frontendRoot, "app/page.tsx");
  const pageContent = readFileSync(pagePath, "utf8");
  assert.ok(pageContent.includes("shiftPanelOpen={shiftPanelOpen}"), "page.tsx must pass shiftPanelOpen to Sidebar");

  // 4. base.css contains .shift-panel-is-open .sidebar-toggle-tab rule
  const baseCssPath = resolve(frontendRoot, "app/styles/tailwind/base.css");
  const baseCssContent = readFileSync(baseCssPath, "utf8");
  assert.ok(baseCssContent.includes(".shift-panel-is-open .sidebar-toggle-tab"), "base.css must define .shift-panel-is-open .sidebar-toggle-tab");
  assert.ok(baseCssContent.includes("[pointer-events:none]"), "base.css must apply pointer-events:none");
  assert.ok(baseCssContent.includes("[z-index:20]"), "base.css must apply z-index:20 behind backdrop");
});
