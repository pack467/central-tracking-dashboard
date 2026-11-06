// The user's dev server on 3000 (hybrid: login, tickets, people, roles from the local backend): log in and walk the main pages.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = "http://localhost:3000";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900, noAuth: true });
  page.setDefaultTimeout(60000);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1500);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 60000 }).catch(() => {});
  ok(new URL(page.url()).pathname === "/dashboard", "login on the dev server", page.url().replace(BASE, ""));
  const bad = [];
  for (const url of ["/dashboard", "/tickets", "/monitoring", "/shift-log", "/reports", "/team-roster", "/master-data?group=team&tab=people", "/notifications", "/profile"]) {
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {}); await page.waitForTimeout(1500);
    const text = await page.locator("body").innerText().catch(() => "");
    const overlay = await page.locator("vite-error-overlay").count();
    if (overlay || /Something went wrong|Application error|Cannot read properties/i.test(text)) bad.push(url);
  }
  ok(bad.length === 0, "9 pages render without an error page or Vite overlay", bad.join(", "));
  await page.screenshot({ path: "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/dev-3000-dashboard.png" });
  const errors = page.errors.filter(e => !/favicon|401|Failed to load resource/.test(e));
  ok(errors.length === 0, "no console errors", JSON.stringify(errors.slice(0, 3)).slice(0, 300));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
