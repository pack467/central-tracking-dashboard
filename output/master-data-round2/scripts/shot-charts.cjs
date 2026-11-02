const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = "http://localhost:3000";
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/";
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
const tag = process.argv[2] || "after";
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1920, height: 1080, noAuth: true });
  page.setDefaultTimeout(90000);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(1200);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 }).catch(() => {});
  await page.goto(`${BASE}/dashboard?date=2026-09-01..2026-09-30`, { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(4000);
  const velocity = page.locator("article.mgmt-velocity-panel").first();
  await velocity.scrollIntoViewIfNeeded(); await page.waitForTimeout(1200);
  await velocity.screenshot({ path: OUT + `chart-velocity-${tag}.png` });
  const traffic = page.locator("article.shift-traffic-panel").first();
  await traffic.scrollIntoViewIfNeeded(); await page.waitForTimeout(1200);
  await traffic.screenshot({ path: OUT + `chart-traffic-${tag}.png` });
  // how many y labels does the velocity chart draw?
  const labels = await velocity.locator("svg text").allTextContents();
  console.log("velocity svg texts:", labels.length, "| y labels:", labels.filter(t => /^\d+m$/.test(t.trim())).join(" "), "| red '!' labels:", labels.filter(t => /m !$/.test(t.trim())).length);
  // the expanded panel
  await velocity.getByRole("button", { name: /Perbesar panel Tren Durasi/ }).click().catch(() => {}); await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + `chart-velocity-expanded-${tag}.png` });
  console.log("console errors:", JSON.stringify(page.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e)).slice(0, 3)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
