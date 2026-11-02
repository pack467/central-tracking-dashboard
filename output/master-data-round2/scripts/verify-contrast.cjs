// Contrast of every palette chip (text on its own tinted fill over the surface it sits on): WCAG ratio, lowest reported.
const { launch, BASE } = require("./pw.cjs");
const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
(async () => {
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`${BASE}/master-data?group=tickets&tab=categories&mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-master-id]:visible");
  await page.getByRole("button", { name: /^Ubah Maintenance/ }).first().click();
  await page.waitForSelector("form");
  const names = await page.$$eval("[role=radiogroup][aria-label='Warna pengenal'] [role=radio]", els => els.map(e => e.getAttribute("aria-label")));
  const rows = [];
  for (const name of names) {
    await page.getByRole("radio", { name, exact: true }).click();
    const chip = await page.evaluate(() => {
      const rgba = css => { const c = document.createElement('canvas'); c.width = c.height = 1; const g = c.getContext('2d'); g.clearRect(0, 0, 1, 1); g.fillStyle = css; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; }; const el = [...document.querySelectorAll("form span")].find(s => /rounded-full/.test(s.className) && /border/.test(s.className) && s.textContent.trim() === "Maintenance"); const cs = getComputedStyle(el); const surface = getComputedStyle(el.closest("form")).backgroundColor; return { color: rgba(cs.color), bg: rgba(cs.backgroundColor) }; });
    // the surface behind the form body is the modal panel; the list uses #1e293b. Test both.
    const textColor = chip.color, fill = chip.bg;
    const result = {};
    for (const [label, hex] of [["tabel #1e293b", "#1e293b"], ["form #0f172a", "#0f172a"]]) {
      const surface = { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16), a: 1 };
      result[label] = ratio(textColor, over(fill, surface));
    }
    rows.push({ name, ...result });
  }
  for (const row of rows) console.log(`${row.name.padEnd(12)} tabel ${row["tabel #1e293b"].toFixed(2)}   form ${row["form #0f172a"].toFixed(2)}`);
  const lowest = rows.reduce((a, b) => Math.min(a, b["tabel #1e293b"], b["form #0f172a"]), 99);
  console.log(`lowest chip text contrast: ${lowest.toFixed(2)}:1  ${lowest >= 4.5 ? "PASS (>= 4.5)" : "FAIL"}`);
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
