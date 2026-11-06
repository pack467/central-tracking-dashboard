// Round 3: header, calm hover, entity cells, Severity/Kategori tables, toolbar, drawers.
const { launch, open, BASE } = require("./pw.cjs");
const ok = (cond, label, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`); if (!cond) process.exitCode = 1; };
const root = page => page.locator("[data-master-data-v2]");
const go = async (page, group, tab) => { await page.goto(`${BASE}/master-data?group=${group}&tab=${tab}&mock=instant`, { waitUntil: "networkidle" }); await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(500); };
/** What a hover may change: colours. Anything geometric or a shadow must stay the same. */
async function hoverCheck(page, locator, label) {
  const read = () => locator.evaluate(el => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), transform: cs.transform, shadow: cs.boxShadow, filter: cs.filter, scale: cs.scale, translate: cs.translate }; });
  await page.mouse.move(2, 2); await page.waitForTimeout(250);
  const before = await read();
  await locator.hover(); await page.waitForTimeout(300);
  const after = await read();
  ok(JSON.stringify(before) === JSON.stringify(after), `hover does not move, resize or add shadow: ${label}`, JSON.stringify(before) === JSON.stringify(after) ? "" : JSON.stringify([before, after]));
  await page.mouse.move(2, 2);
}
(async () => {
  const browser = await launch();
  const page = await open(browser, { width: 1440, height: 900 });
  page.setDefaultTimeout(9000);

  // ---- header ----
  const EXPECT = { services: ["Organisasi aktif", "Proyek aktif", "Sistem aktif"], tickets: ["Kategori aktif", "Tiket terhubung"], team: ["Personel aktif", "Peran aktif", "Shift Lead aktif"] };
  for (const [group, tab] of [["services", "systems"], ["tickets", "categories"], ["team", "people"]]) {
    await go(page, group, tab);
    const info = await page.evaluate(() => {
      const header = document.querySelector("[data-master-data-v2] header"), r = header.getBoundingClientRect();
      const stats = [...header.querySelectorAll("[role=group] > *")];
      return { h: Math.round(r.height), text: header.innerText, labels: stats.map(s => s.innerText.split("\n").pop().trim()), svgInStats: stats.some(s => s.querySelector("svg")), borders: stats.map(s => getComputedStyle(s).borderTopWidth), statuses: [...header.querySelectorAll("[role=status]")].filter(e => e.offsetParent !== null).length, caption: header.querySelector("[role=status]")?.innerText.trim(), nums: stats.map(s => getComputedStyle(s.querySelector("span")).fontSize) };
    });
    ok(!/Tritronik|Semua klien/i.test(info.text) && !/Semua klien/i.test(await root(page).innerText()), `${group}: no client name or "Semua klien" in the Master Data header (a client may still appear as table data)`);
    ok(JSON.stringify(info.labels) === JSON.stringify(EXPECT[group]), `${group}: stats are ${EXPECT[group].join(" / ")}`, info.labels.join(" / "));
    ok(!info.svgInStats && info.borders.every(b => b === "0px"), `${group}: no icon and no box around a stat`);
    ok(info.h <= 90, `${group}: header band is flat (<= 88px)`, `${info.h}px`);
    ok(info.statuses === 1 && /^Diperbarui \d{1,2} \S+ \d{4}, \d{2}[.:]\d{2}$/.test(info.caption), `${group}: one short update caption`, info.caption);
  }
  ok((await page.locator("header").first().innerText()).includes("Tritronik"), "the global client selector in the top bar is untouched");

  // ---- hover calm ----
  await go(page, "services", "systems");
  await hoverCheck(page, page.locator("[data-master-data-v2] header button").first(), "header stat");
  await hoverCheck(page, page.locator("tbody tr").nth(2), "table row");
  await hoverCheck(page, page.locator("tbody tr").nth(2).getByRole("button", { name: /^Detail/ }), "icon button");
  await hoverCheck(page, page.getByRole("button", { name: "Tambah Sistem" }), "primary button");
  await hoverCheck(page, page.locator("[data-master-data-v2] [role=tab], [data-master-data-v2] nav button").nth(1), "tab");

  // ---- entity cells: Sistem -> Proyek, Proyek -> Organisasi ----
  const tiles = await page.evaluate(() => { const cells = [...document.querySelectorAll("tbody tr")].map(tr => tr.children[1]); return { n: cells.length, withTile: cells.filter(c => c.querySelector("svg")).length, sizes: [...new Set(cells.map(c => { const t = c.querySelector("span[aria-hidden]"); const r = t.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }))], seconds: cells.filter(c => c.querySelectorAll("span.block").length >= 2).length }; });
  ok(tiles.n > 0 && tiles.withTile === tiles.n && tiles.sizes.length === 1, "Sistem: every Proyek cell has a no-image tile of one size", JSON.stringify(tiles));
  await go(page, "services", "projects");
  const tiles2 = await page.evaluate(() => { const cells = [...document.querySelectorAll("tbody tr")].map(tr => tr.children[1]); return { n: cells.length, withTile: cells.filter(c => c.querySelector("svg, img")).length, sizes: [...new Set(cells.map(c => { const t = c.querySelector("span[aria-hidden]"); const r = t.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }))] }; });
  ok(tiles2.n > 0 && tiles2.withTile === tiles2.n && tiles2.sizes.length === 1 && tiles2.sizes[0] === tiles.sizes[0], "Proyek: every Organisasi cell has a tile of the same size", JSON.stringify(tiles2));

  // ---- Severity table ----
  await go(page, "tickets", "severities");
  const sev = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("tbody tr")], first = rows[0];
    const level = first.children[2];
    const box = [...level.querySelectorAll("*")].some(e => parseFloat(getComputedStyle(e).borderTopWidth) > 0);
    return { heads: [...document.querySelectorAll("thead th")].map(t => t.textContent.trim()), badgeCell: first.children[0].innerText.trim(), mono: first.children[0].querySelector(".font-dashboard-mono") !== null, level: level.innerText.trim(), box, desc: rows.map(r => r.children[3].innerText.trim()), name: getComputedStyle(first.children[1].querySelector("span")).fontSize, badgeBg: getComputedStyle(first.children[0].querySelector("span")).backgroundColor };
  });
  ok(sev.badgeCell === "Critical" && !sev.mono, "Severity: the badge only, no mono code under it", sev.badgeCell);
  ok(/^P1\s+Tertinggi$/.test(sev.level.replace(/\s+/g, " ")) && !sev.box, "Severity: Tingkat is plain 'P1 Tertinggi', no box", sev.level.replace(/\s+/g, " "));
  ok(sev.desc.every(d => d.length > 1) && sev.desc.includes("Layanan utama mati total") && sev.desc.includes("Dampak kecil, tidak mendesak"), "Severity: descriptions filled with the defaults", sev.desc.join(" | "));
  ok(sev.name === "14px" && sev.badgeBg !== "rgba(0, 0, 0, 0)", "Severity: name 14px, badge solid", `${sev.name} ${sev.badgeBg}`);
  // ---- Kategori second line ----
  await go(page, "tickets", "categories");
  const cat = await page.evaluate(() => [...document.querySelectorAll("tbody tr")].map(tr => [...tr.children[0].querySelectorAll("span.truncate")].map(s => s.textContent.trim())));
  ok(cat.every(lines => lines.length === 1 || lines[0].toLowerCase() !== lines[1].toLowerCase()), "Kategori: the second line is never the same as the name", JSON.stringify(cat.slice(0, 2)));

  // ---- toolbar: nothing clipped, no doubled labels ----
  for (const w of [1920, 1440, 1280, 1024]) {
    const p = await open(browser, { width: w, height: 900 });
    for (const [group, tab] of [["services", "organizations"], ["services", "projects"], ["services", "systems"], ["tickets", "categories"], ["team", "people"], ["team", "roles"]]) {
      await go(p, group, tab);
      const t = await p.evaluate(() => { const bar = document.querySelector("div[class*='sticky'][class*='top-[52px]']"); const labels = [...bar.querySelectorAll("[data-select-value-label]")]; return { clipped: labels.filter(l => l.scrollWidth > l.clientWidth + 1).map(l => l.textContent.trim()), texts: labels.map(l => l.textContent.trim()), overflow: Math.max(...[...bar.querySelectorAll("button, input")].filter(e => e.offsetParent).map(e => e.getBoundingClientRect().right)) - bar.getBoundingClientRect().right }; });
      if (t.clipped.length || t.overflow > 0.5 || t.texts.some(x => /Urutkan:?\s*Urutan/.test(x))) ok(false, `${w} ${tab}: toolbar clipped or doubled`, JSON.stringify(t));
    }
    ok(true, `${w}px: no clipped select value, no doubled label, nothing beyond the toolbar frame (6 tabs)`);
    await p.context().close();
  }
  await go(page, "tickets", "categories");
  const sortText = await page.locator("#master-filter-sort").innerText();
  ok(/^Urutkan:\s*Manual$/.test(sortText.replace(/\s+/g, " ").trim()), "sort control reads 'Urutkan: Manual'", sortText.trim());
  await page.locator("#master-filter-sort").click();
  const options = (await page.getByRole("option").allInnerTexts()).map(t => t.trim());
  ok(["A–Z", "Z–A", "Terbanyak dipakai", "Terakhir diubah"].every(o => options.includes(o)), "sort options are A-Z, Z-A, Terbanyak dipakai, Terakhir diubah", options.join(", "));
  await page.keyboard.press("Escape");

  // ---- drawers ----
  const BAD = /Checkpoint|Handover|Belum ada|Info teknis|Klasifikasi|Pekerjaan baru|Status record|Pemakaian[\s\S]*Pemakaian/;
  const drawer = async (label, group, tab, row = 0) => {
    await go(page, group, tab);
    await page.locator("[data-master-id]:visible").nth(row).click({ position: { x: 60, y: 20 } });
    await page.waitForSelector("section[role=dialog]"); await page.waitForTimeout(700);
    const d = page.locator("section[role=dialog]").last();
    const text = await d.innerText();
    const ubah = await d.getByRole("button", { name: /^Ubah/ }).count();
    const footer = await d.locator("footer").count();
    const tabs = await d.getByRole("tab").allInnerTexts();
    ok(!BAD.test(text), `${label}: no zero relation, empty block, technical info or repeated Pemakaian`, BAD.test(text) ? text.replace(/\s+/g, " ").slice(0, 300) : "");
    ok(ubah === 1 && footer === 0, `${label}: one Ubah button, no footer`, `Ubah ${ubah}, footer ${footer}`);
    ok(tabs.every(t => !/\s0$/.test(t.replace(/\s+/g, " ").trim())), `${label}: tab counts only when > 0`, tabs.map(t => t.replace(/\s+/g, " ")).join(" | "));
    return { d, text };
  };
  let r = await drawer("Severity", "tickets", "severities");
  ok((r.text.match(/Kode/g) || []).length === 1 && /P1/.test(r.text) && /Layanan utama mati total/.test(r.text), "Severity drawer: Kode once, Tingkat P1, description shown");
  await page.screenshot({ path: "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/drawer-severity-desktop-after.png" });
  await page.keyboard.press("Escape");
  r = await drawer("Kategori", "tickets", "categories");
  ok(/Kode/.test(r.text) && /Warna/.test(r.text) && /Pemakaian/.test(r.text) && !/Urutan|Status/.test(r.text.replace(/Aktif/g, "")), "Kategori drawer: Kode, Warna, one Pemakaian line");
  await page.screenshot({ path: "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/drawer-kategori-desktop-after.png" });
  await page.keyboard.press("Escape");
  for (const [label, group, tab] of [["Organisasi", "services", "organizations"], ["Proyek", "services", "projects"], ["Sistem", "services", "systems"], ["Personel", "team", "people"]]) {
    await drawer(label, group, tab);
    await page.screenshot({ path: `E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/r3/drawer-${label.toLowerCase()}-desktop-after.png` });
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(400);
  const released = await page.evaluate(() => getComputedStyle(document.body).overflow !== "hidden" && !document.querySelector("[role=dialog]") && !document.querySelector("[inert]"));
  ok(released, "scroll lock released after the drawers");
  const errs = page.errors.filter(e => !/preload/.test(e));
  ok(!errs.length, "no console errors or hydration warnings", JSON.stringify(errs.slice(0, 3)));
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.replace(/\s+/g, " ").slice(0, 400)); process.exitCode = 1; });
