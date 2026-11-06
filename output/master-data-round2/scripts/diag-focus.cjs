// Diagnosis: which element carries the focus ring in the Memo modal and in the donut panel viewers.
const { launch, open, BASE } = require("./pw.cjs");
const describe = el => {
  if (!el) return null;
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  return { tag: el.tagName.toLowerCase(), cls: String(el.getAttribute("class") || "").slice(0, 90), role: el.getAttribute("role"), tabindex: el.getAttribute("tabindex"),
    outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, offset: cs.outlineOffset, ring: cs.boxShadow.slice(0, 80), border: cs.borderColor, size: `${Math.round(r.width)}x${Math.round(r.height)}`,
    focusVisible: el.matches(":focus-visible") };
};
(async () => {
  const browser = await launch();
  const page = await open(browser);
  await page.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Memo & Catatan Shift/ }).first().click();
  await page.waitForSelector("[data-memo-open] textarea");
  await page.waitForTimeout(400);
  console.log("MEMO focused:", await page.evaluate(`(${describe})(document.activeElement)`));
  const rules = await page.evaluate(() => {
    const out = [];
    for (const sheet of document.styleSheets) {
      let list; try { list = sheet.cssRules; } catch { continue; }
      const walk = (rules, layer) => { for (const rule of rules) {
        if (rule.cssRules && rule.constructor.name === "CSSLayerBlockRule") walk(rule.cssRules, rule.name || "anon");
        else if (rule.cssRules && !rule.selectorText) walk(rule.cssRules, layer);
        else if (rule.selectorText && /textarea|memo/i.test(rule.selectorText) && /focus|outline/i.test(rule.cssText)) out.push((layer || "UNLAYERED") + " :: " + rule.cssText.slice(0, 200));
      } };
      walk(list, null);
    }
    return out.slice(0, 12);
  });
  console.log("MEMO rules:\n" + rules.join("\n"));
  await page.screenshot({ path: `${process.env.SHOT_DIR}/memo-before.png` });
  await page.keyboard.press("Escape");

  for (const panel of ["severity-distribution", "category-distribution"]) {
    await page.goto(`${BASE}/dashboard?panel=${panel}&mock=instant`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-panel-viewer] svg circle[data-distribution-segment]", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    console.log(panel, "initially focused:", await page.evaluate(`(${describe})(document.activeElement)`));
    const seg = page.locator("circle[data-distribution-segment]").first();
    await seg.click({ force: true });
    await page.waitForTimeout(300);
    console.log(panel, "after mouse click on segment:", await page.evaluate(`(${describe})(document.activeElement)`));
    await page.screenshot({ path: `${process.env.SHOT_DIR}/donut-${panel}-before.png` });
    await page.locator("[data-distribution-donut]").click({ position: { x: 5, y: 5 }, force: true });
    console.log(panel, "after click on donut wrapper:", await page.evaluate(`(${describe})(document.activeElement)`));
  }
  console.log("errors:", page.errors.filter(e => !/preload/.test(e)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
