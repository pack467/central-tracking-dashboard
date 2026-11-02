// Screenshots of the "Ticket Volume per Project" panel for several date ranges (dev server on 3000, real login).
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const OUT = process.env.OUT || "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/volume-";
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split("\n").map(l => l.trim()).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
const CASES = (process.env.CASES || "today=,week=2026-09-28..2026-10-04,month=2026-09-01..2026-09-30,quarter=2026-07-01..2026-09-30,all=all").split(",").map(c => c.split("="));
const WIDTH = Number(process.env.W || 1920);
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: WIDTH, height: 1080, noAuth: true });
  page.setDefaultTimeout(90000);
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 });
  for (const [name, date] of CASES) {
    await page.goto(`${BASE}/dashboard${date ? "?date=" + date : ""}`, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForFunction(() => /Menampilkan\s+\d+\s+dari\s+[1-9]/.test(document.body.innerText), null, { timeout: 120000 });
    await page.waitForTimeout(1500);
    const panel = page.locator("article.primary-chart-panel");
    await panel.scrollIntoViewIfNeeded();
    const info = await panel.evaluate(el => { const svg = el.querySelector(".compact-svg-barchart-wrap svg"); const wrap = el.querySelector(".compact-svg-barchart-wrap"); return { viewBox: svg && svg.getAttribute("viewBox"), svgW: svg && Math.round(svg.getBoundingClientRect().width), svgH: svg && Math.round(svg.getBoundingClientRect().height), scrollW: wrap && wrap.scrollWidth, clientW: wrap && wrap.clientWidth, bars: el.querySelectorAll(".stacked-bar-group").length }; });
    console.log(name, JSON.stringify(info));
    await panel.screenshot({ path: OUT + name + "-" + WIDTH + ".png" });
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
