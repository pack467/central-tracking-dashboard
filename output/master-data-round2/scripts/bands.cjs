const fs = require("fs");
const { launch, OUT } = require("./pw.cjs");
(async () => {
  const browser = await launch(); const cmp = await browser.newPage();
  const a = fs.readFileSync("E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round1/after/team-roster-390.png").toString("base64"), b = fs.readFileSync(OUT + "pixel/team-roster-390.png").toString("base64");
  const r = await cmp.evaluate(async ([a, b]) => {
    const load = s => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = "data:image/png;base64," + s; });
    const [x, y] = await Promise.all([load(a), load(b)]); const w = x.width, h = x.height;
    const d = i => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.drawImage(i, 0, 0); return g.getImageData(0, 0, w, h).data; };
    const p = d(x), q = d(y), bands = {};
    for (let yy = 0; yy < h; yy++) { let n = 0, minx = w, maxx = 0; for (let xx = 0; xx < w; xx++) { const i = (yy * w + xx) * 4; if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 48) { n++; minx = Math.min(minx, xx); maxx = Math.max(maxx, xx); } } if (n) { const k = Math.floor(yy / 100) * 100; (bands[k] ||= { n: 0, minx: w, maxx: 0 }); bands[k].n += n; bands[k].minx = Math.min(bands[k].minx, minx); bands[k].maxx = Math.max(bands[k].maxx, maxx); } }
    return bands;
  }, [a, b]);
  console.log(JSON.stringify(r)); await browser.close();
})();
