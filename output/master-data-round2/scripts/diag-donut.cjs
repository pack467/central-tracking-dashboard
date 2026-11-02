// Diagnosis: real mouse click on a donut stroke, then Tab to a segment; report what is focused and its outline.
const { launch, open, BASE } = require("./pw.cjs");
const describe = el => {
  if (!el) return null;
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  return { tag: el.tagName.toLowerCase(), role: el.getAttribute("role"), seg: el.getAttribute("data-distribution-segment"), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
    offset: cs.outlineOffset, size: `${Math.round(r.width)}x${Math.round(r.height)}`, focusVisible: el.matches(":focus-visible") };
};
(async () => {
  const browser = await launch();
  for (const panel of ["severity-distribution", "category-distribution"]) {
    const page = await open(browser);
    await page.goto(`${BASE}/dashboard?panel=${panel}&mock=instant`, { waitUntil: "networkidle" });
    await page.waitForSelector("circle[data-distribution-segment]", { timeout: 15000 });
    await page.waitForTimeout(600);
    const box = await page.locator("[data-distribution-donut] svg").boundingBox();
    const scale = box.width / 200, cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const angle = -Math.PI / 4;
    await page.mouse.click(cx + Math.cos(angle) * 84 * scale, cy + Math.sin(angle) * 84 * scale);
    await page.waitForTimeout(300);
    console.log(panel, "mouse click on stroke ->", JSON.stringify(await page.evaluate(`(${describe})(document.activeElement)`)));
    await page.screenshot({ path: `${process.env.SHOT_DIR}/donut-${panel}-click-before.png` });
    // keyboard: Tab from the back button into the segments
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    console.log(panel, "after Tab ->", JSON.stringify(await page.evaluate(`(${describe})(document.activeElement)`)));
    await page.screenshot({ path: `${process.env.SHOT_DIR}/donut-${panel}-tab-before.png` });
    await page.context().close();
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
