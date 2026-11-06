// Diagnosis: click every text input, search box and textarea on every page and record the focus outline and ring that results.
const { launch, open, BASE } = require("./pw.cjs");
const PAGES = ["/dashboard", "/tickets", "/monitoring", "/shift-log", "/reports", "/reports/ticket-log", "/reports/monitoring-log", "/team-roster", "/master-data?group=services&tab=organizations", "/master-data?group=team&tab=people", "/runbooks", "/runbooks/credentials", "/runbooks/links", "/runbooks/escalation", "/notifications", "/profile"];
const NON_TEXT = ["checkbox", "radio", "range", "file", "button", "submit", "reset", "color", "image", "hidden"];
const read = el => {
  const cs = getComputedStyle(el), wrap = el.parentElement ? getComputedStyle(el.parentElement) : null;
  const ring = cs.boxShadow !== "none" && !/^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px(, rgba\(0, 0, 0, 0\) 0px 0px 0px 0px)*/.test(cs.boxShadow) && / [1-9]\d*px /.test(cs.boxShadow.replace(/rgba?\([^)]*\)/g, ""));
  return {
    who: `${el.tagName.toLowerCase()}${el.type ? "[" + el.type + "]" : ""} "${(el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.name || el.id || "").slice(0, 34)}"`,
    outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 ? `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor.slice(0, 22)}` : "none",
    offset: cs.outlineOffset, ring, shadow: ring ? cs.boxShadow.slice(0, 60) : "-", border: cs.borderTopWidth + " " + cs.borderTopColor.slice(0, 26),
    wrapOutline: wrap && wrap.outlineStyle !== "none" ? wrap.outlineStyle + " " + wrap.outlineWidth : "-", own: String(el.getAttribute("class") || "").match(/outline-none|\[outline:(?:0|none)|focus:ring|focus:outline|focus-visible:ring/g)?.join(",") || "",
  };
};
(async () => {
  const browser = await launch();
  const page = await open(browser);
  const painted = [];
  for (const path of PAGES) {
    await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}mock=instant`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1200);
    const count = await page.evaluate(nonText => {
      let i = 0;
      for (const el of document.querySelectorAll("input, textarea")) {
        if (nonText.includes(el.type)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8 || getComputedStyle(el).visibility === "hidden") continue;
        el.setAttribute("data-diag", String(i++));
      }
      return i;
    }, NON_TEXT);
    let bad = 0;
    for (let i = 0; i < count; i++) {
      const loc = page.locator(`[data-diag="${i}"]`);
      try {
        await loc.scrollIntoViewIfNeeded({ timeout: 1500 });
        const box = await loc.boundingBox();
        if (!box) continue;
        await page.mouse.click(box.x + Math.min(box.width / 2, 40), box.y + box.height / 2);
        await page.waitForTimeout(60);
        const state = await page.evaluate(`(${read})(document.activeElement)`);
        const isPainted = state.outline !== "none" || state.ring;
        if (isPainted) { bad++; painted.push({ path, ...state }); }
      } catch { /* an input behind a closed panel */ }
    }
    console.log(path.padEnd(48), "inputs:", String(count).padStart(2), "| with a blue box on click:", bad);
    await page.keyboard.press("Escape").catch(() => {});
  }
  console.log("\nPAINTED ON CLICK:");
  for (const p of painted) console.log(`- ${p.path} ${p.who} outline=${p.outline} offset=${p.offset} ring=${p.shadow} border=${p.border} wrapOutline=${p.wrapOutline} own=[${p.own}]`);
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
