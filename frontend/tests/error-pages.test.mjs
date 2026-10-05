import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { pathToFileURL } from "node:url";

const frontendRoot = resolve(import.meta.dirname, "..");

test("Config and component architecture exists and exports expected types/values", async () => {
  const configPath = resolve(frontendRoot, "app/lib/error-content.ts");
  const componentPath = resolve(frontendRoot, "app/components/ErrorState.tsx");
  const notFoundPath = resolve(frontendRoot, "app/not-found.tsx");
  const errorPath = resolve(frontendRoot, "app/error.tsx");
  const globalErrorPath = resolve(frontendRoot, "app/global-error.tsx");
  const dynamicErrorPath = resolve(frontendRoot, "app/error/[code]/page.tsx");
  const offlinePath = resolve(frontendRoot, "app/offline/page.tsx");

  assert.ok(existsSync(configPath), "error-content.ts must exist");
  assert.ok(existsSync(componentPath), "ErrorState.tsx must exist");
  assert.ok(existsSync(notFoundPath), "not-found.tsx must exist");
  assert.ok(existsSync(errorPath), "error.tsx must exist");
  assert.ok(existsSync(globalErrorPath), "global-error.tsx must exist");
  assert.ok(existsSync(dynamicErrorPath), "app/error/[code]/page.tsx must exist");
  assert.ok(existsSync(offlinePath), "app/offline/page.tsx must exist");

  const configModule = await import(pathToFileURL(configPath).href);
  const { errorContent, getErrorContent } = configModule;

  // Check required error codes exist
  const expectedCodes = ["400", "401", "403", "404", "429", "500", "502", "503", "504", "offline"];
  for (const code of expectedCodes) {
    assert.ok(errorContent[code], `errorContent must have code ${code}`);
    assert.ok(errorContent[code].title, `Code ${code} must have a title`);
    assert.ok(errorContent[code].description, `Code ${code} must have a description`);
    assert.ok(errorContent[code].primaryAction?.label, `Code ${code} must have a primaryAction label`);
  }

  // Check fallback for unknown code
  const unknownError = getErrorContent("999");
  assert.equal(unknownError.code, "999");
  assert.ok(unknownError.title);

  // Check global-error.tsx contains html and body tags
  const globalErrorContent = readFileSync(globalErrorPath, "utf8");
  assert.ok(globalErrorContent.includes("<html"), "global-error.tsx must render <html>");
  assert.ok(globalErrorContent.includes("<body"), "global-error.tsx must render <body>");
  assert.ok(globalErrorContent.includes("reset"), "global-error.tsx must accept reset");

  // Check error.tsx handles reset without leaking error message
  const errorContentCode = readFileSync(errorPath, "utf8");
  assert.ok(errorContentCode.includes('"use client"'));
  assert.ok(errorContentCode.includes("reset"));
  assert.ok(!errorContentCode.includes("error.message"), "error.tsx should not render raw error.message to user");
});

test("Server renders dynamic error routes (/error/[code]) for 400, 401, 403, 404, 429, 500, 503", async () => {
  const codes = ["400", "401", "403", "404", "429", "500", "503"];

  for (const code of codes) {
    const res = await fetch(`http://localhost:3000/error/${code}`);
    assert.equal(res.status, 200, `/error/${code} should respond with 200`);

    const html = await res.text();
    assert.ok(html.includes(code), `/error/${code} should display error code ${code}`);
    assert.ok(html.includes("TRACKING DASHBOARD"), `/error/${code} should have brand lockup`);
    assert.ok(!html.includes("HUTABYTE NOC"), `/error/${code} should not show the NOC chip`);
  }
});

test("Server renders /offline page with 200 status and offline elements", async () => {
  const res = await fetch("http://localhost:3000/offline");
  assert.equal(res.status, 200, "/offline should respond with 200");

  const html = await res.text();
  assert.ok(html.includes("Tidak ada koneksi"), "/offline should render offline title");
  assert.ok(html.includes("Muat Ulang"), "/offline should render retry button");
});

test("Server renders 404 page for unknown non-existent routes", async () => {
  const res = await fetch("http://localhost:3000/non-existent-random-route-xyz");
  assert.equal(res.status, 404, "Unknown route should return 404");

  const html = await res.text();
  assert.ok(html.includes("404"), "404 page should include 404");
  assert.ok(html.includes("Halaman tidak ditemukan"), "404 page should include not found text");
  assert.ok(html.includes("Kembali"), "404 page should have a Kembali action");
  assert.equal((html.match(/es-btn /g) || []).length, 1, "404 page should have exactly one button");
});
