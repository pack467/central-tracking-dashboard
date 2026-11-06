// Input and filter usability round: form footer reasons, auto code, status choices, blur validation, labelled filters, chips, mobile sheet.
const { launch, open, BASE } = require("./pw.cjs");
let failed = 0;
const ok = (cond, msg) => { console.log(cond ? "PASS" : "FAIL", msg); if (!cond) failed++; };
(async () => {
  const browser = await launch();
  const page = await open(browser);
  const go = async q => { await page.goto(`${BASE}/master-data?${q}&mock=instant`, { waitUntil: "networkidle" }); await page.waitForSelector("[data-master-id]:visible, table tbody tr"); };

  // --- Organization form
  await go("group=services&tab=organizations");
  await page.getByRole("button", { name: /Tambah Organisasi/ }).first().click();
  const form = page.locator("form");
  await form.waitFor();
  ok(await page.getByText("Belum lengkap: Nama resmi, Kode").isVisible(), "footer names missing fields");
  ok(await form.getByRole("button", { name: "Simpan" }).isDisabled(), "Simpan disabled while incomplete");
  ok((await form.getByRole("radio", { name: "Arsip" }).count()) === 0, "no 'Arsip' status when creating");
  ok(await form.getByText("Muncul di pilihan dan bisa dipakai untuk pekerjaan baru.").isVisible(), "status hint explains the choice");
  ok((await page.locator('h2:has-text("Tambah Organisasi")').count()) === 1 && (await page.getByText("TAMBAH", { exact: true }).count()) === 0, "single title, no duplicated 'Tambah' eyebrow");
  await form.getByLabel("Nama resmi").fill("PT Contoh Nusantara");
  ok((await form.getByLabel("Kode").inputValue()) === "PT-CONTOH-NUSANTARA", "code is suggested from the name");
  await form.getByLabel("Kode").fill("CNU");
  await form.getByLabel("Nama resmi").fill("PT Contoh Nusantara Raya");
  ok((await form.getByLabel("Kode").inputValue()) === "CNU", "a typed code is not overwritten");
  ok(!(await page.getByText(/Belum lengkap/).count()) && await form.getByRole("button", { name: "Simpan" }).isEnabled(), "complete form: no missing message, Simpan enabled");
  // blur validation on a filled field
  await page.getByRole("button", { name: /Tambahan/ }).click();
  await form.getByLabel("Leader", { exact: true }).click();
  await page.getByRole("option", { name: "Kontak eksternal" }).click();
  await form.getByLabel("Nama kontak").fill("Budi");
  await form.getByLabel("Email kontak").fill("bukan-email");
  await form.getByLabel("Telepon kontak").focus();
  ok(await form.getByText("Format email tidak valid.").isVisible(), "invalid email flagged on blur, before submit");
  ok(await page.getByText("Belum lengkap: Email kontak").isVisible(), "footer points to the invalid field");
  await page.keyboard.press("Escape"); await page.getByRole("button", { name: "Buang perubahan" }).click();
  await form.waitFor({ state: "detached" });

  // --- edit keeps Arsip
  await page.locator("[data-master-id]:visible, tbody tr").first().click();
  await page.getByRole("button", { name: /^Ubah/ }).first().click().catch(() => {});
  if (await page.locator("form").count()) { ok((await page.locator("form").getByRole("radio", { name: "Arsip" }).count()) === 1, "edit form still offers 'Arsip'"); await page.keyboard.press("Escape"); }
  else console.log("SKIP edit-form check (no edit button path)");

  // --- Role form: duplicate name explained
  await go("group=team&tab=roles");
  await page.getByRole("button", { name: /Tambah Peran/ }).first().click();
  const rf = page.locator("form");
  await rf.waitFor();
  ok(await page.getByText("Belum lengkap: Nama peran").isVisible(), "role form: footer names missing field");
  await rf.getByLabel("Nama peran").fill("Shift Lead");
  ok(await page.getByText('Peran "Shift Lead" sudah ada.').isVisible(), "role form: duplicate explained inline");
  await page.keyboard.press("Escape"); await page.getByRole("button", { name: "Buang perubahan" }).click();

  // --- Filters (desktop): labelled, chips, count, reset
  await go("group=customer&tab=systems");
  ok(/^Status/.test((await page.locator("#master-filter-status").innerText()).trim()), "status filter carries its label inside the control");
  ok((await page.getByText(/sistem$/).first().innerText()).includes("47"), "result count always visible");
  await page.locator("#master-filter-status").click(); await page.getByRole("option", { name: "Aktif", exact: true }).click();
  await page.waitForFunction(() => /status=active/.test(location.search));
  await page.locator("#master-filter-org").click(); await page.getByRole("option", { name: "BNI", exact: true }).click();
  await page.waitForFunction(() => /org=bni/.test(location.search));
  await page.waitForFunction(() => /7\s*sistem sesuai filter/.test(document.body.innerText));
  ok(await page.getByRole("button", { name: "Hapus filter Status: Aktif" }).isVisible() && await page.getByRole("button", { name: "Hapus filter Organisasi: BNI" }).isVisible(), "desktop shows removable chips for active filters");
  const shown = await page.locator("#master-filter-org").innerText();
  ok(shown.replace(/\s+/g, " ").trim() === "Organisasi: BNI", "label and selected value fully readable in the control: " + shown.trim());
  await page.getByRole("button", { name: "Hapus filter Status: Aktif" }).click();
  await page.waitForFunction(() => !/status=active/.test(location.search));
  ok(!/status=active/.test(page.url()) && /org=bni/.test(page.url()), "chip removes only its own filter");
  await page.getByRole("button", { name: "Atur ulang" }).click();
  await page.waitForFunction(() => !/org=/.test(location.search));
  ok(await page.getByText("Atur ulang").count() === 0, "reset clears everything");
  // search placeholder
  ok((await page.getByRole("searchbox").getAttribute("placeholder")).includes("nama atau kode"), "search placeholder says what is searched");

  // --- Mobile
  const m = await open(browser, { width: 390, height: 844, touch: true });
  await m.goto(`${BASE}/master-data?group=customer&tab=systems&mock=instant`, { waitUntil: "networkidle" });
  await m.waitForSelector("[data-master-id]:visible");
  await m.getByRole("button", { name: /Filter & urutan/ }).click();
  const sheet = m.locator('[data-sheet-id="master-filters"]');
  await sheet.waitFor();
  await m.locator("#master-filter-status").click(); await m.getByRole("option", { name: "Aktif", exact: true }).click();
  await m.waitForTimeout(500);
  ok(await m.getByRole("button", { name: /^Tampilkan \d+ sistem$/ }).isVisible(), "sheet button shows live result count");
  ok(await m.getByRole("button", { name: "Atur ulang" }).first().isVisible(), "sheet has reset");
  await m.getByRole("button", { name: /^Tampilkan/ }).click();
  await sheet.waitFor({ state: "detached" }).catch(() => {});
  ok(await m.getByRole("button", { name: "Hapus filter Status: Aktif" }).isVisible(), "mobile chip visible after closing sheet");
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 0, "no horizontal scroll on mobile: " + overflow);
  // touch target size for new controls
  const small = await m.evaluate(() => [...document.querySelectorAll("button, [role=radio]")].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 44 && /Hapus filter|Atur ulang|Filter/.test(el.getAttribute("aria-label") || el.textContent || ""); }).map(el => (el.getAttribute("aria-label") || el.textContent).slice(0, 30) + ":" + Math.round(el.getBoundingClientRect().height)));
  ok(small.length === 0, "touch targets >= 44px: " + JSON.stringify(small));
  await m.getByRole("button", { name: /Tambah Sistem/ }).first().click();
  const mf = m.locator("form"); await mf.waitFor(); await m.waitForTimeout(500);
  const tiny = await m.evaluate(() => [...document.querySelectorAll("form label, form p, form h3")].filter(el => parseFloat(getComputedStyle(el).fontSize) < 11).length);
  ok(tiny === 0, "no text under 11px in the form");
  ok(!(await m.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), "form: no horizontal scroll on mobile");
  console.log("errors:", [...page.errors, ...m.errors].filter(e => !/preload/.test(e)));
  await browser.close();
  console.log(failed ? `${failed} FAILED` : "ALL PASS");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
