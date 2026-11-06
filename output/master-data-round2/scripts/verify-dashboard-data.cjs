// Dashboard data fixes (dev server on 3000, local backend, real login): the numbers on the page against the same tickets read from the
// app's own cache, the two ticket lists, the per-person recap, the monitoring list, the local-data notice, and the per-user local data.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split("\n").map(l => l.trim()).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const [first, second] = users.filter(u => u.role_id === "1" && u.email);
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/data-";
async function login(page, account) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 });
  await page.waitForFunction(() => /Menampilkan\s+\d+\s+dari\s+[1-9]/.test(document.body.textContent), null, { timeout: 120000 });
  await page.waitForTimeout(2500);
}
const expected = page => page.evaluate(() => {
  const tickets = (JSON.parse(sessionStorage.getItem("ctd.backendTickets.v1") || "{}").tickets) || [];
  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const done = t => ["closed", "ditutup"].includes((t.status || "").toLowerCase()) || t.isStillOpen === false;
  const norm = s => (s || "").trim().replace(/\s+/g, " ").toLowerCase().replace(/^(mhd\.|m\.)\s+/, "");
  const people = {};
  for (const t of tickets) {
    const name = t.owner; if (!name || name === "—") continue;
    const p = (people[name] = people[name] || { today: 0, month: 0, year: 0, key: norm(name) });
    if (t.date === today) p.today++;
    if ((t.date || "").startsWith(today.slice(0, 7))) p.month++;
    if ((t.date || "").startsWith(today.slice(0, 4))) p.year++;
  }
  return { total: tickets.length, today, openedToday: tickets.filter(t => t.date === today).length, stillOpen: tickets.filter(t => !done(t)).length, statusOpenOldRule: tickets.filter(t => !["closed", "ditutup"].includes((t.status || "").toLowerCase())).length, people };
});
const monitoring = page => page.evaluate(() => ({
  ok: (document.querySelector(".mon-counter-badge.ok")?.textContent || "").replace(/\s+/g, " ").trim(),
  nok: (document.querySelector(".mon-counter-badge.nok")?.textContent || "").replace(/\s+/g, " ").trim(),
  assessed: (document.body.textContent.match(/Dinilai:\s*(\d+)\s+dari\s+(\d+)\s+Checkpoint/) || []).slice(1, 3).map(Number),
  rows: document.querySelectorAll("[aria-label='Checklist monitoring shift'] [role=listitem]").length,
  pending: document.querySelectorAll(".btn-pending").length,
}));
(async () => {
  const browser = await launch();
  if (process.env.WAIT) { console.log("(waiting 65 s for the backend's rate window)"); await new Promise(r => setTimeout(r, 65000)); }
  const page = await open(browser, { width: 1920, height: 1080, noAuth: true });
  page.setDefaultTimeout(90000);
  await login(page, first);
  const exp = await expected(page);
  console.log(`      (${exp.total} tickets in the app's cache; today is ${exp.today} in WIB; the old rule would have called ${exp.statusOpenOldRule} tickets open)`);

  // 1. the two lists
  const group = page.getByRole("group", { name: "Pilih daftar tiket" });
  const labels = (await group.getByRole("button").allInnerTexts()).map(t => t.replace(/\s+/g, " ").trim());
  ok(labels[0] === `Hari ini ${exp.openedToday}` && labels[1] === `Masih terbuka ${exp.stillOpen}`, "the panel counts what is opened today and what is really still open", labels.join(" | "));
  ok(exp.stillOpen < exp.statusOpenOldRule || exp.statusOpenOldRule === 0, "tickets with a completion time are no longer called open", `${exp.stillOpen} now, ${exp.statusOpenOldRule} by the old rule`);
  const heading = await page.locator("h2", { hasText: /Tiket (Hari Ini|Masih Terbuka)/ }).first().innerText();
  ok(/Tiket Hari Ini/.test(heading), "the panel opens on today's tickets", heading.trim());
  ok(exp.openedToday > 0 || await page.getByText("Belum ada tiket hari ini").count() >= 1, "no ticket today: the panel says so", `opened today: ${exp.openedToday}`);
  await group.getByRole("button", { name: /Masih terbuka/ }).click(); await page.waitForTimeout(600);
  const badge = (await page.locator(".ops-count-badge").first().innerText()).trim();
  ok(badge === `${exp.stillOpen} tiket`, "the open list shows exactly the open tickets", badge);
  await group.getByRole("button", { name: /Hari ini/ }).click(); await page.waitForTimeout(400);

  // 2. the per-person recap against the tickets
  const cards = await page.evaluate(() => {
    const qualifies = el => /HARI INI/.test(el.textContent) && /BULAN INI/.test(el.textContent) && /TAHUN INI/.test(el.textContent);
    return [...document.querySelectorAll("div, article, li")].filter(el => qualifies(el) && el.textContent.length < 700 && ![...el.children].some(qualifies)).map(el => { let node = el; for (let i = 0; i < 6 && node.parentElement && !/Detail/.test(node.textContent); i++) node = node.parentElement; return node.innerText.replace(/\s+/g, " ").trim(); });
  });
  console.log("      first cards:", JSON.stringify(cards.slice(0, 2).map(t => t.slice(0, 110))), "| owners in tickets:", Object.keys(exp.people).length, JSON.stringify(Object.keys(exp.people).slice(0, 4)));
  let compared = 0, wrong = [];
  for (const text of cards) {
    const name = Object.keys(exp.people).find(n => text.includes(n));
    const m = text.match(/HARI INI\s+(\d+)\s+BULAN INI\s+(\d+)\s+TAHUN INI\s+(\d+)/);
    if (!name || !m) continue;
    compared++;
    const want = exp.people[name];
    if (+m[1] !== want.today || +m[2] !== want.month || +m[3] !== want.year) wrong.push(`${name}: page ${m.slice(1, 4)} vs tickets ${want.today},${want.month},${want.year}`);
  }
  ok(compared >= 3 && wrong.length === 0, `the recap shows each person's own ticket counts (${compared} cards compared)`, wrong.slice(0, 2).join(" ; "));
  ok(!cards.some(t => /BULAN INI\s+(34|42|35|31)\s+TAHUN INI\s+(220|270|215|195)/.test(t)), "none of the old made-up baselines (34/220, 42/270...) is on the page");
  const shifter = await page.getByLabel("Filter Shifter / PIC").first().innerText().catch(() => "");
  console.log("      shifter filter:", shifter.replace(/\s+/g, " ").trim(), "| recap cards:", cards.length);

  if (process.env.ONLY_RECAP) { await browser.close(); return; }

  // 3. the monitoring list and the notice
  let mon = await monitoring(page);
  ok(mon.rows > 0 && mon.assessed[0] === 0 && mon.assessed[1] === mon.rows && mon.pending === mon.rows, "nothing assessed yet: every checkpoint says 'Belum', no made-up OK/NOK", JSON.stringify(mon));
  ok(await page.getByRole("note").filter({ hasText: "Memo & Catatan Shift dan List Monitoring Shift belum tersambung ke backend" }).count() === 1, "the dashboard says which parts are only in this browser");
  await page.screenshot({ path: OUT + "dashboard.png" });

  // 4. a verdict given on the Monitoring page shows on the dashboard (read only there)
  await page.getByRole("link", { name: "Monitoring", exact: true }).first().click();
  await page.getByRole("button", { name: "Tandai checkpoint sebagai OK" }).first().waitFor();
  await page.getByRole("button", { name: "Tandai checkpoint sebagai OK" }).first().click(); await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Dashboard", exact: true }).first().click();
  await page.locator("[aria-label='Checklist monitoring shift']").waitFor(); await page.waitForTimeout(1500);
  mon = await monitoring(page);
  ok(/^1 OK$/.test(mon.ok) && mon.assessed[0] === 1 && mon.pending === mon.rows - 1, "the verdict from the Monitoring page is on the dashboard", JSON.stringify(mon));
  ok(await page.locator("[aria-label='Checklist monitoring shift'] button").count() === 0, "and it cannot be changed from the dashboard");

  // 5. another person on the same browser does not see it, and gets it back for the first one
  console.log("      (waiting 65 s for the backend's rate window)"); await page.waitForTimeout(65000);
  await page.context().clearCookies(); await page.evaluate(() => sessionStorage.clear());
  await login(page, second);
  mon = await monitoring(page);
  ok(/^0 OK$/.test(mon.ok) && mon.assessed[0] === 0, "a second person on the same browser starts clean", JSON.stringify(mon));
  const stashed = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("ctd.stash.")));
  ok(stashed.some(k => k.endsWith(".ctd.checkpoints")), "the first person's verdicts are kept, not deleted", stashed.join(", "));
  console.log("      (waiting 65 s for the backend's rate window)"); await page.waitForTimeout(65000);
  await page.context().clearCookies(); await page.evaluate(() => sessionStorage.clear());
  await login(page, first);
  mon = await monitoring(page);
  ok(/^1 OK$/.test(mon.ok), "the first person gets their verdict back", JSON.stringify(mon));

  const errors = page.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e));
  ok(errors.length === 0, "no console errors", JSON.stringify(errors.slice(0, 3)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 500)); process.exitCode = 1; });
