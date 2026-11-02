// Stage 2: chart tooltips sit beside the hovered column, never on it, stay inside the chart, and never linger.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label) => { console.log(cond ? "PASS" : "FAIL", label); if (!cond) process.exitCode = 1; };
const SHOTS = process.env.SHOT_DIR;
const PANELS = [
  { id: "ticket-volume", label: "Grafik volume", name: "volume" },
  { id: "shift-traffic", label: "Grafik tren trafik", name: "traffic" },
  { id: "ticket-mom", label: "Grafik komparasi", name: "mom" },
  { id: "resolution-trend", label: "Grafik tren durasi", name: "resolution" },
];
const tipRect = page => page.evaluate(() => { const t = document.querySelector("[data-chart-tooltip]"); if (!t) return null; const r = t.getBoundingClientRect(), c = t.offsetParent.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, cl: c.left, cr: c.right, ct: c.top, cb: c.bottom, text: t.innerText.replace(/\s+/g, " ").trim() }; });
async function columns(page, label) {
  // x of every column in screen px: the x-axis tick lines are drawn at each column centre
  return page.evaluate(sel => {
    const svg = document.querySelector(`svg[aria-label^="${sel}"]`), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    const k = r.width / vb.width;
    const xs = [...svg.querySelectorAll('line[stroke="#475569"]')].map(l => r.left + Number(l.getAttribute("x1")) * k);
    return { xs, top: r.top, bottom: r.bottom, left: r.left, right: r.right, midY: r.top + r.height / 2 };
  }, label);
}
(async () => {
  const browser = await launch();
  for (const width of (process.env.WIDTHS || "1440,1024,768").split(",").map(Number)) {
    const page = await open(browser, { width, height: width > 1000 ? 900 : 1000 });
    for (const panel of PANELS.filter(p => !process.env.ONLY || p.name === process.env.ONLY)) {
      console.log("->", width, panel.name);
      await page.goto(`${BASE}/dashboard?panel=${panel.id}&mock=instant`, { waitUntil: "networkidle" });
      await page.waitForSelector(`svg[aria-label^="${panel.label}"]`, { timeout: 20000 });
      await page.waitForTimeout(500);
      const cols = await columns(page, panel.label);
      ok(cols.xs.length > 3, `${width} ${panel.name}: ${cols.xs.length} columns found`);
      // scan every column, remember the one with the largest headline figure
      let best = null, overlaps = 0, outside = 0, tooCramped = 0;
      for (let i = 0; i < cols.xs.length; i++) {
        await page.mouse.move(cols.xs[i], cols.midY);
        const tip = await tipRect(page);
        if (!tip) { ok(false, `${width} ${panel.name}: no tooltip on column ${i}`); continue; }
        const marker = cols.xs[i];
        // the tooltip must not straddle the column centre line
        if (tip.left < marker + 4 && tip.right > marker - 4) overlaps++;
        if (tip.left < tip.cl || tip.right > tip.cr || tip.top < tip.ct || tip.bottom > tip.cb) outside++;
        const num = Number((tip.text.match(/Total (\d+)/) || tip.text.match(/(\d+) menit/) || tip.text.match(/Pagi[^\d]*(\d+)/) || [0, 0])[1]);
        if (!best || num > best.num) best = { i, num, x: marker };
      }
      ok(overlaps === 0, `${width} ${panel.name}: tooltip never covers the hovered column (${overlaps} overlaps)`);
      ok(outside === 0, `${width} ${panel.name}: tooltip always inside the chart (${outside} outside)`);
      // peak column: shot + check the data stays visible
      await page.mouse.move(best.x, cols.midY);
      const peak = await tipRect(page);
      if (width === 1440) await page.screenshot({ path: `${SHOTS}/tip-${panel.name}-peak-after.png` });
      ok(peak && (peak.left > best.x || peak.right < best.x), `${width} ${panel.name}: peak column (${best.num}) stays uncovered`);
      // first and last column flip to the side that has room
      for (const [label, i] of [["first", 0], ["last", cols.xs.length - 1]]) {
        await page.mouse.move(cols.xs[i], cols.midY);
        const t = await tipRect(page);
        ok(t && t.left >= t.cl && t.right <= t.cr, `${width} ${panel.name}: ${label} column tooltip not clipped (${Math.round(t.left - t.cl)}px from the left edge)`);
        if (width === 1440 && panel.name === "volume") await page.screenshot({ path: `${SHOTS}/tip-${panel.name}-${label}-after.png` });
      }
      // header: title and figure are apart
      await page.mouse.move(best.x, cols.midY);
      const gap = await page.evaluate(() => { const spans = [...document.querySelectorAll("[data-chart-tooltip] > div:first-child > span")]; if (spans.length < 2) return null; return spans[1].getBoundingClientRect().left - spans[0].getBoundingClientRect().right; });
      ok(gap === null || gap >= 12, `${width} ${panel.name}: header title and figure are ${gap === null ? "n/a" : Math.round(gap) + "px"} apart`);
      const small = await page.evaluate(() => [...document.querySelectorAll("[data-chart-tooltip], [data-chart-tooltip] *")].filter(e => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 11).length);
      ok(small === 0, `${width} ${panel.name}: no text under 11px in the tooltip`);
      // leaving the chart closes it at once
      await page.mouse.move(cols.xs[1], cols.top - 30);
      ok(await tipRect(page) === null, `${width} ${panel.name}: mouse leaves the chart, tooltip gone`);
      // Grafik -> Tabel -> Grafik leaves nothing behind
      await page.mouse.move(best.x, cols.midY);
      await page.getByRole("button", { name: /Tabel/ }).click();
      await page.waitForSelector("[data-panel-viewer] table");
      await page.getByRole("button", { name: /Grafik/ }).click();
      await page.waitForSelector(`svg[aria-label^="${panel.label}"]`);
      ok(await tipRect(page) === null, `${width} ${panel.name}: no tooltip after switching Grafik/Tabel`);
      // scroll, resize and blur close it
      for (const [name, act] of [["scroll", () => page.evaluate(() => window.dispatchEvent(new Event("scroll")))], ["blur", () => page.evaluate(() => window.dispatchEvent(new Event("blur")))], ["Escape", () => page.keyboard.press("Escape")]]) {
        const c2 = await columns(page, panel.label);
        await page.mouse.move(c2.xs[2], c2.top - 30);
        await page.mouse.move(c2.xs[2], c2.midY);
        if (!(await tipRect(page))) { ok(false, `${width} ${panel.name}: tooltip did not reopen before ${name}`); continue; }
        await act();
        ok(await tipRect(page) === null, `${width} ${panel.name}: ${name} closes the tooltip`);
        if (name === "Escape") await page.goto(`${BASE}/dashboard?panel=${panel.id}&mock=instant`, { waitUntil: "networkidle" });
      }
      await page.waitForSelector(`svg[aria-label^="${panel.label}"]`);
    }
    // layout stability
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    ok(!scroll, `${width}: no horizontal scroll`);
    console.log(`${width} errors:`, page.errors.filter(e => !/preload/.test(e)));
    await page.context().close();
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
