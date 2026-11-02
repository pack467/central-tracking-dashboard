// Dev server on 3000 (login, tickets, people, roles from the local backend): the dashboard's analytics filter defaults to today (WIB).
// The local data ends on 2026-10-04, so "today" (2026-10-30) is empty here; 2026-09-30 has 35 tickets.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/";
// waits until the page says "Menampilkan <expected> dari <total> Tiket": a render of all 3,649 tickets takes a moment
const shown = async (page, expected) => {
  const text = await page.waitForFunction(n => { const m = document.body.innerText.match(new RegExp("Menampilkan\\s+(" + n + ")\\s+dari\\s+(\\d+)\\s+Tiket")); return m ? m[0] : false; }, String(expected), { timeout: 90000 }).then(handle => handle.jsonValue()).catch(() => null);
  return text ? text.match(/Menampilkan\s+(\d+)\s+dari\s+(\d+)\s+Tiket/) : null;
};
const dateParam = page => new URL(page.url()).searchParams.get("date");
async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 }).catch(() => {});
}
async function load(page, query = "") {
  await page.goto(`${BASE}/dashboard${query}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByText("Menampilkan").first().waitFor({ state: "attached", timeout: 90000 });
  await page.waitForTimeout(1500);
}
const picker = page => page.getByRole("button", { name: "Filter tanggal analitik tiket" });
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1920, height: 1080, noAuth: true });
  page.setDefaultTimeout(60000);
  await login(page);
  ok(new URL(page.url()).pathname === "/dashboard", "login");

  // a. the default
  await load(page);
  let m = await shown(page, 0);
  ok(m && m[1] === "0" && m[2] === "3649", "a plain /dashboard filters to today: 0 of 3,649 (no ticket today in the local data)", m && m[0]);
  ok((await picker(page).innerText()).includes("30 Oktober 2026"), "the date filter shows today's date, not the word 'today'", (await picker(page).innerText()).trim());
  ok(await page.getByRole("button", { name: /Reset Filter/ }).count() === 0, "no 'Reset Filter' while the filter is the default");
  ok(await page.getByText("Belum ada tiket hari ini").count() >= 1 && await page.getByRole("button", { name: "Lihat 7 hari terakhir" }).count() === 1, "the empty volume chart says so and offers the last 7 days");
  ok(dateParam(page) === null, "the URL carries no date for the default");

  // b. all time is one click away, and Reset goes back
  await picker(page).click(); await page.waitForTimeout(500);
  const presets = await page.getByLabel("Preset rentang tanggal").getByRole("button").allInnerTexts();
  ok(presets.map(t => t.trim()).includes("Semua Waktu") && presets.map(t => t.trim()).includes("Hari Ini"), "the picker offers 'Hari Ini' and 'Semua Waktu'", presets.join(" | "));
  await page.getByLabel("Preset rentang tanggal").getByRole("button", { name: "Semua Waktu" }).click(); await page.waitForTimeout(800);
  m = await shown(page, 3649);
  ok(dateParam(page) === "all" && m && m[1] === "3649", "'Semua Waktu' shows every ticket and is in the URL as date=all", `${dateParam(page)} | ${m && m[0]}`);
  await page.getByRole("button", { name: /Reset Filter/ }).first().waitFor({ timeout: 60000 }).catch(() => {});
  ok(await page.getByRole("button", { name: /Reset Filter/ }).count() >= 1, "'Reset Filter' appears when the filter is not the default");
  await page.getByRole("button", { name: /Reset Filter/ }).first().click(); await page.waitForTimeout(800);
  m = await shown(page, 0);
  ok(dateParam(page) === null && m && m[1] === "0", "'Reset Filter' returns to today", `${dateParam(page)} | ${m && m[0]}`);
  // choosing "Hari Ini" from another range is the default again, not ?date=2026-10-30
  await picker(page).click(); await page.waitForTimeout(400);
  await page.getByLabel("Preset rentang tanggal").getByRole("button", { name: "Bulan Lalu" }).click(); await page.waitForTimeout(1500);
  ok(/^2026-09-01\.\.2026-09-30$/.test(dateParam(page) || ""), "'Bulan Lalu' gives the September range", String(dateParam(page)));
  await picker(page).click(); await page.waitForTimeout(400);
  await page.getByLabel("Preset rentang tanggal").getByRole("button", { name: "Hari Ini" }).click(); await page.waitForTimeout(1500);
  ok(dateParam(page) === null, "picking 'Hari Ini' puts the default back (nothing in the URL)", String(dateParam(page)));

  // c. links and bad values. The backend allows 100 requests a minute per address and a full ticket load is 37: let the window reset first,
  // as the earlier steps spent the cached copy (it lives 3 minutes).
  console.log("      (waiting 65 s for the backend's rate window)"); await page.waitForTimeout(65000);
  await load(page, "?date=2026-09-30");
  m = await shown(page, 35);
  ok(m && m[1] === "35", "?date=2026-09-30 shows that day (35 tickets)", m && m[0]);
  await page.screenshot({ path: OUT + "dashboard-day.png" });
  await load(page, "?date=2026-09-01..2026-09-30");
  m = await shown(page, 442);
  ok(m && m[1] === "442", "an old range link still works (442 tickets)", m && m[0]);
  await load(page, "?date=bogus");
  m = await shown(page, 0);
  ok(m && m[1] === "0" && dateParam(page) === null, "an invalid date falls back to today and is cleaned from the URL", `${m && m[0]} | ${dateParam(page)}`);
  await load(page, "?date=all");
  m = await shown(page, 3649);
  ok(m && m[1] === "3649", "?date=all still gives the full view for anyone who wants it", m && m[0]);

  // d. a day with data: charts draw, the expanded panel opens
  await load(page, "?date=2026-09-30");
  await page.getByRole("button", { name: /Perbesar panel Tren Durasi/ }).first().click().catch(() => {}); await page.waitForTimeout(2500);
  ok(await page.locator("vite-error-overlay").count() === 0 && !/Something went wrong|Application error/i.test(await page.locator("body").innerText()), "the expanded panel opens for a single day without an error");
  await page.keyboard.press("Escape");

  // e. the same, in the empty "today": expanded panel too
  await load(page);
  await page.getByRole("button", { name: /Perbesar panel Tren Durasi/ }).first().click().catch(() => {}); await page.waitForTimeout(2500);
  ok(await page.locator("vite-error-overlay").count() === 0 && !/Something went wrong|Application error/i.test(await page.locator("body").innerText()), "the expanded panel opens for an empty today without an error");
  await page.keyboard.press("Escape");

  // f. a dashboard left open across midnight WIB moves to the new day by itself
  await page.clock.install({ time: new Date("2026-10-30T16:59:40Z") }); // 23:59:40 WIB
  await load(page);
  ok((await picker(page).innerText()).includes("30 Oktober 2026"), "before midnight the filter says 30 Oktober 2026");
  await page.clock.runFor(30000);
  await page.waitForTimeout(800);
  ok((await picker(page).innerText()).includes("31 Oktober 2026"), "after midnight WIB the same open page says 31 Oktober 2026 by itself", (await picker(page).innerText()).trim());
  await page.close();

  // g. phone width (a new browser context logs in and loads all tickets again: wait for the rate window)
  console.log("      (waiting 65 s for the backend's rate window)"); await new Promise(resolve => setTimeout(resolve, 65000));
  const phone = await open(browser, { width: 390, height: 844, noAuth: true });
  phone.setDefaultTimeout(60000);
  await login(phone);
  await load(phone);
  ok(await phone.getByText("Belum ada tiket hari ini").count() >= 1, "phone: the default is today and the empty chart says so");
  await phone.screenshot({ path: OUT + "dashboard-today-phone.png" });
  await load(phone, "?date=all");
  ok((await phone.locator("body").innerText()).includes("Semua Waktu"), "phone: the active filter chip says 'Semua Waktu'");
  const errors = phone.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e));
  ok(errors.length === 0, "no console errors", JSON.stringify(errors.slice(0, 2)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
