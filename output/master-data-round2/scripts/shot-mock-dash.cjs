const { launch, open } = require("./pw.cjs");
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/";
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1920, height: 1080 });
  page.setDefaultTimeout(60000);
  for (const [tag, query] of [["default", ""], ["all", "?date=all"]]) {
    await page.goto(`http://localhost:3100/dashboard${query}${query ? "&" : "?"}mock=instant`, { waitUntil: "networkidle" }); await page.waitForTimeout(3000);
    const text = await page.locator("body").innerText();
    console.log(tag, "->", (text.match(/Menampilkan\s+\d+\s+dari\s+\d+\s+Tiket/) || ["no count"])[0], "| picker:", (await page.getByRole("button", { name: "Filter tanggal analitik tiket" }).innerText()).trim(), "| empty-today text:", /Belum ada tiket hari ini/.test(text));
    await page.getByText("Filter Laporan & Analitik Tiket").first().scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollBy(0, 560)); await page.waitForTimeout(500);
    await page.screenshot({ path: OUT + `mock-dash-${tag}.png` });
  }
  console.log("console errors:", JSON.stringify(page.errors.filter(e => !/favicon|401|Failed to load resource|preload/.test(e)).slice(0, 3)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.slice(0, 250)); process.exitCode = 1; });
