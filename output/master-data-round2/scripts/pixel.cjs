const fs = require("fs");
const { launch, BASE, OUT } = require("./pw.cjs");
const BASELINE = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round1/after/";
const PAGES = [["dashboard", "/dashboard"], ["tickets", "/tickets"], ["monitoring", "/monitoring"], ["shift-log", "/shift-log"], ["reports", "/reports"], ["team-roster", "/team-roster?view=table"], ["runbooks", "/runbooks"], ["notifications", "/notifications"], ["profile", "/profile"]];
const only = process.argv[2];
(async () => {
  const browser = await launch();
  const results = [];
  const dir = OUT + "pixel/"; fs.mkdirSync(dir, { recursive: true });
  const cmp = await browser.newPage();
  for (const width of [1440, 390]) {
    for (const [name, url] of PAGES) {
      if (only && only !== name) continue;
      const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, deviceScaleFactor: 1 }); await require("./pw.cjs").seedAuth(context);
      const page = await context.newPage();
      await page.goto(BASE + url, { waitUntil: "networkidle" });
      await page.waitForTimeout(2500);
      await page.clock.setFixedTime(new Date("2026-10-26T13:17:00.000Z"));
      await page.waitForTimeout(1500);
      const file = `${name}-${width}.png`;
      await page.screenshot({ path: dir + file, fullPage: true });
      await context.close();
      const baseFile = BASELINE + file;
      if (!fs.existsSync(baseFile)) { results.push({ file, note: "no baseline" }); continue; }
      const a = fs.readFileSync(baseFile).toString("base64"), b = fs.readFileSync(dir + file).toString("base64");
      const result = await cmp.evaluate(async ([a, b]) => {
        const load = src => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = "data:image/png;base64," + src; });
        const [x, y] = await Promise.all([load(a), load(b)]);
        const w = Math.max(x.width, y.width), h = Math.max(x.height, y.height);
        const data = img => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.drawImage(img, 0, 0); return g.getImageData(0, 0, w, h).data; };
        const p = data(x), q = data(y); let exact = 0, over = 0;
        for (let i = 0; i < p.length; i += 4) { const d = Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2])); if (d > 0) exact++; if (d > 16) over++; }
        return { size: [x.width, x.height, y.width, y.height], exactPercent: +(exact * 100 / (w * h)).toFixed(4), over16Percent: +(over * 100 / (w * h)).toFixed(4) };
      }, [a, b]);
      results.push({ file, ...result });
      console.log(file, JSON.stringify(result));
    }
  }
  fs.writeFileSync(OUT + "pixel-diff.json", JSON.stringify(results, null, 2));
  await browser.close();
})().catch(error => { console.error("FAIL", error); process.exit(1); });
