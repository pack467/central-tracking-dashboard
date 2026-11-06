// Round 3 screenshots. Usage: node shot-r3.cjs <tag>
const { launch, open, BASE } = require("./pw.cjs");
const tag = process.argv[2] || "after", DIR = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3";
const TABS = [["header-layanan", "services", "systems"], ["header-tiket", "tickets", "categories"], ["header-tim", "team", "people"], ["tabel-proyek", "services", "projects"], ["tabel-severity", "tickets", "severities"]];
(async () => {
  const browser = await launch();
  for (const [size, w, h, touch] of [["desktop", 1440, 900, false], ["mobile", 390, 844, true]]) {
    const page = await open(browser, { width: w, height: h, touch });
    for (const [name, group, tab] of TABS) {
      await page.goto(`${BASE}/master-data?group=${group}&tab=${tab}&mock=instant`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-master-id]:visible", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${DIR}/${name}-${size}-${tag}.png` });
    }
    await page.context().close();
  }
  await browser.close();
})();
