const { launch, open, BASE } = require("./pw.cjs");
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/";
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900 });
  await page.goto(`${BASE}/tickets?mock=instant`, { waitUntil: "networkidle" }); await page.waitForTimeout(1800);
  await page.screenshot({ path: OUT + "nav-desktop.png", clip: { x: 0, y: 0, width: 300, height: 900 } });
  const items = await page.locator("aside nav a, nav a").allInnerTexts();
  console.log("sidebar items:", items.map(t => t.trim()).filter(Boolean).join(" | "));
  const mobile = await open(browser, { width: 390, height: 844 });
  await mobile.goto(`${BASE}/tickets?mock=instant`, { waitUntil: "networkidle" }); await mobile.waitForTimeout(1500);
  await mobile.getByRole("button", { name: /menu|navigasi/i }).first().click().catch(() => {}); await mobile.waitForTimeout(800);
  await mobile.screenshot({ path: OUT + "nav-mobile.png" });
  console.log("mobile menu text:", (await mobile.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 160));
  await browser.close();
})();
