// Master Data screenshots for the report. Usage: SHOT_DIR=... node shot-md.cjs before|after
const { launch, open, BASE } = require("./pw.cjs");
const tag = process.argv[2] || "after", DIR = process.env.SHOT_DIR;
const TABS = [["organisasi", "group=services&tab=organizations"], ["proyek", "group=services&tab=projects"], ["sistem", "group=services&tab=systems"], ["kategori", "group=tickets&tab=categories"], ["severity", "group=tickets&tab=severities"]];
(async () => {
  const browser = await launch();
  for (const [size, w, h, touch] of [["desktop", 1440, 900, false], ["mobile", 390, 844, true]]) {
    const page = await open(browser, { width: w, height: h, touch });
    for (const [name, q] of TABS) {
      await page.goto(`${BASE}/master-data?${q}&mock=instant`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-master-id]:visible", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${DIR}/md-${name}-${size}-${tag}.png` });
    }
    // forms and drawer, desktop only for the form set, both sizes for the drawer
    for (const [name, q, button] of [["form-sistem", "group=services&tab=systems", /Ubah /], ["form-proyek", "group=services&tab=projects", /Ubah /], ["form-kategori", "group=tickets&tab=categories", /Ubah /], ["form-severity", "group=tickets&tab=severities", /Ubah /]]) {
      if (size === "mobile" && name !== "form-kategori") continue;
      await page.goto(`${BASE}/master-data?${q}&mock=instant`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-master-id]:visible", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(500);
      const open_ = page.getByRole("button", { name: button }).first();
      await open_.click({ timeout: 8000 }).catch(async () => { await page.getByRole("button", { name: /^Aksi/ }).first().click(); await page.getByRole("menuitem", { name: "Ubah" }).click(); });
      await page.waitForSelector("form", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${DIR}/md-${name}-${size}-${tag}.png` });
      await page.keyboard.press("Escape");
    }
    await page.goto(`${BASE}/master-data?group=tickets&tab=categories&mock=instant`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-master-id]:visible");
    await page.locator("[data-master-id]:visible").first().click({ position: { x: 60, y: 20 } });
    await page.waitForSelector("[role=dialog]", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/md-drawer-kategori-${size}-${tag}.png` });
    await page.context().close();
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
