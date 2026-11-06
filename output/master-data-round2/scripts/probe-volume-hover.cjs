// Finds places in the dashboard volume chart where the hover state keeps changing while the cursor is still (the "buzzing" bars).
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const DATE = process.env.DATE || "2026-09-01..2026-09-30";
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split("\n").map(l => l.trim()).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
(async () => {
  const browser = await launch();
  if (process.env.WAIT) { console.log("(waiting 65 s for the backend's rate window)"); await new Promise(r => setTimeout(r, 65000)); }
  const page = await open(browser, { width: Number(process.env.W || 1920), height: 1080, noAuth: true });
  page.setDefaultTimeout(90000);
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 });
  await page.goto(`${BASE}/dashboard?date=${DATE}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => /Menampilkan\s+\d+\s+dari\s+[1-9]/.test(document.body.textContent), null, { timeout: 120000 });
  await page.waitForTimeout(2000);
  const panel = page.locator("article.primary-chart-panel");
  await panel.scrollIntoViewIfNeeded();
  const svg = panel.locator(".compact-svg-barchart-wrap svg");
  const box = await svg.boundingBox();
  const sample = () => panel.evaluate(el => {
    // which bar group shows a highlight column, and how many nodes of the chart exist (a remount would change the count)
    const groups = [...el.querySelectorAll(".stacked-bar-group")];
    const hi = groups.findIndex(g => [...g.querySelectorAll("rect")].some(r => /rgba\(56, 189, 248, 0\.0?8\)|rgba\(56, 189, 248, 0\.15\)/.test(r.getAttribute("fill") || "")));
    return hi;
  });
  const results = [];
  const ys = [0.25, 0.5, 0.75, 0.88, 0.95].map(f => box.y + box.height * f);
  for (const y of ys) {
    for (let x = box.x + 40; x < box.x + box.width - 10; x += 7) {
      await page.mouse.move(x, y);
      const seen = [];
      for (let i = 0; i < 12; i++) { seen.push(await sample()); await page.waitForTimeout(25); }
      const changes = seen.filter((v, i) => i > 0 && v !== seen[i - 1]).length;
      if (changes >= 2) results.push({ x: Math.round(x - box.x), y: Math.round(y - box.y), seen: seen.join(",") });
    }
  }
  await page.mouse.move(5, 5);
  console.log(`checked ${ys.length} rows; unstable spots: ${results.length}`);
  console.log(JSON.stringify(results.slice(0, 12)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
