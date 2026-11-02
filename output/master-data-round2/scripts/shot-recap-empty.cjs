// Dashboard: the per-user recap (strip, bars, "Saat ini" chips) and the empty Velocity / Traffic panels, on desktop and phone.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r6/recap-";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split("\n").map(l => l.trim()).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
async function load(page, date) {
  await page.goto(`${BASE}/dashboard${date ? "?date=" + date : ""}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => /Menampilkan\s+\d+\s+dari\s+[1-9]/.test(document.body.textContent), null, { timeout: 120000 });
  await page.waitForTimeout(1200);
}
(async () => {
  const browser = await launch();
  if (process.env.WAIT) { console.log("      (waiting 65 s for the backend's rate window)"); await new Promise(r => setTimeout(r, 65000)); }
  const page = await open(browser, { width: 1920, height: 1000, noAuth: true });
  page.setDefaultTimeout(60000);
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 });

  await load(page, "");
  const recap = page.locator("article.user-summary-panel");
  const strip = ""; ok(await recap.locator(".user-recap-strip").count() === 0, "the summary strip is gone");
  
  const card = (await recap.locator(".user-summary-card").first().textContent()).replace(/\s+/g, " ");
  ok(/Total Tiket/.test(card) && /Tiket Saat Ini/.test(card), "a recap row labels Total Tiket and Tiket Saat Ini", card);
  await recap.screenshot({ path: OUT + "panel-1920.png" });
  const velocity = page.locator("article", { has: page.getByText("Tren Durasi Penyelesaian", { exact: false }) }).last();
  const traffic = page.locator("article.shift-traffic-panel");
  for (const [name, panel] of [["velocity", velocity], ["traffic", traffic]]) {
    const empty = panel.locator(".chart-empty-hint");
    ok(await empty.count() === 1 && /Belum ada tiket hari ini/.test(await empty.textContent()) && await empty.getByRole("button", { name: "Lihat 7 hari terakhir" }).count() === 1, `${name}: the empty state has a headline and 'Lihat 7 hari terakhir'`);
    const c = await panel.evaluate(el => { const b = el.getBoundingClientRect(), h = el.querySelector(".chart-empty-hint [aria-hidden=true]").getBoundingClientRect(); return { panel: Math.round(b.left + b.width / 2), icon: Math.round(h.left + h.width / 2) }; });
    ok(Math.abs(c.panel - c.icon) <= 4, `${name}: centred`, JSON.stringify(c));
    await panel.screenshot({ path: OUT + name + "-empty-1920.png" });
  }
  await traffic.getByRole("button", { name: "Lihat 7 hari terakhir" }).click();
  await page.waitForTimeout(1200);
  ok(new URL(page.url()).searchParams.get("date") !== null, "the button switches the range", page.url());

  await load(page, "all");
  await recap.screenshot({ path: OUT + "panel-all-1920.png" });
  const errors = page.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e));
  ok(errors.length === 0, "no console errors", JSON.stringify(errors.slice(0, 2)));

  await page.setViewportSize({ width: 390, height: 844 });
  await load(page, "");
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "phone: no sideways scroll");
  await recap.screenshot({ path: OUT + "panel-390.png" });
  await traffic.screenshot({ path: OUT + "traffic-empty-390.png" });
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
