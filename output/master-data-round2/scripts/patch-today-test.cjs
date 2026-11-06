const fs = require("fs");
let s = fs.readFileSync("verify-dashboard-today.cjs", "utf8");
const must = (c, m) => { if (!c) throw new Error(m); };
const swap = (a, b, n = 1) => { must(s.split(a).length === n + 1, `expected ${n} of: ${a.slice(0, 70)}`); s = s.split(a).join(b); };
swap('const shown = async page => (await page.locator("body").innerText()).match(/Menampilkan\s+(\d+)\s+dari\s+(\d+)\s+Tiket/);',
`// waits until the page says "Menampilkan <expected> dari <total> Tiket": a render of all 3,649 tickets takes a moment
const shown = async (page, expected) => {
  const text = await page.waitForFunction(n => { const m = document.body.innerText.match(new RegExp("Menampilkan\\s+(" + n + ")\\s+dari\\s+(\\d+)\\s+Tiket")); return m ? m[0] : false; }, String(expected), { timeout: 90000 }).then(h => h.jsonValue()).catch(() => null);
  return text ? text.match(/Menampilkan\s+(\d+)\s+dari\s+(\d+)\s+Tiket/) : null;
};`);
swap("let m = await shown(page);", "let m = await shown(page, 0);");
const calls = [["Semua Waktu\" }).click(); await page.waitForTimeout(1800);\n  m = await shown(page);", 3649], ["first().click(); await page.waitForTimeout(1800);\n  m = await shown(page);", 0], ["await load(page, \"?date=2026-09-30\");\n  m = await shown(page);", 35], ["await load(page, \"?date=2026-09-01..2026-09-30\");\n  m = await shown(page);", 442], ["await load(page, \"?date=bogus\");\n  m = await shown(page);", 0], ["await load(page, \"?date=all\");\n  m = await shown(page);", 3649]];
for (const [pattern, n] of calls) swap(pattern, pattern.replace("shown(page)", `shown(page, ${n})`));
// "Reset Filter" is rendered after the heavy re-render: wait for it
swap('ok(await page.getByRole("button", { name: /Reset Filter/ }).count() >= 1, "\'Reset Filter\' appears when the filter is not the default");',
     'await page.getByRole("button", { name: /Reset Filter/ }).first().waitFor({ timeout: 60000 }).catch(() => {});\n  ok(await page.getByRole("button", { name: /Reset Filter/ }).count() >= 1, "\'Reset Filter\' appears when the filter is not the default");');
// load(): the count text is hidden on a phone, so wait for it to exist, not to be visible
swap('await page.getByText("Menampilkan").first().waitFor({ timeout: 90000 });', 'await page.getByText("Menampilkan").first().waitFor({ state: "attached", timeout: 90000 });');
fs.writeFileSync("verify-dashboard-today.cjs", s); console.log("patched");
