// Alignment of every Master Data table: header text vs cell content per column, row heights, wrapping, last action icon.
// Usage: node verify-md-tables.cjs [width]   (default 1440)
const { launch, open, BASE } = require("./pw.cjs");
const width = Number(process.argv[2] || 1440);
const TABS = [["Organisasi", "services", "organizations"], ["Proyek", "services", "projects"], ["Sistem", "services", "systems"], ["Kategori", "tickets", "categories"], ["Severity", "tickets", "severities"], ["Personel", "team", "people"], ["Peran", "team", "roles"]];
(async () => {
  const browser = await launch();
  const page = await open(browser, { width, height: 900 });
  let failures = 0;
  for (const [name, group, tab] of TABS) {
    await page.goto(`${BASE}/master-data?group=${group}&tab=${tab}&mock=instant`, { waitUntil: "networkidle" });
    await page.waitForSelector("table [data-master-id]", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    const result = await page.evaluate(() => {
      const table = document.querySelector("table[aria-label^='Daftar']");
      if (!table || table.offsetParent === null) return { hidden: true, scrollX: document.documentElement.scrollWidth > innerWidth };
      const ths = [...table.querySelectorAll("thead th")].filter(th => th.offsetParent !== null);
      const rows = [...table.querySelectorAll("tbody tr")];
      const textRect = el => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect(); };
      const columns = ths.map((th, index) => {
        const right = getComputedStyle(th).textAlign === "right", head = textRect(th);
        const cells = rows.map(row => [...row.children].filter(td => td.offsetParent !== null)[index]);
        const edges = cells.map(td => {
          const glyph = [...td.querySelectorAll("svg")].pop();
          const box = th.textContent.trim().toUpperCase() === "AKSI" && glyph ? glyph.getBoundingClientRect() : textRect(td);
          return right ? box.right : box.left;
        });
        const ref = right ? head.right : head.left;
        const worst = Math.max(...edges.map(edge => Math.abs(edge - ref)));
        return { label: th.textContent.trim(), align: right ? "right" : "left", head: +ref.toFixed(1), worst: +worst.toFixed(2), spread: +(Math.max(...edges) - Math.min(...edges)).toFixed(2) };
      });
      const heights = rows.map(row => Math.round(row.getBoundingClientRect().height * 10) / 10);
      const wrapped = rows.filter(row => [...row.querySelectorAll("td span.truncate, td span.block")].some(el => el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).whiteSpace !== "normal")).length;
      const tableBox = table.getBoundingClientRect(), wrap = table.parentElement.parentElement.getBoundingClientRect();
      const footer = table.parentElement.parentElement.querySelector("footer")?.getBoundingClientRect();
      return { rows: rows.length, columns, heights: [...new Set(heights)], wrapped, scrollX: document.documentElement.scrollWidth > innerWidth, tableLeft: +tableBox.left.toFixed(1), wrapLeft: +wrap.left.toFixed(1), footerEdge: footer ? [+footer.left.toFixed(1), +footer.right.toFixed(1)] : null, wrapRight: +wrap.right.toFixed(1), tableRight: +tableBox.right.toFixed(1) };
    });
    if (result.hidden) { console.log(`${name}: table hidden at ${width}px (cards). horizontal scroll: ${result.scrollX}`); continue; }
    const bad = result.columns.filter(column => column.worst > 1);
    // Aksi may differ a little between rows with and without a menu button; the cells are right aligned so only the last icon matters
    console.log(`${name} @${width}: ${result.rows} rows, heights ${JSON.stringify(result.heights)}, wrapped ${result.wrapped}, h-scroll ${result.scrollX}`);
    for (const column of result.columns) console.log(`   ${column.label.padEnd(18)} ${column.align.padEnd(5)} header ${column.head}  worst gap ${column.worst}px  spread ${column.spread}px${column.worst > 1 ? "  <-- OVER 1px" : ""}`);
    console.log(`   table ${result.tableLeft}-${result.tableRight}  frame ${result.wrapLeft}-${result.wrapRight}  footer ${JSON.stringify(result.footerEdge)}`);
    if (bad.length || result.heights.length !== 1 || result.scrollX || result.wrapped) failures++;
  }
  console.log(failures ? `FAIL: ${failures} table(s) outside tolerance` : "ALL TABLES WITHIN TOLERANCE");
  console.log("page errors:", JSON.stringify(page.errors.slice(0, 5)));
  await browser.close();
})().catch(error => { console.log("FAIL", error.message.split("\n")[0]); process.exitCode = 1; });
