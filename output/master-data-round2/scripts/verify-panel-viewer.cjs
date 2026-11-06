// Expanded panels (?panel=ticket-volume|resolution-trend|shift-traffic): no touching bars, no overlapping axis labels, long ranges
// grouped per week or month, shift hours as the rest of the app. Dev server on 3000 with the local backend (real login).
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const WIDTH = Number(process.env.W || 1920);
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/viewer-";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split("\n").map(l => l.trim()).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
const CASES = (process.env.CASES || "month=2026-09-01..2026-09-30,user=2026-06-01..2026-09-01,all=all").split(",").map(c => c.split("="));
const PANELS = ["ticket-volume", "resolution-trend", "shift-traffic"];
const measure = page => page.evaluate(() => {
  const svg = [...document.querySelectorAll("main svg[role=img]")].find(s => s.getBoundingClientRect().width > 300);
  if (!svg) return null;
  const box = svg.getBoundingClientRect();
  const texts = [...svg.querySelectorAll("text")].map(t => t.getBoundingClientRect()).filter(r => r.width > 0 && r.top > box.bottom - 30).sort((a, b) => a.left - b.left);
  let labelOverlaps = 0; for (let i = 1; i < texts.length; i++) if (texts[i].left < texts[i - 1].right - 1) labelOverlaps++;
  // bars: the x extent of each bar group (first rect wider than 2px that is not a full-height highlight)
  const bars = [...svg.querySelectorAll("g.cursor-pointer")].map(g => [...g.querySelectorAll("rect")].map(r => r.getBoundingClientRect()).filter(r => r.height < box.height * 0.8 && r.width > 1)[0]).filter(Boolean).sort((a, b) => a.left - b.left);
  let barOverlaps = 0; for (let i = 1; i < bars.length; i++) if (bars[i].left < bars[i - 1].right - 0.5) barOverlaps++;
  const tag = (document.querySelector("main")?.innerText.match(/PER (HARI|MINGGU|BULAN)[^\n]*/) || [""])[0];
  return { labels: texts.length, labelOverlaps, bars: bars.length, barOverlaps, points: svg.querySelectorAll("circle").length, tag };
});
(async () => {
  const browser = await launch();
  if (process.env.WAIT) { console.log("      (waiting 65 s for the backend's rate window)"); await new Promise(r => setTimeout(r, 65000)); }
  const page = await open(browser, { width: WIDTH, height: 1080, noAuth: true });
  page.setDefaultTimeout(90000);
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 });
  for (const [name, date] of CASES) {
    for (const panel of PANELS) {
      await page.goto(`${BASE}/dashboard?date=${date}&panel=${panel}`, { waitUntil: "networkidle", timeout: 120000 });
      await page.waitForFunction(() => [...document.querySelectorAll("main svg[role=img]")].some(s => s.getBoundingClientRect().width > 300), null, { timeout: 120000 });
      await page.waitForTimeout(1500);
      const m = await measure(page);
      const good = m && m.labelOverlaps === 0 && m.barOverlaps === 0 && m.labels >= 2;
      ok(good, `${WIDTH} ${name} ${panel}: labels apart${panel === "ticket-volume" ? ", bars apart" : ""}`, JSON.stringify(m));
      // hover the middle of the plot: a tooltip with a period title
      const svg = page.locator("main svg[role=img]").first(); const box = await svg.boundingBox();
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5); await page.waitForTimeout(400);
      const tip = await page.locator("[data-chart-tooltip]").first().innerText().catch(() => "");
      if (name !== "month") ok(/–|Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember/.test(tip), `${WIDTH} ${name} ${panel}: the tooltip names the period`, tip.replace(/\s+/g, " ").slice(0, 80));
      await page.mouse.move(5, 5);
      await page.screenshot({ path: `${OUT}${panel}-${name}-${WIDTH}.png` });
      if (panel === "shift-traffic") ok(/08:00–16:30/.test(await page.locator("main").last().innerText()), `${WIDTH} ${name}: shift hours as the rest of the app (Pagi 08:00–16:30)`);
    }
  }
  const errors = page.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e));
  ok(errors.length === 0, "no console errors", JSON.stringify(errors.slice(0, 2)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
