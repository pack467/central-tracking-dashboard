// How much work does one hover on a volume bar cost? Counts long frames and the time React spends committing while the cursor sweeps the bars.
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
  const bars = panel.locator(".stacked-bar-group");
  const n = await bars.count();
  // measure: for each bar, time from mouse move until the next two animation frames have run
  await page.evaluate(() => { window.__long = []; new PerformanceObserver(list => { for (const e of list.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ entryTypes: ["longtask"] }); window.__mutations = 0; new MutationObserver(m => { window.__mutations += m.length; }).observe(document.querySelector("article.primary-chart-panel"), { subtree: true, childList: true, attributes: true }); });
  const times = [];
  for (let i = 0; i < n; i++) {
    const box = await bars.nth(i).boundingBox();
    if (!box) continue;
    const t = await page.evaluate(async ({ x, y }) => {
      const start = performance.now();
      return start;
    }, { x: box.x, y: box.y });
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4);
    const spent = await page.evaluate(start => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(Math.round(performance.now() - start))))), t);
    times.push(spent);
    await page.waitForTimeout(60);
  }
  const stats = await page.evaluate(() => ({ longTasks: window.__long, mutations: window.__mutations }));
  const sorted = [...times].sort((a, b) => a - b);
  console.log(`bars: ${n}; hover-to-next-paint (ms): median ${sorted[Math.floor(sorted.length / 2)]}, max ${sorted[sorted.length - 1]}`);
  console.log(`long tasks (>50 ms): ${stats.longTasks.length} ${JSON.stringify(stats.longTasks.slice(0, 10))}; DOM mutations inside the panel: ${stats.mutations}`);
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
