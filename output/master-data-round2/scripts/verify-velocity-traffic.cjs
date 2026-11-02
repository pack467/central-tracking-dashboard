// Dashboard "Tren Durasi Penyelesaian" and "Tren Trafik Beban per Shift": drawn 1:1, grouped by week/month on long ranges,
// and the shift totals cover the whole filtered range. Dev server on 3000 with the local backend (real login).
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const WIDTH = Number(process.env.W || 1920);
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/";
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split("\n").map(l => l.trim()).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
const CASES = (process.env.CASES || "month=2026-09-01..2026-09-30,user=2026-06-01..2026-09-01,all=all").split(",").map(c => c.split("="));
async function load(page, date) {
  await page.goto(`${BASE}/dashboard${date ? "?date=" + date : ""}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => /Menampilkan\s+\d+\s+dari\s+[1-9]/.test(document.body.textContent), null, { timeout: 120000 });
  await page.waitForTimeout(1500);
}
const shape = (page, selector) => page.locator(selector).evaluate(el => {
  const svg = el.querySelector("svg.compact-velocity-chart-svg, svg.compact-shift-traffic-chart-svg"); const box = svg.getBoundingClientRect(); const vb = svg.getAttribute("viewBox").split(" ").map(Number);
  const labels = [...el.querySelectorAll("svg.compact-velocity-chart-svg > g text, .shift-traffic-x-label")].map(t => t.getBoundingClientRect()).filter(r => r.width > 0 && r.top > box.top + box.height - 34).sort((a, b) => a.left - b.left);
  let overlaps = 0; for (let i = 1; i < labels.length; i++) if (labels[i].left < labels[i - 1].right - 1) overlaps++;
  return { scaleX: +(box.width / vb[2]).toFixed(3), scaleY: +(box.height / vb[3]).toFixed(3), points: el.querySelectorAll(".velocity-node-dot").length || el.querySelectorAll(".shift-traffic-node-dot").length / 3, labels: labels.length, overlaps, note: (el.querySelector("[role=note]")?.innerText || "").replace(/\s+/g, " ") };
});
(async () => {
  const browser = await launch();
  if (process.env.WAIT) { console.log("      (waiting 65 s for the backend's rate window)"); await new Promise(r => setTimeout(r, 65000)); }
  const page = await open(browser, { width: WIDTH, height: WIDTH < 600 ? 844 : 1080, noAuth: true });
  page.setDefaultTimeout(90000);
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 });
  for (const [name, date] of CASES) {
    await load(page, date);
    const shown = Number((await page.evaluate(() => document.body.textContent.match(/Menampilkan\s+(\d+)\s+dari/)[1])));
    const v = await shape(page, "article.mgmt-velocity-panel");
    ok(Math.abs(v.scaleX - 1) < 0.01 && Math.abs(v.scaleY - 1) < 0.01 && v.overlaps === 0 && v.points > 0, `${WIDTH} ${name}: velocity drawn 1:1, ${v.points} points, no label overlap`, JSON.stringify(v));
    const t = await shape(page, "article.shift-traffic-panel");
    ok(Math.abs(t.scaleX - 1) < 0.01 && Math.abs(t.scaleY - 1) < 0.01 && t.overlaps === 0, `${WIDTH} ${name}: traffic drawn 1:1, ${t.points} points, no label overlap`, JSON.stringify(t));
    const totals = await page.locator("article.shift-traffic-panel .shift-traffic-metric-val").allInnerTexts();
    const sum = totals.slice(0, 3).map(s => parseInt(s, 10)).reduce((a, b) => a + b, 0);
    ok(sum === shown, `${WIDTH} ${name}: the three shift totals add up to the filtered ticket count (${shown})`, totals.slice(0, 3).join(" + ").replace(/\s+/g, " "));
    await page.locator("article.mgmt-velocity-panel").screenshot({ path: `${OUT}velocity-${name}-${WIDTH}.png` });
    await page.locator("article.shift-traffic-panel").screenshot({ path: `${OUT}traffic-${name}-${WIDTH}.png` });
  }
  const errors = page.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e));
  ok(errors.length === 0, "no console errors", JSON.stringify(errors.slice(0, 2)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
