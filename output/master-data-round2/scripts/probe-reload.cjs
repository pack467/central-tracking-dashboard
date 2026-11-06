// Does each action reload the whole document (which shows the "Menyiapkan dashboard" splash again) or navigate inside the page?
const fs = require("fs");
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE || "http://localhost:3000";
const B = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/backend/";
const env = Object.fromEntries(fs.readFileSync(B + ".env", "utf8").split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const users = (l => l.users || l)(JSON.parse(fs.readFileSync(B + "prisma/seed-data/users.json", "utf8")));
const account = users.find(u => u.role_id === "1" && u.email);
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900, noAuth: true });
  page.setDefaultTimeout(90000);
  let loads = 0; page.on("load", () => loads++);
  const docRequests = []; page.on("request", r => { if (r.resourceType() === "document") docRequests.push(r.url().replace(BASE, "")); });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" }); await page.waitForTimeout(1000);
  await page.getByLabel("Email atau ID Karyawan").fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(env.SEED_DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(u => u.pathname === "/dashboard", { timeout: 90000 });
  await page.getByText("Menampilkan").first().waitFor({ state: "attached" }); await page.waitForTimeout(3000);
  const step = async (label, action) => {
    await page.evaluate(() => { window.__alive = "yes"; });
    const before = loads, docsBefore = docRequests.length;
    await action();
    // look for the splash right after the action, then let things settle
    let splash = false;
    for (let i = 0; i < 12; i++) { if (await page.locator("#ctd-app-splash").count()) { splash = true; break; } await page.waitForTimeout(100); }
    await page.waitForTimeout(1800);
    const alive = await page.evaluate(() => window.__alive === "yes").catch(() => false);
    console.log(`${label.padEnd(44)} full reload: ${alive ? "no " : "YES"} | splash shown: ${splash ? "YES" : "no "} | document loads: ${loads - before} | document requests: ${docRequests.slice(docsBefore).join(",") || "-"} | url: ${page.url().replace(BASE, "")}`);
  };
  await step("sidebar: Tickets", () => page.getByRole("link", { name: "Tickets", exact: true }).first().click());
  await step("sidebar: Monitoring", () => page.getByRole("link", { name: "Monitoring", exact: true }).first().click());
  await step("sidebar: Dashboard", () => page.getByRole("link", { name: "Dashboard", exact: true }).first().click());
  await page.getByText("Menampilkan").first().waitFor({ state: "attached" });
  await step("dashboard: Proyek filter", async () => { await page.getByLabel("Filter proyek").click(); await page.getByRole("option").nth(1).click(); });
  await step("dashboard: Shift filter", async () => { await page.getByLabel("Filter shift", { exact: true }).first().click(); await page.getByRole("option").nth(1).click(); });
  await step("dashboard: Status filter", async () => { await page.getByLabel(/Filter status/i).first().click(); await page.getByRole("option").nth(1).click(); });
  await step("dashboard: date picker -> Semua Waktu", async () => { await page.getByRole("button", { name: "Filter tanggal analitik tiket" }).click(); await page.getByLabel("Preset rentang tanggal").getByRole("button", { name: "Semua Waktu" }).click(); });
  await step("sidebar: Master Data", () => page.getByRole("link", { name: "Master Data", exact: true }).first().click());
  await step("sidebar: Tickets (again)", () => page.getByRole("link", { name: "Tickets", exact: true }).first().click());
  console.log("total document loads after login:", loads);
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
