const { launch, open, shot, BASE } = require("./pw.cjs");
const ok = (cond, label) => { console.log(cond ? "PASS" : "FAIL", label); if (!cond) process.exitCode = 1; };
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await new Promise(r => setTimeout(r, 100)); } return false; };
const menu = async (page, name, item) => { const row = page.locator("tbody tr", { hasText: name }).first(); await row.waitFor(); await row.hover(); await row.getByRole("button", { name: `Aksi ${name}` }).click(); return page.getByRole("menuitem", { name: item }); };
(async () => {
  const browser = await launch();
  const page = await open(browser);
  await page.goto(`${BASE}/master-data?group=services&tab=organizations&mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector("tbody tr");

  // sort options on every list
  await page.getByRole("combobox", { name: /Urutan/ }).click();
  console.log("sort options:", await page.getByRole("option").allInnerTexts());
  await page.getByRole("option", { name: "Z–A" }).click();
  await until(() => /sort=-name/.test(page.url()));
  ok(/sort=-name/.test(page.url()), "sort Z-A in URL: " + page.url().split("?")[1]);

  // used organization: Hapus blocked with a reason
  // Organisations show a logo tile without text, so the name is the first line of the cell.
  const orgName = (await page.locator("tbody tr").first().locator("td").first().innerText()).split("\n")[0];
  const blocked = await menu(page, orgName, "Hapus");
  await until(async () => (await blocked.getAttribute("aria-disabled")) === "true");
  ok((await blocked.getAttribute("aria-disabled")) === "true", "used organization cannot be deleted: " + (await blocked.innerText()).replace(/\n/g, " | "));
  await page.keyboard.press("Escape");

  // create + edit + history + delete an unused organization
  await page.getByRole("button", { name: "Tambah Organisasi" }).first().click();
  const form = page.locator("form");
  await form.getByLabel("Nama resmi").fill("Org Uji Playwright");
  await form.getByLabel("Kode").fill("UJIP");
  await form.getByRole("button", { name: "Simpan" }).click();
  await page.waitForSelector("form", { state: "detached" });
  await page.getByPlaceholder(/Cari nama atau kode/).fill("Uji Playwright");
  await page.locator("tbody tr", { hasText: "Org Uji Playwright" }).first().waitFor();
  await shot(page, "dbgC");
  const del = await menu(page, "Org Uji Playwright", "Hapus");
  await until(async () => true);
  await page.waitForTimeout(300);
  ok((await del.getAttribute("aria-disabled")) === null, "unused organization: Hapus enabled");
  await page.keyboard.press("Escape");

  // edit -> history labels + chips
  await page.locator("tbody tr", { hasText: "Org Uji Playwright" }).first().click();
  const drawer = page.getByRole("dialog", { name: /Detail Organisasi/ });
  await drawer.getByRole("button", { name: "Ubah", exact: true }).click();
  await page.locator("form").getByLabel("Nama resmi").fill("Org Uji Playwright 2");
  await page.locator("form").getByRole("button", { name: "Simpan" }).click();
  await page.waitForSelector("form", { state: "detached" });
  await page.getByRole("tab", { name: /Riwayat/ }).click();
  const chips = await page.getByLabel("Filter riwayat").getByRole("button").allInnerTexts();
  ok(chips.join("|") === "Semua|Nama|Leader|Status|Relasi", "history chips: " + chips.join("|"));
  const historyText = await page.getByRole("tabpanel", { name: "Riwayat" }).innerText();
  ok(/Nama resmi|Nama\b/.test(historyText) && !/legacyKey|picUserId/.test(historyText), "history uses readable labels");
  console.log(historyText.replace(/\n+/g, " | ").slice(0, 300));
  await shot(page, "11-org-history");
  await page.keyboard.press("Escape");
  const del2 = await menu(page, "Org Uji Playwright 2", "Hapus");
  await until(async () => (await del2.getAttribute("aria-disabled")) === "true");
  ok((await del2.getAttribute("aria-disabled")) === "true", "edited record: Hapus blocked (history exists): " + (await del2.innerText()).replace(/\n/g, " | "));
  await page.keyboard.press("Escape");

  // category: add, reorder (single write), delete
  await page.goto(`${BASE}/master-data?group=tickets&tab=categories&mock=instant`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Tambah Kategori" }).first().click();
  await page.locator("form").getByLabel("Nama").first().fill("Kategori Uji");
  await page.locator("form").getByRole("button", { name: "Simpan" }).click();
  await page.waitForSelector("form", { state: "detached" });
  await page.locator("tbody tr", { hasText: "Kategori Uji" }).first().waitFor();
  const seedDel = await menu(page, "Maintenance", "Hapus");
  await until(async () => (await seedDel.getAttribute("aria-disabled")) === "true");
  ok((await seedDel.getAttribute("aria-disabled")) === "true", "seed category blocked: " + (await seedDel.innerText()).replace(/\n/g, " | "));
  await page.keyboard.press("Escape");
  const catDel = await menu(page, "Kategori Uji", "Hapus");
  await catDel.click();
  const dialog = page.getByRole("dialog", { name: "Hapus Kategori" });
  await dialog.getByLabel("Ketik nama untuk konfirmasi").fill("Kategori Uji");
  await dialog.getByRole("button", { name: "Hapus permanen" }).click();
  await until(async () => await page.locator("tbody tr", { hasText: "Kategori Uji" }).count() === 0);
  ok(await page.locator("tbody tr", { hasText: "Kategori Uji" }).count() === 0, "unused category deleted");

  // form message when a relation is cleared
  await page.goto(`${BASE}/master-data?group=services&tab=systems&mock=instant`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Tambah Sistem" }).first().click();
  const sf = page.locator("form");
  await sf.getByRole("combobox", { name: /Organisasi/i }).first().click();
  await page.getByRole("option").nth(1).click();
  await sf.getByRole("combobox", { name: /Proyek induk/i }).first().click();
  await page.getByRole("option").first().click();
  await sf.getByRole("combobox", { name: /Organisasi/i }).first().click();
  await page.getByRole("option").nth(2).click();
  const notice = await page.getByRole("status").filter({ hasText: "dikosongkan" }).count();
  ok(notice > 0, "form tells the user the parent project was cleared");
  await shot(page, "12-form-notice");
  console.log("errors:", page.errors);
  await browser.close();
})().catch(error => { console.error("FAIL", error); process.exit(1); });
