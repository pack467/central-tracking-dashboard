// Hovering across a chart must not shift the layout (CLS = 0), at every width, for every chart.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label) => { console.log(cond ? "PASS" : "FAIL", label); if (!cond) process.exitCode = 1; };
const PANELS = [["ticket-volume", "Grafik volume"], ["shift-traffic", "Grafik tren trafik"], ["ticket-mom", "Grafik komparasi"], ["resolution-trend", "Grafik tren durasi"]];
(async () => {
  const browser = await launch();
  for (const width of [1920, 1440, 1024, 768, 390]) {
    const touch = width < 500;
    const page = await open(browser, { width, height: width > 1000 ? 1000 : 900, touch });
    for (const [id, label] of PANELS) {
      await page.goto(`${BASE}/dashboard?panel=${id}&mock=instant`, { waitUntil: "networkidle" });
      await page.waitForSelector(`svg[aria-label^="${label}"]`, { timeout: 20000 });
      await page.waitForTimeout(700);
      await page.evaluate(() => { window.__cls = 0; new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: false }); });
      const box = await page.locator(`svg[aria-label^="${label}"]`).boundingBox();
      for (let i = 0; i <= 24; i++) {
        const x = box.x + 10 + (box.width - 20) * i / 24, y = box.y + box.height / 2;
        if (touch) await page.touchscreen.tap(x, y); else await page.mouse.move(x, y);
        await page.waitForTimeout(25);
      }
      const clipped = await page.evaluate(() => { const t = document.querySelector("[data-chart-tooltip]"); if (!t) return "no tooltip"; const r = t.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight ? `clipped ${JSON.stringify([r.left, r.right, r.top, r.bottom].map(Math.round))}` : "fits"; });
      const cls = await page.evaluate(() => window.__cls);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      ok(cls === 0 && clipped === "fits" && !scroll, `${width} ${id}: CLS ${cls}, tooltip ${clipped}, horizontal scroll ${scroll}`);
    }
    await page.context().close();
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
