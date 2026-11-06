const { launch, open, shot, BASE } = require("./pw.cjs");
const sizes = [[1024, 768, false], [768, 1024, true], [390, 844, true], [844, 390, true]];
const audit = () => {
  const out = { hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, smallText: [], smallTargets: [] };
  const root = document.querySelector('[data-master-data-v2]') || document.body;
  const scopes = [root, ...document.querySelectorAll('[role="dialog"]')];
  const seen = new Set();
  for (const scope of scopes) for (const el of scope.querySelectorAll("*")) {
    if (seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") continue;
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (hasText && parseFloat(cs.fontSize) < 11) out.smallText.push((el.textContent || "").trim().slice(0, 24) + ":" + cs.fontSize);
    const interactive = el.matches('button, a[href], input:not([type=hidden]), [role="tab"], [role="menuitem"], [role="radio"], [role="combobox"], [role="option"]');
    if (interactive && matchMedia("(pointer: coarse)").matches && (r.height < 43.5 || r.width < 43.5) && !(el.closest("thead"))) out.smallTargets.push((el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 24) + ":" + Math.round(r.width) + "x" + Math.round(r.height));
  }
  out.smallText = [...new Set(out.smallText)].slice(0, 6); out.smallTargets = [...new Set(out.smallTargets)].slice(0, 10);
  return out;
};
(async () => {
  const browser = await launch();
  for (const [w, h, touch] of sizes) {
    const page = await open(browser, { width: w, height: h, touch });
    const tag = `${w}x${h}`;
    for (const tab of ["people", "roles"]) {
      await page.goto(`${BASE}/master-data?group=team&tab=${tab}&mock=instant`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-master-id]:visible');
      await page.waitForTimeout(400);
      await shot(page, `ui-${tab}-${tag}`);
      console.log(tag, tab, JSON.stringify(await page.evaluate(audit)));
    }
    // form
    await page.goto(`${BASE}/master-data?group=team&tab=people&mock=instant`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Tambah Personel" }).first().click();
    await page.waitForSelector("form"); await page.waitForTimeout(400);
    await shot(page, `ui-person-form-${tag}`);
    console.log(tag, "form", JSON.stringify(await page.evaluate(audit)));
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    const confirmLeave = await page.getByText("Buang perubahan?").count();
    if (confirmLeave) await page.getByRole("button", { name: "Buang perubahan" }).click();
    await page.waitForTimeout(300);
    // scroll still works after closing
    const scrollable = await page.evaluate(() => { const b = getComputedStyle(document.body).overflow, h = getComputedStyle(document.documentElement).overflow; return { body: b, html: h, inert: !!document.querySelector("[inert]"), hidden: !!document.querySelector("main[aria-hidden='true'], [data-shell][aria-hidden='true'], body > div[aria-hidden='true']") }; });
    console.log(tag, "after close", JSON.stringify(scrollable));
    // detail
    await page.goto(`${BASE}/master-data?group=team&tab=people&mock=instant&detail=mem-1`, { waitUntil: "networkidle" });
    await page.getByRole("dialog", { name: "Detail Personel" }).waitFor(); await page.waitForTimeout(500);
    await shot(page, `ui-person-detail-${tag}`);
    console.log(tag, "detail", JSON.stringify(await page.evaluate(audit)));
    console.log(tag, "errors", page.errors.filter(e => !/preload/.test(e)));
    await page.context().close();
  }
  await browser.close();
})().catch(error => { console.error("FAIL", error); process.exit(1); });
