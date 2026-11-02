// Real backend through the test proxy (3100): accounts below admin (AGENT, VIEWER) may read users but not roles (GET /roles is 403 for them).
// The people list, the roster and the tickets must still work, and the Peran screen must say why it is empty.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = "http://localhost:3100";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
(async () => {
  const browser = await launch();
  for (const [roleId, label] of [["4", "AGENT"], ["5", "VIEWER"]]) {
    const account = users.find(u => u.role_id === roleId && u.email);
    const page = await open(browser, { width: 1440, height: 900, noAuth: true });
    page.setDefaultTimeout(15000);
    const denied = [];
    page.on("response", r => { if (r.status() === 403) denied.push(r.url().split("/__api")[1]); });
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" }); await page.waitForTimeout(800);
    await page.getByLabel("Email atau ID Karyawan").fill(account.email);
    await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();
    await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 15000 }).catch(() => {});
    ok(new URL(page.url()).pathname === "/dashboard", `${label}: login`);

    await page.goto(`${BASE}/master-data?group=team&tab=people`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-master-id]:visible", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const people = await page.evaluate(() => ({ rows: document.querySelectorAll("tbody tr").length, text: document.body.innerText, stats: [...document.querySelectorAll("[data-master-data-v2] header [role=group] > *")].map(e => e.innerText.replace(/\s+/g, " ").trim()) }));
    ok(people.rows === 10, `${label}: Personel lists the users although /roles is refused`, `${people.rows} rows`);
    ok(!/tidak dapat dimuat/i.test(people.text), `${label}: no "cannot load" error`);
    ok(!people.stats.some(s => /Peran aktif/.test(s)), `${label}: no misleading "Peran aktif" number`, JSON.stringify(people.stats));
    ok(await page.getByRole("button", { name: /^Tambah Personel/ }).count() === 0, `${label}: no "Tambah Personel" button for someone who may not manage users`);
    ok(/Tidak tersedia/.test(people.text), `${label}: the role column says "Tidak tersedia" instead of staying blank`);
    ok(/Peran\s*–/.test(people.text), `${label}: the Peran tab shows a dash, not a 0`);
    ok(denied.some(u => u.startsWith("/roles")), `${label}: the backend did refuse /roles (so the case is real)`, denied.join(" "));
    await page.screenshot({ path: `E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/roles-denied-${label}.png` });

    await page.goto(`${BASE}/master-data?group=team&tab=roles`, { waitUntil: "networkidle" }); await page.waitForTimeout(1800);
    const rolesText = await page.locator("body").innerText();
    ok(/tidak memiliki izin untuk melihat daftar peran/i.test(rolesText), `${label}: Peran says they may not see it`);

    await page.goto(`${BASE}/team-roster`, { waitUntil: "networkidle" }); await page.waitForTimeout(2500);
    const roster = await page.locator("body").innerText();
    ok(/Agnes|Dimas|Pangondion/.test(roster) && !/Something went wrong|Application error/i.test(roster), `${label}: Team Roster renders`);

    await page.goto(`${BASE}/tickets`, { waitUntil: "networkidle" }); await page.waitForTimeout(2500);
    const tickets = await page.evaluate(() => document.body.innerText);
    ok(/\d+ tiket/.test(tickets) && !/tidak dapat dimuat/i.test(tickets), `${label}: tickets load`);
    await page.context().close();
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
