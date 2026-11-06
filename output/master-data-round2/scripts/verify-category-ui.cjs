// Kategori tab end to end: toolbar, columns, add/edit/rename, validation, colour hint, "Atur urutan", status, new category in the ticket filter.
const { launch, BASE } = require("./pw.cjs");
const ok = (cond, label, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`); if (!cond) process.exitCode = 1; };
let shotPage;
(async () => {
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await require("./pw.cjs").seedAuth(context);
  await context.addInitScript(() => {
    window.__TEST_CLOCK__ = "2026-10-28T03:00:00.000Z";
    // count writes to the master store
    window.__masterWrites = 0;
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key === "ctd.masterData.v2") window.__masterWrites++; return set.call(this, key, value); };
  });
  const page = shotPage = await context.newPage(), other = await context.newPage();
  const errors = [];
  for (const p of [page, other]) { p.on("pageerror", e => errors.push(String(e).slice(0, 200))); p.on("console", m => { if (m.type() === "error" && !/preload/.test(m.text())) errors.push(m.text().slice(0, 200)); }); }
  const go = async () => { await page.goto(`${BASE}/master-data?group=tickets&tab=categories&mock=instant`, { waitUntil: "networkidle" }); await page.waitForSelector("[data-master-id]:visible"); await page.waitForTimeout(400); };
  await page.goto(`${BASE}/master-data?mock=instant`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("ctd.masterData.v2"));
  await go();

  // toolbar: one row
  const bar = await page.evaluate(() => {
    const pick = sel => [...document.querySelectorAll(sel)].map(el => el.getBoundingClientRect()).filter(r => r.width);
    const search = document.querySelector("input[type=search]").getBoundingClientRect();
    const selects = pick("button[data-select-trigger]").filter(r => r.top > 100 && r.top < 400);
    const buttons = [...document.querySelectorAll("button")].filter(b => /Atur urutan|Tambah Kategori/.test(b.textContent)).map(b => b.getBoundingClientRect());
    return { centers: [search, ...selects, ...buttons].map(r => Math.round(r.top + r.height / 2)), count: 1 + selects.length + buttons.length };
  });
  ok(new Set(bar.centers).size === 1 && bar.count >= 5, "toolbar is one row (search, Status, Urutkan, Atur urutan, Tambah)", JSON.stringify(bar.centers));

  // columns: no Urutan, no arrows, units with bar
  const headers = await page.$$eval("table thead th", els => els.map(e => e.textContent.trim()));
  ok(JSON.stringify(headers) === JSON.stringify(["Kategori", "Dipakai", "Status", "Aksi"]), "columns are Kategori / Dipakai / Status / Aksi", headers.join(" | "));
  ok(!(await page.locator("button[aria-label^='Naikkan'], button[aria-label^='Turunkan']").count()), "no per-row up/down arrows");
  const first = await page.locator("tbody tr").first().innerText();
  ok(/22\s+tiket/.test(first), "usage shows '22 tiket'", first.replace(/\s+/g, " ").slice(0, 80));

  // add: incomplete state, key preview, colour default, duplicate colour hint
  await page.getByRole("button", { name: "Tambah Kategori" }).click();
  await page.waitForSelector("form");
  ok(/Belum lengkap: Nama/.test(await page.locator("footer").last().innerText()), "'Belum lengkap: Nama' while empty");
  ok(await page.getByRole("button", { name: "Simpan", exact: true }).isDisabled(), "Simpan disabled while invalid");
  ok(!(await page.getByText("Isi bagian bertanda").count()), "no 'Isi bagian bertanda' sentence");
  ok(!(await page.getByLabel("Urutan", { exact: true }).count()), "no Urutan field in the form");
  const checkedDefault = await page.locator("[role=radio][aria-checked=true]").first().getAttribute("aria-label");
  ok(!!checkedDefault && !["Biru muda", "Hijau", "Ungu", "Kuning", "Cyan", "Merah muda", "Lime"].includes(checkedDefault), "new category defaults to an unused colour", checkedDefault);
  await page.getByLabel("Nama", { exact: false }).first().fill("Gangguan Jaringan");
  ok((await page.locator("input[readonly]").first().inputValue()) === "GANGGUAN-JARINGAN", "Kode previewed from name, read-only");
  ok(/18\/40|17\/40/.test(await page.locator("form").innerText()), "name counter /40");
  await page.getByRole("radio", { name: "Biru muda", exact: true }).click();
  ok(/Sama dengan: Maintenance/.test(await page.locator("form").innerText()), "soft hint 'Sama dengan: Maintenance'");
  ok(await page.getByRole("button", { name: "Simpan", exact: true }).isEnabled(), "still saveable with a duplicate colour");
  // keyboard on swatches
  await page.getByRole("radio", { name: "Biru muda", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  ok((await page.locator("[role=radio][aria-checked=true]").first().getAttribute("aria-label")) === "Biru", "arrow key moves the swatch");
  const swatch = await page.getByRole("radio", { name: "Biru", exact: true }).boundingBox();
  ok(swatch.width >= 28, "swatch >= 28px on desktop", `${swatch.width}px`);
  await page.getByRole("radio", { name: "Merah", exact: true }).click();
  await page.screenshot({ path: "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/master-data-tables/md-form-kategori-add-after.png" });
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page.waitForSelector("form", { state: "detached" });
  const row = page.locator("tbody tr", { hasText: "Gangguan Jaringan" });
  ok(await row.count() === 1, "new category appears in the list");
  ok(/Belum dipakai/.test(await row.innerText()), "unused shows 'Belum dipakai'");

  // new category reaches the ticket filter in the other tab without reload
  await other.goto(`${BASE}/tickets?mock=instant`, { waitUntil: "networkidle" });
  await other.waitForTimeout(1200);
  await page.getByRole("button", { name: /^Ubah Gangguan Jaringan/ }).first().click();
  await page.waitForSelector("form");
  ok((await page.locator("input[readonly]").first().inputValue()) === "GANGGUAN-JARINGAN", "Ubah shows the code at the top");
  const nameInput = page.getByLabel("Nama", { exact: false }).first();
  await nameInput.fill("Gangguan Jaringan Utama");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page.waitForSelector("form", { state: "detached" });
  await page.getByRole("button", { name: /^Ubah Gangguan Jaringan Utama/ }).first().click();
  await page.waitForSelector("form");
  ok((await page.locator("input[readonly]").first().inputValue()) === "GANGGUAN-JARINGAN", "rename keeps the code");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // duplicate name + focus
  await page.getByRole("button", { name: "Tambah Kategori" }).click();
  await page.waitForSelector("form");
  await page.getByLabel("Nama", { exact: false }).first().fill("incident");
  ok(await page.getByRole("button", { name: "Simpan", exact: true }).isDisabled(), "Simpan stays disabled for a duplicate name");
  await page.locator("input[id$='-description'], textarea[id$='-description']").first().focus();
  await page.getByLabel("Nama", { exact: false }).first().press("Enter");
  await page.waitForTimeout(500);
  ok(/sudah digunakan/.test(await page.locator("form").innerText()), "duplicate name rejected (case-insensitive)");
  ok(await page.evaluate(() => document.activeElement?.id?.endsWith("-name")), "focus goes to the invalid field");
  // unsaved-changes confirm
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  ok(/Buang perubahan/.test(await page.locator("[role=dialog]").last().innerText()), "closing a dirty form asks to discard");
  await page.getByRole("button", { name: "Buang perubahan" }).click();
  await page.waitForTimeout(300);

  // Atur urutan: cancel = no write; save = one write
  const writes = () => page.evaluate(() => window.__masterWrites);
  const w0 = await writes();
  await page.getByRole("button", { name: "Atur urutan kategori" }).click();
  await page.waitForSelector("[data-sheet-id=category-order]");
  await page.getByRole("button", { name: /^Turunkan Maintenance/ }).click();
  await page.getByRole("button", { name: "Batal" }).click();
  await page.waitForTimeout(300);
  ok((await writes()) === w0, "cancel writes nothing");
  ok((await page.locator("tbody tr").first().innerText()).includes("Maintenance"), "order unchanged after cancel");
  await page.getByRole("button", { name: "Atur urutan kategori" }).click();
  await page.waitForSelector("[data-sheet-id=category-order]");
  await page.getByRole("button", { name: /^Turunkan Maintenance/ }).click();
  await page.getByRole("button", { name: /^Turunkan Maintenance/ }).click();
  await page.screenshot({ path: "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/master-data-tables/md-atur-urutan-after.png" });
  await page.getByRole("button", { name: "Simpan urutan" }).click();
  await page.waitForSelector("[data-sheet-id=category-order]", { state: "detached" });
  await page.waitForTimeout(400);
  ok((await writes()) === w0 + 1, "Simpan urutan is exactly one storage write", `${(await writes()) - w0} write(s)`);
  const order = await page.$$eval("tbody tr", rows => rows.map(r => r.querySelector("td").innerText.split("\n")[0]));
  ok(order.indexOf("Maintenance") === 2, "Maintenance moved two places", order.slice(0, 4).join(", "));
  // drag: pointer events on the handle
  await page.getByRole("button", { name: "Atur urutan kategori" }).click();
  await page.waitForSelector("[data-sheet-id=category-order]");
  const handle = page.getByRole("button", { name: /^Geser Incident/ }), target = page.locator("[data-order-id]").nth(3);
  const hb = await handle.boundingBox(), tb = await target.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down();
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 }); await page.mouse.up();
  const dragged = await page.$$eval("[data-order-id]", els => els.map(e => e.querySelector("span.truncate").textContent));
  ok(dragged.indexOf("Incident") === 3, "drag by handle moves the item", dragged.join(", "));
  await page.getByRole("button", { name: "Batal" }).click();

  // the scroll lock is released after the sheet
  await page.waitForTimeout(300);
  const locked = await page.evaluate(() => getComputedStyle(document.body).overflow === "hidden" || getComputedStyle(document.documentElement).overflow === "hidden");
  ok(!locked, "page scroll is released after the sheet closes");

  // status with impact: ⋯ menu
  const menuRow = page.locator("tbody tr", { hasText: "Gangguan Jaringan Utama" });
  await menuRow.getByRole("button", { name: /^Aksi/ }).click();
  const items = await page.getByRole("menuitem").allInnerTexts();
  ok(items.some(t => /Nonaktifkan/.test(t)) && items.some(t => /Hapus/.test(t)), "⋯ menu offers Nonaktifkan and Hapus (unused)", items.map(t => t.split("\n")[0]).join(", "));
  await page.keyboard.press("Escape");
  const usedMenu = page.locator("tbody tr", { hasText: "Incident" }).first();
  await usedMenu.getByRole("button", { name: /^Aksi/ }).click();
  await page.waitForTimeout(400);
  const del = page.getByRole("menuitem", { name: /Hapus/ });
  ok((await del.getAttribute("aria-disabled")) === "true", "Hapus is disabled with a reason for a used category", (await del.innerText()).replace(/\s+/g, " "));
  await page.keyboard.press("Escape");

  // cleanup: reset the store so the next run starts clean
  await page.evaluate(() => localStorage.removeItem("ctd.masterData.v2"));
  console.log("page errors:", JSON.stringify(errors.slice(0, 5)));
  await browser.close();
})().catch(async e => { console.log("FAIL", e.message.split("\n").slice(0, 3).join(" | ")); if (shotPage) await shotPage.screenshot({ path: "fail-category.png" }).catch(() => {}); process.exitCode = 1; });
