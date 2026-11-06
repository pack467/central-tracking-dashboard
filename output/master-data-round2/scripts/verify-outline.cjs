// Stage 1: no square outline on the Memo textarea or on donut segments; keyboard focus is still visible.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label) => { console.log(cond ? "PASS" : "FAIL", label); if (!cond) process.exitCode = 1; };
const SHOTS = process.env.SHOT_DIR;
const ring = el => { const cs = getComputedStyle(el); return { outline: `${cs.outlineStyle} ${cs.outlineWidth}`, shadow: cs.boxShadow, stroke: cs.strokeWidth, filter: cs.filter }; };
(async () => {
  const browser = await launch();
  let page = await open(browser);
  await page.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Edit catatan/ }).first().click();
  const editor = page.locator("[data-memo-open] [role=textbox]");
  await editor.waitFor();
  await page.waitForTimeout(500);
  ok(await editor.evaluate(el => document.activeElement === el), "the memo editor is focused on open");
  const state = await editor.evaluate(`(${ring})(document.activeElement)`);
  ok(/^none|^solid 0px/.test(state.outline), "the memo editor has no outline: " + state.outline);
  ok(state.shadow === "none" || (/rgba\(0, 0, 0, 0\) 0px 0px 0px 0px/.test(state.shadow) && !/ [1-9]\d*px rgb/.test(state.shadow)), "no ring box-shadow: " + state.shadow.slice(0, 60));
  const border = await editor.evaluate(el => getComputedStyle(el.closest("#memo-panel")).borderColor);
  ok(border !== "rgba(0, 0, 0, 0)", "the editor area shows a soft tint when focused: " + border);
  await page.getByRole("button", { name: "Tutup" }).focus();
  await page.waitForTimeout(250);
  ok(await editor.evaluate(el => getComputedStyle(el.closest("#memo-panel")).borderColor) === "rgba(0, 0, 0, 0)", "the tint goes away when focus leaves");
  await page.context().close();

  for (const panel of ["category-distribution", "severity-distribution"]) {
    page = await open(browser);
    await page.goto(`${BASE}/dashboard?panel=${panel}&mock=instant`, { waitUntil: "networkidle" });
    await page.waitForSelector("circle[data-distribution-segment]", { timeout: 15000 });
    await page.waitForTimeout(600);
    const box = await page.locator("[data-distribution-donut] svg").boundingBox();
    const scale = box.width / 200, cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    for (const angle of [-Math.PI / 4, Math.PI / 6, Math.PI * 0.8]) await page.mouse.click(cx + Math.cos(angle) * 84 * scale, cy + Math.sin(angle) * 84 * scale);
    const afterClick = await page.evaluate(`(el => el && el.tagName === "circle" ? (${ring})(el) : null)(document.activeElement)`);
    ok(afterClick === null || /^none/.test(afterClick.outline), `${panel}: no outline after mouse click (${afterClick ? afterClick.outline : "focus not on a segment"})`);
    await page.screenshot({ path: `${SHOTS}/donut-${panel}-click-after.png` });
    await page.locator("circle[data-distribution-segment]").first().focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const kb = await page.evaluate(`(el => el.tagName === "circle" ? Object.assign((${ring})(el), { visible: el.matches(":focus-visible") }) : null)(document.activeElement)`);
    ok(kb && kb.visible && /^none/.test(kb.outline) && parseFloat(kb.stroke) > 32 && /brightness/.test(kb.filter), `${panel}: keyboard focus thickens and brightens the segment, no outline (${JSON.stringify(kb)})`);
    await page.screenshot({ path: `${SHOTS}/donut-${panel}-tab-after.png` });
    ok(await page.locator("circle[data-distribution-segment]").first().getAttribute("aria-label") !== null, `${panel}: segments keep their aria-label`);
    await page.context().close();
  }
  // the app-wide keyboard ring still works for everything that did not opt out
  page = await open(browser);
  await page.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const plain = await page.evaluate(`(el => ({ tag: el.tagName, optOut: el.getAttribute("data-focus-ring"), outline: getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).outlineWidth, visible: el.matches(":focus-visible") }))(document.activeElement)`);
  ok(plain.visible && !plain.optOut && /^solid 2px/.test(plain.outline), "ordinary controls keep the global keyboard ring: " + JSON.stringify(plain));
  await page.context().close();
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
