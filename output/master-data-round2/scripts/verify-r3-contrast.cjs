// WCAG contrast of the round 3 text: date popover, severity badges, header, table text. Lowest is reported.
const { launch, open, BASE } = require("./pw.cjs");
const measure = (page, selectors) => page.evaluate(sels => {
  const rgba = css => { const c = document.createElement("canvas"); c.width = c.height = 1; const g = c.getContext("2d"); g.clearRect(0, 0, 1, 1); g.fillStyle = css; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; };
  const over = (t, u) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const background = el => { const chain = []; for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c.a > 0) chain.push(c); if (c.a === 1) break; } let base = { r: 15, g: 23, b: 42, a: 1 }; for (const c of chain.reverse()) base = over(c, base); return base; };
  return sels.map(([label, sel]) => { const el = typeof sel === "string" ? document.querySelector(sel) : null; if (!el) return [label, null]; const fg0 = rgba(getComputedStyle(el).color), bg = background(el), fg = over({ ...fg0, a: fg0.a * parseFloat(getComputedStyle(el).opacity) }, bg); const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a); return [label, +((hi + 0.05) / (lo + 0.05)).toFixed(2)]; });
}, selectors);
(async () => {
  const browser = await launch();
  const rows = [];
  const page = await open(browser, { width: 1440, height: 900 });
  page.setDefaultTimeout(9000);
  await page.goto(`${BASE}/master-data?group=tickets&tab=severities&mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(500);
  rows.push(...await measure(page, [
    ["header: number", "[data-master-data-v2] header [role=group] span"],
    ["header: label", "[data-master-data-v2] header [role=group] span + span"],
    ["header: caption", "[data-master-data-v2] header p[role=status]"],
    ["table: Critical badge", "tbody tr:nth-child(1) td:nth-child(1) span"],
    ["table: High badge", "tbody tr:nth-child(2) td:nth-child(1) span"],
    ["table: Medium badge", "tbody tr:nth-child(3) td:nth-child(1) span"],
    ["table: Low badge", "tbody tr:nth-child(4) td:nth-child(1) span"],
    ["table: Tingkat word", "tbody tr:nth-child(1) td:nth-child(3) span + span"],
    ["table: description", "tbody tr:nth-child(1) td:nth-child(4) span"],
  ]));
  await page.goto(`${BASE}/master-data?group=services&tab=systems&mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(500);
  rows.push(...await measure(page, [["table: second line (Proyek cell)", "tbody tr:nth-child(1) td:nth-child(2) span.text-slate-400"]]));
  await page.goto(`${BASE}/master-data?group=team&tab=people&mock=installed`.replace("installed", "instant"), { waitUntil: "networkidle" });
  await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Tambah Personel" }).first().click();
  await page.waitForSelector("form"); await page.waitForTimeout(400);
  const input = page.getByLabel("Tanggal bergabung", { exact: false }).first();
  await input.fill("04/01/2023");
  await page.getByRole("button", { name: "Buka kalender" }).click();
  const pop = page.getByRole("dialog", { name: "Pilih tanggal" }); await pop.waitFor(); await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelectorAll("[role=gridcell]").forEach((b, i) => b.setAttribute("data-i", String(i))); });
  const info = await page.evaluate(() => { const cells = [...document.querySelectorAll("[role=gridcell]")]; const pick = fn => cells.findIndex(fn); return { selected: pick(c => c.getAttribute("aria-selected") === "true"), normal: pick(c => c.className.includes("text-slate-100") && c.getAttribute("aria-selected") !== "true"), out: pick(c => c.className.includes("text-slate-400")), disabled: pick(c => c.disabled) }; });
  rows.push(...await measure(page, [
    ["date: selected day", `[role=gridcell][data-i="${info.selected}"]`],
    ["date: ordinary day", `[role=gridcell][data-i="${info.normal}"]`],
    ["date: day of another month (dim)", `[role=gridcell][data-i="${info.out}"]`],
    ["date: weekday header", "[role=columnheader]"],
    ["date: month title", "[aria-label='Pilih tanggal'] button[aria-haspopup=listbox]"],
    ["date: Hari ini", "[aria-label='Pilih tanggal'] button:last-of-type"],
  ]));
  console.log(rows.map(([l, v]) => `${String(v ?? "n/a").padStart(6)}  ${l}`).join("\n"));
  const nums = rows.filter(([, v]) => v !== null);
  const low = nums.reduce((a, b) => (b[1] < a[1] ? b : a));
  console.log(`lowest: ${low[1]}:1 (${low[0]})   ${nums.every(([, v]) => v >= 4.5) ? "ALL >= 4.5" : "BELOW 4.5: " + nums.filter(([, v]) => v < 4.5).map(([l, v]) => `${l} ${v}`).join("; ")}`);
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 300)); process.exitCode = 1; });
