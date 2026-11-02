// Dashboard "Ticket Volume per Project": drawn in real pixels, days -> weeks -> months as the range grows, centred empty state.
// Dev server on 3000 with the local backend (real login). Waits for the backend's 100 requests/minute window before each login.
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/volume-";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split("\n").map(l => l.trim()).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
const rateWindow = () => { console.log("      (waiting 65 s for the backend's rate window)"); return new Promise(r => setTimeout(r, 65000)); };
async function login(page) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 });
}
async function load(page, date) {
  await page.goto(`${BASE}/dashboard${date ? "?date=" + date : ""}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => /Menampilkan\s+\d+\s+dari\s+[1-9]/.test(document.body.textContent), null, { timeout: 120000 });
  await page.waitForTimeout(1200);
}
const panel = page => page.locator("article.primary-chart-panel");
const geometry = page => panel(page).evaluate(el => {
  const svg = el.querySelector(".compact-svg-barchart-wrap svg"); const box = svg && svg.getBoundingClientRect();
  const vb = svg && svg.getAttribute("viewBox").split(" ").map(Number);
  // labels that are hidden until hover (opacity 0) are not on screen, so they cannot overlap
  // axis labels live in the drawing layer (.stacked-bar); the hover layer (.stacked-bar-group) only holds hidden tooltips
  const labels = [...el.querySelectorAll(".stacked-bar text")].filter(t => getComputedStyle(t).opacity !== "0" && getComputedStyle(t).display !== "none").map(t => t.getBoundingClientRect()).filter(r => r.width > 0);
  const xLabels = labels.filter(r => Math.abs(r.top - Math.max(...labels.map(l => l.top))) < 2).sort((a, b) => a.left - b.left);
  let overlaps = 0; for (let i = 1; i < xLabels.length; i++) if (xLabels[i].left < xLabels[i - 1].right) overlaps++;
  return { width: box && Math.round(box.width), bars: el.querySelectorAll(".stacked-bar-group").length, scaleX: box && +(box.width / vb[2]).toFixed(3), scaleY: box && +(box.height / vb[3]).toFixed(3), scrolls: svg.parentElement.scrollWidth > svg.parentElement.clientWidth + 1, overlaps, note: (el.querySelector("[role=note]")?.innerText || "").replace(/s+/g, " ") };
});
(async () => {
  const browser = await launch();
  await rateWindow();
  const page = await open(browser, { width: 1366, height: 900, noAuth: true });
  page.setDefaultTimeout(60000);
  await login(page);

  // the empty "today" is centred in the panel body
  await load(page, "");
  const centre = await panel(page).evaluate(el => {
    const body = el.querySelector(".report-panel-body").getBoundingClientRect(); const hint = el.querySelector(".chart-empty-hint").getBoundingClientRect();
    return { body: Math.round(body.top + body.height / 2), hint: Math.round(hint.top + hint.height / 2), bodyH: Math.round(body.height) };
  });
  ok(Math.abs(centre.body - centre.hint) <= 12, "the empty state sits in the middle of the panel body", JSON.stringify(centre));
  await panel(page).screenshot({ path: OUT + "today-1366.png" });

  // the shortcut changes the chart on the same page (the bars follow the filter, not only a fresh load)
  await page.getByRole("button", { name: "Lihat 7 hari terakhir" }).click();
  await page.waitForTimeout(1500);
  ok(await panel(page).locator(".chart-empty-hint").count() === 1 && /Tidak ada tiket pada rentang ini/.test(await panel(page).innerText()), "'Lihat 7 hari terakhir' re-filters the chart in place (local data has no ticket in the last 7 days)");

  for (const [name, date, bars, note] of [["week", "2026-09-28..2026-10-04", 7, false], ["month", "2026-09-01..2026-09-30", 30, false], ["quarter", "2026-07-01..2026-09-30", 14, true], ["all", "all", 18, true]]) {
    await load(page, date);
    const g = await geometry(page);
    ok(g.bars === bars && Math.abs(g.scaleX - 1) < 0.01 && Math.abs(g.scaleY - 1) < 0.01 && !g.scrolls && g.overlaps === 0 && Boolean(g.note) === note, `1366 ${name}: ${bars} bars drawn 1:1, no scroll, no label overlap${note ? ", with a note" : ""}`, JSON.stringify(g));
    await panel(page).screenshot({ path: OUT + name + "-1366.png" });
  }

  // a weekly bar opens its period, and the URL day stays a real date
  await load(page, "2026-07-01..2026-09-30");
  const bar = panel(page).locator(".stacked-bar-group").nth(1);
  ok(/6 Jul – 12 Jul 2026: 98 tiket/.test(await bar.getAttribute("aria-label")), "a weekly bar names its week", await bar.getAttribute("aria-label"));
  await bar.click(); await page.waitForTimeout(800);
  const card = await panel(page).locator(".chart-hover-popover").innerText().catch(() => "");
  ok(/Periode:\s*6 Jul – 12 Jul 2026/.test(card) && /98 Tiket/.test(card), "clicking it shows the week's detail", card.replace(/\s+/g, " ").slice(0, 120));
  ok(new URL(page.url()).searchParams.get("day") === "2026-07-06", "the URL keeps the week's first day", page.url());
  await bar.click(); await page.waitForTimeout(500);
  ok(await panel(page).locator(".chart-hover-popover").count() === 0, "clicking it again closes the detail");
  const errors = page.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e));
  ok(errors.length === 0, "no console errors", JSON.stringify(errors.slice(0, 2)));
  await page.close();

  // phone: the chart still scrolls sideways when needed, and long ranges are grouped too
  await rateWindow();
  const phone = await open(browser, { width: 390, height: 844, noAuth: true });
  phone.setDefaultTimeout(60000);
  await login(phone);
  await load(phone, "2026-07-01..2026-09-30");
  const pg = await geometry(phone);
  ok(pg.bars === 14, "phone: 92 days become 14 weeks", JSON.stringify(pg));
  await panel(phone).screenshot({ path: OUT + "quarter-390.png" });
  await load(phone, "");
  ok(await panel(phone).getByText("Belum ada tiket hari ini").count() === 1, "phone: the empty state");
  await panel(phone).screenshot({ path: OUT + "today-390.png" });
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
