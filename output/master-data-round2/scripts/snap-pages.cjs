// Proves "the other pages did not change": a screenshot of every non-Master-Data page and the dashboard's panel viewers at 1440 and 390,
// compared with a stored baseline (top 60px and, when wide, the sidebar are skipped: the live clock and the shift widget are not frozen).
//   node snap-pages.cjs baseline   |   node snap-pages.cjs compare
const fs = require("fs");
const path = require("path");
const { launch, open, BASE } = require("./pw.cjs");
const MODE = process.argv[2] || "compare";
const ROOT = path.join(__dirname, "..", "pages-snap");
const DIR = path.join(ROOT, MODE === "baseline" ? "baseline" : "current");
fs.mkdirSync(DIR, { recursive: true });
const PAGES = [["dashboard", "/dashboard"], ["tickets", "/tickets"], ["tickets-escalations", "/tickets/escalations"], ["monitoring", "/monitoring"], ["shift-log", "/shift-log"], ["reports", "/reports"], ["reports-ticket-log", "/reports/ticket-log"], ["team-roster", "/team-roster"], ["runbooks", "/runbooks"], ["notifications", "/notifications"], ["profile", "/profile"],
  ["panel-category", "/dashboard?panel=category-distribution"], ["panel-severity", "/dashboard?panel=severity-distribution"], ["panel-volume", "/dashboard?panel=ticket-volume"], ["panel-mom", "/dashboard?panel=ticket-mom"], ["panel-traffic", "/dashboard?panel=shift-traffic"], ["panel-resolution", "/dashboard?panel=resolution-trend"], ["panel-recap", "/dashboard?panel=user-recap"]];

async function pngDiff(browser, a, b) {
  if (fs.readFileSync(a).equals(fs.readFileSync(b))) return 0;
  const page = await browser.newPage();
  const ratio = await page.evaluate(async ([x, y]) => {
    const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return 1;
    const draw = i => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d"); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const da = draw(ia), db = draw(ib); let n = 0;
    const wide = ia.width >= 1280;
    for (let p = 60 * ia.width * 4; p < da.length; p += 4) if ((!wide || (p / 4) % ia.width >= 250) && Math.abs(da[p] - db[p]) + Math.abs(da[p + 1] - db[p + 1]) + Math.abs(da[p + 2] - db[p + 2]) > 6) n++;
    return n / (da.length / 4);
  }, ["data:image/png;base64," + fs.readFileSync(a).toString("base64"), "data:image/png;base64," + fs.readFileSync(b).toString("base64")]);
  await page.close();
  return ratio;
}

(async () => {
  const browser = await launch();
  const errors = [];
  for (const [width, height, touch] of [[1440, 900, false], [390, 844, true]]) {
    for (const [name, url] of PAGES) {
      const page = await open(browser, { width, height, touch });
      await page.goto(`${BASE}${url}${url.includes("?") ? "&" : "?"}mock=instant`, { waitUntil: "networkidle" }).catch(() => {});
      await page.waitForTimeout(1800);
      await page.screenshot({ path: path.join(DIR, `${width}-${name}.png`) });
      errors.push(...page.errors.filter(e => !/preload|Weekly report/.test(e)));
      await page.context().close();
    }
    console.log(`captured ${PAGES.length} pages at ${width}`);
  }
  if (errors.length) console.log("console errors:", errors.slice(0, 4));
  if (MODE === "baseline") { console.log("baseline stored in", DIR); await browser.close(); return; }
  let diff = 0, worst = 0;
  for (const [width] of [[1440], [390]]) for (const [name] of PAGES) {
    const r = await pngDiff(browser, path.join(ROOT, "baseline", `${width}-${name}.png`), path.join(DIR, `${width}-${name}.png`));
    worst = Math.max(worst, r);
    if (r > 0.005) { diff++; console.log(`DIFFERENT ${width}-${name}: ${(r * 100).toFixed(3)}% of pixels`); }
  }
  console.log(diff ? `${diff} page(s) differ by more than 0.5% (largest ${(worst * 100).toFixed(3)}%)` : `IDENTICAL within 0.5%: ${PAGES.length * 2} pages (largest difference ${(worst * 100).toFixed(4)}%)`);
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
