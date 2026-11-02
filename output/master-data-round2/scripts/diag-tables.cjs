// Alignment of every Master Data table: header text x vs cell content x per column, row heights, last action icon vs the AKSI header edge.
const { launch, open, BASE } = require("./pw.cjs");
const TABS = [["organizations", "group=services&tab=organizations"], ["projects", "group=services&tab=projects"], ["systems", "group=services&tab=systems"], ["categories", "group=tickets&tab=categories"], ["severities", "group=tickets&tab=severities"], ["people", "group=team&tab=people"], ["roles", "group=team&tab=roles"]];
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900 });
  for (const [name, query] of TABS) {
    await page.goto(`${BASE}/master-data?${query}&mock=instant`, { waitUntil: "networkidle" });
    await page.waitForSelector("table tbody tr", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    const result = await page.evaluate(() => {
      const table = document.querySelector("table"); if (!table) return null;
      const heads = [...table.querySelectorAll("thead th")];
      const rows = [...table.querySelectorAll("tbody tr")].slice(0, 8);
      const textLeft = el => { const range = document.createRange(); range.selectNodeContents(el); const r = range.getBoundingClientRect(); return r.width ? r.left : el.getBoundingClientRect().left; };
      const textRight = el => { const range = document.createRange(); range.selectNodeContents(el); const r = range.getBoundingClientRect(); return r.width ? r.right : el.getBoundingClientRect().right; };
      const cols = heads.map((th, i) => {
        const cells = rows.map(row => row.children[i]).filter(Boolean);
        const hl = textLeft(th), hr = textRight(th), align = getComputedStyle(th).textAlign;
        const lefts = cells.map(cell => { const first = cell.firstElementChild || cell; return first.getBoundingClientRect().left; });
        const rights = cells.map(cell => { const kids = [...cell.querySelectorAll("*")].filter(e => e.getBoundingClientRect().width > 0); return Math.max(...kids.map(e => e.getBoundingClientRect().right), cell.getBoundingClientRect().left); });
        return { label: th.textContent.trim(), width: Math.round(th.getBoundingClientRect().width), headAlign: align, dxLeft: Math.round(Math.max(...lefts.map(l => Math.abs(l - hl))) * 10) / 10, dxRight: Math.round(Math.max(...rights.map(r => Math.abs(r - hr))) * 10) / 10, cellAlign: cells[0] ? getComputedStyle(cells[0]).textAlign : "" };
      });
      const heights = rows.map(r => Math.round(r.getBoundingClientRect().height));
      return { cols, heights, tableW: Math.round(table.getBoundingClientRect().width), rowCount: rows.length };
    });
    if (!result) { console.log(name, "no table"); continue; }
    console.log(`\n${name}: table ${result.tableW}px, row heights ${[...new Set(result.heights)].join("/")} (${result.rowCount} rows)`);
    for (const c of result.cols) console.log(`   ${c.label.padEnd(14)} w=${String(c.width).padStart(4)} head=${c.headAlign.padEnd(6)} cell=${c.cellAlign.padEnd(6)} left-gap=${String(c.dxLeft).padStart(5)} right-gap=${String(c.dxRight).padStart(5)}`);
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
