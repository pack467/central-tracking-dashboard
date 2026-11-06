const fs = require("fs");
const { launch, open, BASE, OUT } = require("./pw.cjs");
const TONES = [
  "border-sky-400/35 bg-sky-950 text-sky-200", "border-violet-400/35 bg-violet-950 text-violet-200", "border-emerald-400/35 bg-emerald-950 text-emerald-300", "border-amber-400/35 bg-amber-950 text-amber-300",
  "border-rose-400/35 bg-rose-950 text-rose-300", "border-cyan-400/35 bg-cyan-950 text-cyan-200", "border-lime-400/35 bg-lime-950 text-lime-300", "border-indigo-400/35 bg-indigo-950 text-indigo-200",
  "border-slate-600 bg-slate-800 text-slate-300", "border-emerald-400/35 bg-emerald-950 text-emerald-300", "border-slate-600 bg-slate-800 text-slate-300", "border-rose-400/35 bg-rose-950 text-rose-300",
];
(async () => {
  const browser = await launch();
  const page = await open(browser);
  await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  await page.goto(`${BASE}/master-data?group=team&tab=people&mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(1500);
  const ratios = await page.evaluate(classes => {
    const c = document.createElement("canvas").getContext("2d");
    const rgb = color => { c.clearRect(0, 0, 1, 1); c.fillStyle = "#000"; c.fillStyle = color; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    return [...new Set(classes)].map(cls => { const el = document.createElement("span"); el.className = cls; document.body.appendChild(el); const s = getComputedStyle(el), fg = rgb(s.color), bg = rgb(s.backgroundColor); el.remove(); const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x); return { cls, ratio: +((a + 0.05) / (b + 0.05)).toFixed(2) }; });
  }, TONES);
  const cls = await page.evaluate(() => window.__cls);
  // list-level CLS: interact (open form) and measure again
  await page.getByRole("button", { name: "Tambah Personel" }).first().click(); await page.waitForTimeout(600);
  const cls2 = await page.evaluate(() => window.__cls);
  console.log(JSON.stringify({ cls: +cls.toFixed(5), clsAfterOpeningForm: +cls2.toFixed(5), lowest: ratios.sort((a, b) => a.ratio - b.ratio).slice(0, 4), all: ratios.length }, null, 1));
  fs.writeFileSync(OUT + "metrics.json", JSON.stringify({ cls, cls2, ratios }, null, 1));
  await browser.close();
})();
