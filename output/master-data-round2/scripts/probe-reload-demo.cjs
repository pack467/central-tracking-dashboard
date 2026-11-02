// Same question as probe-reload.cjs, but with the seeded demo session (no backend login), so it also runs on the HEAD copy.
const { launch, open } = require("./pw.cjs");
const BASE = process.env.CTD_BASE;
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900 });
  page.setDefaultTimeout(90000);
  let loads = 0; page.on("load", () => loads++);
  const docRequests = []; page.on("request", r => { if (r.resourceType() === "document") docRequests.push(r.url().replace(BASE, "")); });
  await page.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(4000);
  const step = async (label, action) => {
    await page.evaluate(() => { window.__alive = "yes"; });
    const before = loads, docsBefore = docRequests.length;
    await action();
    let splash = false;
    for (let i = 0; i < 12; i++) { if (await page.locator("#ctd-app-splash").count()) { splash = true; break; } await page.waitForTimeout(100); }
    await page.waitForTimeout(1800);
    const alive = await page.evaluate(() => window.__alive === "yes").catch(() => false);
    console.log(`${label.padEnd(30)} full reload: ${alive ? "no " : "YES"} | splash: ${splash ? "YES" : "no "} | document requests: ${docRequests.slice(docsBefore).join(",") || "-"} | url: ${page.url().replace(BASE, "")}`);
  };
  for (const name of ["Tickets", "Monitoring", "Dashboard", "Master Data"]) await step(`sidebar: ${name}`, () => page.getByRole("link", { name, exact: true }).first().click());
  console.log("document loads in total:", loads);
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
