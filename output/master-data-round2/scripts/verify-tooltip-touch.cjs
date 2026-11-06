// Stage 2 on a phone (390 x 844): a tap shows a small card on the top edge, away from the touched column; a touch outside closes it.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label) => { console.log(cond ? "PASS" : "FAIL", label); if (!cond) process.exitCode = 1; };
const SHOTS = process.env.SHOT_DIR;
const PANELS = [["ticket-volume", "Grafik volume", "volume"], ["shift-traffic", "Grafik tren trafik", "traffic"], ["ticket-mom", "Grafik komparasi", "mom"], ["resolution-trend", "Grafik tren durasi", "resolution"]];
const tip = page => page.evaluate(() => { const t = document.querySelector("[data-chart-tooltip]"); if (!t) return null; const r = t.getBoundingClientRect(), c = t.offsetParent.getBoundingClientRect(); return { left: r.left - c.left, right: c.right - r.right, top: r.top - c.top, width: r.width, text: t.innerText.replace(/\s+/g, " ").slice(0, 60) }; });
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 390, height: 844, touch: true });
  for (const [id, label, name] of PANELS) {
    await page.goto(`${BASE}/dashboard?panel=${id}&mock=instant`, { waitUntil: "networkidle" });
    await page.waitForSelector(`svg[aria-label^="${label}"]`, { timeout: 20000 });
    await page.waitForTimeout(500);
    const box = await page.locator(`svg[aria-label^="${label}"]`).boundingBox();
    for (const [side, fx] of [["left", 0.25], ["right", 0.8]]) {
      await page.touchscreen.tap(box.x + box.width * fx, box.y + box.height / 2);
      await page.waitForTimeout(150);
      const t = await tip(page);
      ok(!!t, `${name}: tap on the ${side} part shows the tooltip`);
      if (!t) continue;
      ok(t.top >= 0 && t.top <= 12, `${name}: card sits on the top edge (${Math.round(t.top)}px)`);
      ok(t.left >= 0 && t.right >= 0, `${name}: card inside the chart (${Math.round(t.left)}px / ${Math.round(t.right)}px)`);
      const tipBox = await page.locator("[data-chart-tooltip]").boundingBox();
      const touchedX = box.x + box.width * fx;
      ok(touchedX < tipBox.x || touchedX > tipBox.x + tipBox.width, `${name}: card is on the side away from the ${side} touch`);
      if (name === "volume" && side === "left") await page.screenshot({ path: `${SHOTS}/tip-volume-touch-after.png` });
    }
    await page.touchscreen.tap(200, 30); // the header, outside the chart
    await page.waitForTimeout(150);
    ok(await tip(page) === null, `${name}: touch outside the chart closes the tooltip`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    ok(!overflow, `${name}: no horizontal scroll`);
  }
  console.log("errors:", page.errors.filter(e => !/preload/.test(e)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
