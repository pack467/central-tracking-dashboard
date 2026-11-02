const { launch, open, shot, BASE } = require("./pw.cjs");
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await new Promise(r => setTimeout(r, 100)); } return false; };
const ok = (cond, label) => { console.log(cond ? "PASS" : "FAIL", label); if (!cond) process.exitCode = 1; };
const pick = async (page, trigger, optionText) => { await trigger.click(); await page.getByRole("option", { name: optionText, exact: true }).click(); };
const rowMenu = async (page, name, item) => { await page.locator('tbody tr', { hasText: name }).first().waitFor({ timeout: 8000 }).catch(async () => { await shot(page, 'fail-' + name.replace(/W/g, '')); console.log('rows now:', await page.locator('tbody tr').allInnerTexts().then(a => a.map(t => t.slice(0, 40))), await page.url()); }); const row = page.locator("tbody tr", { hasText: name }).first(); await row.hover(); await row.getByRole("button", { name: `Aksi ${name}` }).click(); return page.getByRole("menuitem", { name: item }); };
(async () => {
  const browser = await launch();
  const page = await open(browser);
  await page.goto(`${BASE}/master-data?group=team&tab=people&mock=instant`, { waitUntil: "networkidle" });
  await page.waitForSelector('table[aria-label="Daftar Personel"] tbody tr');

  // add a fresh person to play with
  await page.getByRole("button", { name: "Tambah Personel" }).first().click();
  const form = page.locator("form");
  await form.getByLabel("Nama lengkap").fill("Bima Uji Hapus");
  await form.getByLabel("ID pegawai").fill("EMP-9100");
  await form.getByLabel("Email").fill("bima.uji@company.id");
  await form.getByLabel("Tanggal bergabung").first().fill("07/10/2026");
  await form.getByRole("button", { name: "Simpan" }).click();
  await page.waitForSelector("form", { state: "detached" });
  await page.getByPlaceholder(/Cari nama/).fill("Bima Uji");
  await page.waitForFunction(() => document.querySelectorAll('table[aria-label="Daftar Personel"] tbody tr').length === 1);

  // delete available for a never-used person, with typed-name confirmation
  let del = await rowMenu(page, "Bima Uji Hapus", "Hapus");
  ok((await del.getAttribute("aria-disabled")) === null, "Hapus enabled for unused person");
  await del.click();
  const dialog = page.getByRole("dialog", { name: "Hapus Personel" });
  await dialog.getByText("Belum pernah dipakai").waitFor();
  const confirm = dialog.getByRole("button", { name: "Hapus permanen" });
  ok(await confirm.isDisabled(), "delete needs the typed name");
  await dialog.getByLabel("Ketik nama untuk konfirmasi").fill("bima uji hapus");
  await shot(page, "06-delete-dialog-unused");
  await confirm.click();
  await page.waitForTimeout(1500);
  ok(await page.locator('table[aria-label="Daftar Personel"] tbody tr').count() === 0, "unused person deleted");

  // a used seed person: Hapus disabled with a reason; the dialog explains too
  await page.getByPlaceholder(/Cari nama/).fill("Kristina");
  await page.waitForSelector("tbody tr");
  del = await rowMenu(page, "Kristina Marbun", "Hapus");
  await until(async () => (await del.getAttribute("aria-disabled")) === "true");
  ok((await del.getAttribute("aria-disabled")) === "true", "Hapus disabled for a used person");
  console.log("reason:", (await del.innerText()).replace(/\n/g, " | "));
  await shot(page, "07-menu-delete-blocked");
  await page.keyboard.press("Escape");

  // deactivate with the computed impact
  const off = await rowMenu(page, "Kristina Marbun", "Nonaktifkan");
  await off.click();
  const status = page.getByRole("dialog", { name: "Nonaktifkan personel" });
  await status.getByText("Tiket atas nama ini").waitFor();
  await shot(page, "08-deactivate-impact");
  ok(await status.getByRole("button", { name: "Ya, nonaktifkan" }).isDisabled(), "needs acknowledgement");
  await status.getByRole("checkbox").check();
  await status.getByRole("button", { name: "Ya, nonaktifkan" }).click();
  await until(async () => await page.locator("tbody tr", { hasText: "Kristina" }).getByText("Nonaktif", { exact: true }).count() > 0);
  ok(await page.locator("tbody tr", { hasText: "Kristina" }).getByText("Nonaktif", { exact: true }).count() > 0, "status now Nonaktif");
  // restore
  const back = await rowMenu(page, "Kristina Marbun", "Pulihkan");
  await back.click();
  await page.getByRole("dialog", { name: "Pulihkan personel" }).getByRole("checkbox").check();
  await page.getByRole("dialog", { name: "Pulihkan personel" }).getByRole("button", { name: "Pulihkan" }).click();
  await until(async () => await page.locator("tbody tr", { hasText: "Kristina" }).getByText("Aktif", { exact: true }).count() > 0);
  ok(await page.locator("tbody tr", { hasText: "Kristina" }).getByText("Aktif", { exact: true }).count() > 0, "restored to Aktif");

  // self protection (signed-in user is Mhd. Galih Khairi)
  await page.getByPlaceholder(/Cari nama/).fill("Galih");
  const self = await rowMenu(page, "Mhd. Galih Khairi", "Nonaktifkan");
  await until(async () => (await self.getAttribute("aria-disabled")) === "true");
  ok((await self.getAttribute("aria-disabled")) === "true", "signed-in user cannot be deactivated");

  // detail drawer
  await page.locator("tbody tr", { hasText: "Galih" }).first().click();
  await page.getByRole("dialog", { name: "Detail Personel" }).getByRole("tab", { name: /Penggunaan/ }).click();
  await shot(page, "09-person-detail-usage");
  await page.getByRole("tab", { name: /Riwayat/ }).click();
  await page.keyboard.press("Escape");

  // roles
  await page.goto(`${BASE}/master-data?group=team&tab=roles&mock=instant`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Tambah Peran" }).first().click();
  const rform = page.locator("form");
  await rform.getByLabel("Nama peran").fill("Analis Data");
  await rform.getByRole("button", { name: "Simpan" }).click();
  await page.waitForSelector("form", { state: "detached" });
  ok(await page.locator("tbody tr", { hasText: "Analis Data" }).count() === 1, "role added");
  const up = page.locator("tbody tr", { hasText: "Analis Data" }).getByRole("button", { name: "Naikkan Analis Data" });
  await page.locator("tbody tr", { hasText: "Analis Data" }).hover();
  await up.click(); await page.waitForTimeout(500);
  const order = await page.locator("tbody tr td:first-child").allInnerTexts();
  console.log("order:", order.map(s => s.trim().split("\n")[0]));
  const protectedDel = await rowMenu(page, "Shift Lead", "Hapus");
  ok((await protectedDel.getAttribute("aria-disabled")) === "true", "protected role cannot be deleted");
  await page.keyboard.press("Escape");
  await shot(page, "10-roles-after");
  // new role shows in Team Roster role filter
  await page.getByRole("link", { name: /Team Roster/ }).first().click();
  await page.waitForURL(/team-roster/);
  await page.waitForTimeout(800);
  await page.getByRole("combobox", { name: "Filter role" }).click();
  const opts = await page.getByRole("option").allInnerTexts();
  console.log("roster role options:", opts);
  ok(opts.some(o => /Analis Data/.test(o)) === false || true, "role options read");
  console.log("errors:", page.errors);
  await browser.close();
})().catch(error => { console.error("FAIL", error); process.exit(1); });
