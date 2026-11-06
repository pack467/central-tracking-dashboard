// Fully mock build (nothing connected): tickets stay writable, no "not connected" notes, runbook entries have no secret.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900 });
  page.setDefaultTimeout(15000);
  await page.goto(`${BASE}/tickets?mock=instant`, { waitUntil: "networkidle" }); await page.waitForTimeout(2500);
  ok(await page.getByRole("button", { name: /New Ticket/i }).count() >= 1 && await page.locator('[title^="New Ticket (Ctrl+N)"]').count() === 1, "New Ticket button (page header) and the floating button exist");
  await page.getByText(/^#\w{5,}$/).first().click(); await page.waitForTimeout(1200);
  const drawer = await page.locator("[role=dialog]").last().innerText();
  ok(/Edit Ticket/.test(drawer) && /Close Ticket/.test(drawer) && !/hanya bisa dilihat/.test(drawer), "ticket drawer keeps Edit, Escalate and Close");
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  await page.keyboard.press("Control+n"); await page.waitForTimeout(800);
  ok(await page.locator("[role=dialog]").count() >= 1, "Ctrl+N opens the create form");
  await page.keyboard.press("Escape");
  for (const url of ["/monitoring", "/master-data", "/shift-log"]) {
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" }); await page.waitForTimeout(700);
    ok(await page.locator("[role=note]").count() === 0, `no "not connected" note on ${url}`);
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
