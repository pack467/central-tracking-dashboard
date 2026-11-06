const { launch, open } = require("./pw.cjs");
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/";
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1920, height: 1080 });
  page.setDefaultTimeout(60000);
  await page.goto("http://localhost:3100/dashboard?mock=instant", { waitUntil: "networkidle" }); await page.waitForTimeout(3500);
  const velocity = page.locator("article.mgmt-velocity-panel").first();
  await velocity.scrollIntoViewIfNeeded(); await page.waitForTimeout(1000);
  await velocity.screenshot({ path: OUT + "chart-velocity-mock.png" });
  const labels = await velocity.locator("svg text").allTextContents();
  console.log("mock velocity y labels:", labels.filter(t => /^\d+m$/.test(t.trim())).join(" "), "| scale note:", labels.some(t => /Skala di atas/.test(t)));
  console.log("console errors:", JSON.stringify(page.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e)).slice(0, 3)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.slice(0, 250)); process.exitCode = 1; });
