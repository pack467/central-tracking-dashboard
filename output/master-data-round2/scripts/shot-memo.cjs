// Screenshots of the Memo card and modal, desktop and phone. Usage: SHOT_DIR=... node shot-memo.cjs before|after
const { launch, open, BASE } = require("./pw.cjs");
const tag = process.argv[2] || "after";
const DIR = process.env.SHOT_DIR;
(async () => {
  const browser = await launch();
  for (const [name, width, height, touch] of [["desktop", 1440, 900, false], ["mobile", 390, 844, true]]) {
    const page = await open(browser, { width, height, touch });
    await page.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1800);
    const card = page.locator("article", { hasText: "Memo & Catatan Shift" }).first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await card.screenshot({ path: `${DIR}/memo-card-${name}-${tag}.png` });
    if (name === "mobile") await page.screenshot({ path: `${DIR}/memo-dashboard-top-mobile-${tag}.png` });
    // open the modal the way a user does
    if (name === "desktop") await page.getByRole("button", { name: /Memo & Catatan Shift/ }).first().click();
    else await page.getByRole("button", { name: /Edit catatan/ }).first().click();
    await page.waitForSelector("[data-memo-open]", { timeout: 8000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/memo-modal-${name}-${tag}.png` });
    await page.context().close();
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
