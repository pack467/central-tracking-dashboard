import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

test("1. Data Access Layer & Environment Configuration", () => {
  // Check .env.example
  const envExamplePath = path.join(ROOT, ".env.example");
  assert.ok(fs.existsSync(envExamplePath), ".env.example must exist");
  const envContent = fs.readFileSync(envExamplePath, "utf-8");
  assert.ok(envContent.includes("NEXT_PUBLIC_API_URL"), "contains NEXT_PUBLIC_API_URL");
  assert.ok(envContent.includes("NEXT_PUBLIC_USE_MOCK"), "contains NEXT_PUBLIC_USE_MOCK");
  assert.ok(envContent.includes("NEXT_PUBLIC_MOCK_DELAY_MIN"), "contains NEXT_PUBLIC_MOCK_DELAY_MIN");
  assert.ok(envContent.includes("NEXT_PUBLIC_API_TIMEOUT_MS"), "contains NEXT_PUBLIC_API_TIMEOUT_MS");

  // Check config parser
  const configPath = path.join(ROOT, "app", "lib", "config.ts");
  assert.ok(fs.existsSync(configPath), "app/lib/config.ts must exist");
  const configContent = fs.readFileSync(configPath, "utf-8");
  assert.ok(configContent.includes("isMockMode"), "config exports isMockMode");
  assert.ok(configContent.includes("getApiUrl"), "config exports getApiUrl");
  assert.ok(configContent.includes("getMockDelay"), "config exports getMockDelay");
});

test("2. API Client & Error Normalization", () => {
  const clientPath = path.join(ROOT, "app", "lib", "api", "client.ts");
  const errorsPath = path.join(ROOT, "app", "lib", "api", "errors.ts");
  assert.ok(fs.existsSync(clientPath), "api/client.ts must exist");
  assert.ok(fs.existsSync(errorsPath), "api/errors.ts must exist");

  const clientContent = fs.readFileSync(clientPath, "utf-8");
  assert.ok(clientContent.includes("AbortController"), "client implements AbortController");
  assert.ok(clientContent.includes("onUnauthorized"), "client handles 401 callback");
  assert.ok(clientContent.includes("buildQueryString"), "client implements safe query string builder");

  const errorsContent = fs.readFileSync(errorsPath, "utf-8");
  assert.ok(errorsContent.includes("class ApiError"), "ApiError class is defined");
  assert.ok(errorsContent.includes("isApiError"), "isApiError type guard is exported");
  assert.ok(errorsContent.includes("isAbortError"), "isAbortError type guard is exported");
});

test("3. Domain Services & NestJS DTO Types", () => {
  const serviceFiles = [
    "tickets.ts",
    "monitoring.ts",
    "shift-log.ts",
    "roster.ts",
    "reports.ts",
    "runbooks.ts",
    "dashboard.ts",
    "mock-adapter.ts",
  ];
  for (const file of serviceFiles) {
    const fullPath = path.join(ROOT, "app", "services", file);
    assert.ok(fs.existsSync(fullPath), `Service file ${file} must exist`);
  }

  const typeFiles = [
    "api.ts",
    "ticket.ts",
    "monitoring.ts",
    "shift.ts",
    "roster.ts",
    "reports.ts",
    "runbooks.ts",
    "dashboard.ts",
  ];
  for (const file of typeFiles) {
    const fullPath = path.join(ROOT, "app", "types", file);
    assert.ok(fs.existsSync(fullPath), `Type DTO file ${file} must exist`);
  }
});

test("4. Skeleton UI Primitives & Zero Layout Shift Structure", () => {
  const skeletonDir = path.join(ROOT, "app", "components", "ui", "skeleton");
  const primitives = [
    "Skeleton.tsx",
    "SkeletonText.tsx",
    "SkeletonAvatar.tsx",
    "SkeletonCard.tsx",
    "SkeletonTable.tsx",
    "SkeletonList.tsx",
    "SkeletonChart.tsx",
    "SkeletonKpi.tsx",
    "PanelSkeletonWrapper.tsx",
    "DashboardSkeleton.tsx",
    "TicketsTableSkeleton.tsx",
    "MonitoringScheduleSkeleton.tsx",
    "ShiftLogSkeleton.tsx",
    "ReportsSkeleton.tsx",
    "TeamRosterSkeleton.tsx",
    "RunbooksSkeleton.tsx",
  ];
  for (const file of primitives) {
    const fullPath = path.join(skeletonDir, file);
    assert.ok(fs.existsSync(fullPath), `Skeleton primitive ${file} must exist`);
  }

  // Check PanelSkeletonWrapper UX features
  const wrapperContent = fs.readFileSync(path.join(skeletonDir, "PanelSkeletonWrapper.tsx"), "utf-8");
  assert.ok(wrapperContent.includes('aria-busy="true"'), 'contains aria-busy="true"');
  assert.ok(wrapperContent.includes('aria-live="polite"'), 'contains aria-live="polite"');
  assert.ok(wrapperContent.includes('useDelayedFlag'), "uses useDelayedFlag for anti-flicker delay");
  assert.ok(wrapperContent.includes("Coba lagi"), "provides in-panel retry button for errors");
  assert.ok(wrapperContent.includes("opacity-60"), "supports SWR stale overlay without wiping data");
});

test("5. Theme CSS Shimmer Keyframes & Animation Tokens", () => {
  const themeCssPath = path.join(ROOT, "app", "styles", "theme.css");
  assert.ok(fs.existsSync(themeCssPath), "theme.css must exist");
  const themeCss = fs.readFileSync(themeCssPath, "utf-8");

  assert.ok(themeCss.includes("--animate-shimmer"), "theme defines --animate-shimmer");
  assert.ok(themeCss.includes("@keyframes skeletonShimmerTranslate"), "theme defines skeletonShimmerTranslate keyframes");
  assert.ok(themeCss.includes("prefers-reduced-motion"), "theme handles prefers-reduced-motion for shimmer");
});

test("6. UI Components Do Not Import Fetch Directly", () => {
  const componentsDir = path.join(ROOT, "app", "components");
  function checkDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) {
        checkDir(full);
      } else if (f.name.endsWith(".tsx") || f.name.endsWith(".ts")) {
        const content = fs.readFileSync(full, "utf-8");
        // Verify no direct fetch("http or fetch(`/
        const directFetchRegex = /\bfetch\s*\(\s*[`'"]/g;
        const matches = content.match(directFetchRegex);
        assert.equal(matches, null, `File ${full} must not call fetch directly!`);
      }
    }
  }
  checkDir(componentsDir);
});

test("7. PanelViewButton Disables During Loading", () => {
  const buttonPath = path.join(ROOT, "app", "components", "dashboard", "PanelViewButton.tsx");
  assert.ok(fs.existsSync(buttonPath), "PanelViewButton.tsx must exist");
  const buttonContent = fs.readFileSync(buttonPath, "utf-8");
  assert.ok(buttonContent.includes("disabled"), "PanelViewButton supports disabled prop");
  assert.ok(buttonContent.includes('aria-disabled={disabled ? "true" : undefined}'), "PanelViewButton sets aria-disabled");
});

test("8. Backend Integration Documentation Exists", () => {
  const docPath = path.join(ROOT, "..", "docs", "backend-integration.md");
  assert.ok(fs.existsSync(docPath), "docs/backend-integration.md must exist");
  const doc = fs.readFileSync(docPath, "utf-8");
  assert.ok(doc.includes("Checklist"), "contains integration checklist");
  assert.ok(doc.includes("NEXT_PUBLIC_USE_MOCK=false"), "contains toggle instructions");
  assert.ok(doc.includes("Kontrak Endpoint"), "contains proposed API endpoints table");
  assert.ok(doc.includes("CORS"), "contains backend CORS guidance");
});
