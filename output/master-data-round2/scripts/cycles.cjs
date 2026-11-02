const { launch, open, BASE } = require("./pw.cjs");
(async () => {
  const browser = await launch();
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    const page = await open(browser, { width: w, height: h, touch });
    await page.goto(`${BASE}/master-data?group=team&tab=people&mock=instant&view=review&ref=x&review=1`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-master-id]:visible");
    console.log(w, "P0 params ignored:", !/view=|ref=|review=/.test(page.url()), "P0 text:", await page.getByText("Perlu ditinjau").count(), await page.getByText("Tinjau referensi").count(), await page.getByText("cadangan", { exact: false }).count());
    for (let i = 0; i < 20; i++) {
      await page.getByRole("button", { name: "Tambah Personel" }).first().click();
      await page.waitForSelector("form");
      await page.keyboard.press("Escape");
      await page.waitForSelector("form", { state: "detached" });
      await page.locator("[data-master-id]:visible").first().click();
      await page.getByRole("dialog", { name: "Detail Personel" }).waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog", { name: "Detail Personel" }).waitFor({ state: "detached" });
    }
    const state = await page.evaluate(() => ({ body: getComputedStyle(document.body).overflow, html: getComputedStyle(document.documentElement).overflow, inert: document.querySelectorAll("[inert]").length, ariaHiddenMain: !!document.querySelector("main[aria-hidden='true'],[data-shell][aria-hidden='true']"), dialogs: document.querySelectorAll('[role="dialog"]').length }));
    await page.mouse.wheel(0, 600); await page.waitForTimeout(300);
    const scrolled = await page.evaluate(() => window.scrollY);
    console.log(w, "after 20 cycles:", JSON.stringify(state), "scrollY after wheel:", scrolled, "errors:", page.errors.filter(e => !/preload/.test(e)));
    await page.context().close();
  }
  await browser.close();
})().catch(e => { console.error("FAIL", e); process.exit(1); });
