// Changing a category colour reaches every consumer at once: the same tab, a second tab (storage event), and reverts cleanly.
const { launch, BASE } = require("./pw.cjs");
const fs = require("fs");
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/colors/";
fs.mkdirSync(OUT, { recursive: true });
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
const SKY = "#38bdf8", RED = "#ef4444";
/** Donut segments and legend dots of the category panel, in page order. */
const colorsOf = page => page.evaluate(() => {
  const out = [];
  // the donut (any svg element of the layout with a hex fill/stroke) and, per row, its dot and bar
  document.querySelectorAll("[data-distribution-layout] svg *").forEach(el => {
    for (const attr of ["fill", "stroke"]) { const v = el.getAttribute(attr); if (v && v.startsWith("#")) out.push(v.toLowerCase()); }
  });
  document.querySelectorAll("[data-distribution-row]").forEach(row => out.push(`${row.getAttribute("data-distribution-row")}:${row.querySelector("circle")?.getAttribute("fill")}/${row.querySelector("rect")?.getAttribute("fill")}`));
  return out;
});
async function setColor(page, from, name) {
  await page.goto(`${BASE}/master-data?group=tickets&tab=categories&mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-master-id]:visible");
  await page.getByRole("button", { name: /^Ubah Maintenance/ }).first().click();
  await page.waitForSelector("form");
  await page.getByRole("radio", { name, exact: true }).click();
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page.waitForSelector("form", { state: "detached", timeout: 8000 });
}
(async () => {
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await require("./pw.cjs").seedAuth(context);
  await context.addInitScript(() => { window.__TEST_CLOCK__ = "2026-10-28T03:00:00.000Z"; });
  const a = await context.newPage(), b = await context.newPage();
  const errors = [];
  for (const page of [a, b]) { page.on("pageerror", e => errors.push(String(e).slice(0, 200))); }
  await b.goto(`${BASE}/dashboard?panel=category-distribution&mock=instant`, { waitUntil: "networkidle" });
  await b.waitForTimeout(1800);
  const before = await colorsOf(b);
  await b.screenshot({ path: OUT + "panel-before.png" });
  const row = list => list.find(item => item.startsWith("Maintenance:"));
  console.log("tab B before: Maintenance =", row(before), "| donut colours:", before.filter(v => v.startsWith("#")).join(","));
  await setColor(a, "sky", "Merah");
  await a.screenshot({ path: OUT + "master-after-red.png" });
  await b.waitForTimeout(1500);
  const live = await colorsOf(b);
  console.log("tab B live (no reload): Maintenance =", row(live), "| donut colours:", live.filter(v => v.startsWith("#")).join(","));
  await b.screenshot({ path: OUT + "panel-live-red.png" });
  await b.reload({ waitUntil: "networkidle" }); await b.waitForSelector("[data-distribution-row]", { timeout: 10000 }); await b.waitForTimeout(600);
  const reloaded = await colorsOf(b);
  console.log("tab B after reload: Maintenance =", row(reloaded), "| same as live:", JSON.stringify(reloaded) === JSON.stringify(live));
  // revert: Biru muda
  await setColor(a, "red", "Biru muda");
  await b.waitForTimeout(1500);
  const reverted = await colorsOf(b);
  console.log("tab B after revert: Maintenance =", row(reverted), "| identical to baseline:", JSON.stringify(reverted) === JSON.stringify(before));
  await b.screenshot({ path: OUT + "panel-reverted.png" });
  console.log("page errors:", JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
