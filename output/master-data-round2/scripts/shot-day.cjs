const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = "http://localhost:3000";
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/";
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
const [tag = "x", query = ""] = process.argv.slice(2);
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1920, height: 1080, noAuth: true });
  page.setDefaultTimeout(90000);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 }).catch(() => {});
  await page.goto(`${BASE}/dashboard${query}`, { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(4000);
  const filter = page.locator("section, div").filter({ hasText: "Filter Laporan & Analitik Tiket" }).last();
  await page.getByText("Filter Laporan & Analitik Tiket").first().scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  // full page below the filter, in tall viewport slices
  const top = await page.getByText("Filter Laporan & Analitik Tiket").first().evaluate(e => e.getBoundingClientRect().top + window.scrollY - 20);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log("filter top", Math.round(top), "page height", height);
  let i = 0;
  for (let y = top; y < Math.min(height, top + 3400); y += 1000, i++) {
    await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(700);
    await page.screenshot({ path: OUT + `day-${tag}-${i}.png` });
  }
  console.log("count text:", (await page.locator("body").innerText()).match(/Menampilkan\s+\d+\s+dari\s+\d+\s+Tiket/)?.[0]);
  console.log("console errors:", JSON.stringify(page.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e)).slice(0, 3)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
