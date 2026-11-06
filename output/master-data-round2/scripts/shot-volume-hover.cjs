// A screenshot of the volume chart with the cursor on a bar, and a check that the highlight and the hidden date label show by CSS alone.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const DATE = process.env.DATE || "2026-09-01..2026-09-30";
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split("\n").map(l => l.trim()).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await launch();
  if (process.env.WAIT) { console.log("(waiting 65 s for the backend's rate window)"); await new Promise(r => setTimeout(r, 65000)); }
  const page = await open(browser, { width: 1920, height: 1080, noAuth: true });
  page.setDefaultTimeout(90000);
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 });
  await page.goto(`${BASE}/dashboard?date=${DATE}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => /Menampilkan\s+\d+\s+dari\s+[1-9]/.test(document.body.textContent), null, { timeout: 120000 });
  await page.waitForTimeout(2000);
  const panel = page.locator("article.primary-chart-panel");
  await panel.scrollIntoViewIfNeeded();
  const state = (i) => panel.evaluate((el, index) => {
    const g = el.querySelectorAll(".stacked-bar-group")[index];
    const col = g.querySelector("rect.opacity-0");
    const texts = [...g.querySelectorAll("text")];
    const label = texts[texts.length - 1];
    return { column: col ? +getComputedStyle(col).opacity : null, label: label ? +getComputedStyle(label).opacity : null, text: label ? label.textContent : null };
  }, i);
  const bars = panel.locator(".stacked-bar-group");
  const index = 5; // the 6th day: not one of the regularly labelled ones (every other day is)
  const before = await state(index);
  const box = await bars.nth(index).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 6); await page.waitForTimeout(400);
  const during = await state(index);
  await panel.screenshot({ path: "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/volume-hover.png" });
  await page.mouse.move(5, 5); await page.waitForTimeout(400);
  const after = await state(index);
  ok(before.column === 0 && during.column === 1 && after.column === 0, "the highlight column shows only while the cursor is on the bar", JSON.stringify({ before, during, after }));
  ok(before.label === 0 && during.label === 1 && after.label === 0, "a date label that is not one of the regular ones shows on hover and hides again");
  const errors = page.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e));
  ok(errors.length === 0, "no console errors", JSON.stringify(errors.slice(0, 2)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
