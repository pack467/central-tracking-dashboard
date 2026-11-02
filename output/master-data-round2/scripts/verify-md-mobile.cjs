// Master Data on touch screens: no horizontal scroll, touch targets >= 44px, text >= 11px, cards instead of tables, form swatches 44px.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`); if (!cond) process.exitCode = 1; };
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/master-data-tables/";
const TABS = [["services", "organizations"], ["services", "projects"], ["services", "systems"], ["tickets", "categories"], ["tickets", "severities"], ["team", "people"], ["team", "roles"]];
const audit = page => page.evaluate(() => {
  const main = document.querySelector("[data-master-data-v2]");
  const small = [], tiny = [];
  main.querySelectorAll("button, a[href], input, [role=radio], [role=menuitem], select").forEach(el => {
    if (el.offsetParent === null || el.closest("[hidden]")) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0) return;
    if (r.width < 43.5 || r.height < 43.5) small.push(`${(el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 28)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  });
  main.querySelectorAll("*").forEach(el => {
    if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    if (el.offsetParent === null) return;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 11) tiny.push(`${el.textContent.trim().slice(0, 20)} ${size}px`);
  });
  return { hscroll: document.documentElement.scrollWidth > innerWidth, small: [...new Set(small)], tiny: [...new Set(tiny)], tables: [...document.querySelectorAll("table")].filter(t => t.offsetParent !== null).length };
});
(async () => {
  const browser = await launch();
  for (const [label, w, h] of [["390x844", 390, 844], ["844x390", 844, 390]]) {
    const page = await open(browser, { width: w, height: h, touch: true });
    for (const [group, tab] of TABS) {
      await page.goto(`${BASE}/master-data?group=${group}&tab=${tab}&mock=instant`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(400);
      const r = await audit(page);
      ok(!r.hscroll && r.tiny.length === 0, `${label} ${tab}: no h-scroll, no text < 11px`, `${r.hscroll ? "H-SCROLL " : ""}${r.tiny.slice(0, 3).join("; ")}`);
      console.log(`      touch targets < 44px: ${r.small.length ? r.small.slice(0, 6).join("; ") : "none"}${w < 600 ? `   tables visible: ${r.tables}` : ""}`);
    }
    if (w === 390) {
      await page.goto(`${BASE}/master-data?group=tickets&tab=categories&mock=instant`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(300);
      await page.screenshot({ path: OUT + "md-kategori-mobile-after.png" });
      await page.getByRole("button", { name: /Filter & urutan/ }).click();
      await page.waitForSelector("[data-sheet-id=master-filters]");
      await page.waitForTimeout(400);
      await page.screenshot({ path: OUT + "md-filter-sheet-mobile-after.png" });
      await page.getByRole("button", { name: /^Tampilkan/ }).click();
      await page.getByRole("button", { name: "Tambah Kategori" }).click();
      await page.waitForSelector("form"); await page.waitForTimeout(500);
      const sw = await page.getByRole("radio", { name: "Merah", exact: true }).boundingBox();
      ok(sw.width >= 43.5 && sw.height >= 43.5, "mobile swatch >= 44px", `${Math.round(sw.width)}x${Math.round(sw.height)}`);
      const foot = await page.locator("footer").last().boundingBox();
      ok(Math.abs(foot.y + foot.height - h) < 2, "form footer is pinned to the bottom of the screen", `${Math.round(foot.y + foot.height)} vs ${h}`);
      await page.screenshot({ path: OUT + "md-form-kategori-mobile-after.png" });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const locked = await page.evaluate(() => getComputedStyle(document.body).overflow === "hidden" || getComputedStyle(document.documentElement).overflow === "hidden");
      ok(!locked, "scroll released after the form closes");
    }
    console.log("page errors:", JSON.stringify(page.errors.filter(e => !/preload/.test(e)).slice(0, 3)));
    await page.context().close();
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n").slice(0, 2).join(" | ")); process.exitCode = 1; });
