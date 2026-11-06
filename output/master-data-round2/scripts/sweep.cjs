// Responsive sweep: every Master Data tab at every size. Fails on horizontal scroll, clipped tabs, text < 11px and touch targets < 44px.
const { launch, open, BASE } = require("./pw.cjs");
const SIZES = [[1920, 1080, false], [1440, 900, false], [1280, 800, false], [1024, 768, false], [768, 1024, true], [640, 900, true], [390, 844, true], [360, 740, true], [844, 390, true]];
const TABS = ["services/organizations", "services/projects", "services/systems", "tickets/categories", "tickets/severities", "team/people", "team/roles"];
(async () => {
  const browser = await launch();
  let failures = 0, runs = 0;
  for (const [w, h, touch] of SIZES) {
    const page = await open(browser, { width: w, height: h, touch });
    for (const t of TABS) {
      const [group, tab] = t.split("/");
      await page.goto(`${BASE}/master-data?group=${group}&tab=${tab}&mock=instant`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-master-id]:visible", { timeout: 15000 });
      await page.waitForTimeout(250);
      const r = await page.evaluate(({ touch }) => {
        const root = document.querySelector("[data-master-data-v2]");
        const vw = document.documentElement.clientWidth;
        const visible = el => { const b = el.getBoundingClientRect(), s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
        const overflow = document.documentElement.scrollWidth - vw;
        // tabs inside a scroller may scroll, but the nav as a whole must not be cut off by the viewport
        const clippedTabs = [...root.querySelectorAll('[role="tablist"] button[role="tab"]')].filter(visible).filter(b => { const r = b.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1; }).map(b => b.textContent.trim().slice(0, 20));
        const small = [...root.querySelectorAll("*")].filter(el => el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && visible(el) && !el.closest(".sr-only")).filter(el => parseFloat(getComputedStyle(el).fontSize) < 11).map(el => el.textContent.trim().slice(0, 20));
        const targets = touch ? [...root.querySelectorAll("button, a, [role=tab], [role=radio], input, select")].filter(visible).filter(el => !el.closest(".sr-only") && el.className.indexOf("sr-only") < 0).filter(el => { const b = el.getBoundingClientRect(); return b.height < 43.5 || b.width < 43.5; }).filter(el => { const b = el.getBoundingClientRect(); return !(b.width <= 2 && b.height <= 2); }).map(el => `${(el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 24)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`) : [];
        return { overflow, clippedTabs, small: [...new Set(small)], targets: [...new Set(targets)] };
      }, { touch });
      runs++;
      const problems = [];
      if (r.overflow > 0) problems.push(`horizontal scroll ${r.overflow}px`);
      if (r.clippedTabs.length) problems.push(`clipped tabs ${JSON.stringify(r.clippedTabs)}`);
      if (r.small.length) problems.push(`text <11px ${JSON.stringify(r.small)}`);
      if (r.targets.length) problems.push(`touch <44px ${JSON.stringify(r.targets.slice(0, 6))}`);
      if (problems.length) { failures++; console.log(`FAIL ${w}x${h} ${t}: ${problems.join("; ")}`); }
    }
    if (page.errors.filter(e => !/preload/.test(e)).length) console.log(`console ${w}:`, page.errors.filter(e => !/preload/.test(e)));
    await page.context().close();
    console.log(`done ${w}x${h}`);
  }
  await browser.close();
  console.log(failures ? `${failures} of ${runs} combinations have problems` : `ALL CLEAN (${runs} combinations)`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
