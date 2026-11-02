// Two tabs of one browser (same cookie jar), real backend through the test proxy: logging out in one sends the other to /login within a moment.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = "http://localhost:3100";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
(async () => {
  const browser = await launch();
  const a = await open(browser, { width: 1440, height: 900, noAuth: true });
  const context = a.context();
  a.setDefaultTimeout(15000);
  const b = await context.newPage(); b.setDefaultTimeout(15000);
  // tab B waits on the login page
  await b.goto(`${BASE}/login`, { waitUntil: "networkidle" }); await b.waitForTimeout(800);
  // tab A logs in
  await a.goto(`${BASE}/login`, { waitUntil: "networkidle" }); await a.waitForTimeout(800);
  await a.getByLabel("Email atau ID Karyawan").fill(account.email);
  await a.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await a.getByRole("button", { name: "Masuk" }).click();
  await a.waitForURL(u => u.pathname === "/dashboard", { timeout: 20000 }).catch(() => {});
  ok(new URL(a.url()).pathname === "/dashboard", "tab A: logged in");
  // (the login page does not move a visitor on by itself when a session appears; only logout is synced)
  // tab B is now in the app; tab A logs out
  await b.goto(`${BASE}/tickets`, { waitUntil: "networkidle" }); await b.waitForTimeout(1500);
  ok(new URL(b.url()).pathname === "/tickets", "tab B: on /tickets with the shared session");
  await a.locator('aside [aria-haspopup="true"], nav ~ * [aria-haspopup="true"], [aria-haspopup="true"]').first().click();
  await a.getByRole("menuitem", { name: /Keluar Sesi/ }).click();
  const t1 = Date.now();
  await b.waitForURL(u => u.pathname === "/login", { timeout: 8000 }).catch(() => {});
  ok(new URL(b.url()).pathname === "/login", "tab B goes to /login after tab A logged out (without making any request of its own)", `${new URL(b.url()).pathname} after ${Date.now() - t1} ms`);
  const leftover = await b.evaluate(() => sessionStorage.getItem("ctd.backendTickets.v1"));
  ok(leftover === null, "tab B: the cached tickets are gone too");
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
