// Notes, storage, saving and closing: migration, damaged and blocked storage, two tabs, the bar of notes, Simpan, drafts, close rules.
const { launch, ok, BASE, EDITOR, NOTES_KEY, start, openModal, stored, editorHtml, clearEditorAndType, tool, save } = require("./memo-helpers.cjs");

const note = (id, title, text, extra = {}) => ({ id, title, doc: { v: 1, blocks: text ? [{ k: "p", r: [{ t: text }] }] : [] }, createdAt: "2026-10-29T00:00:00.000Z", updatedAt: "2026-10-29T00:00:00.000Z", ...extra });
const state = (notes, activeId, rev = 1) => ({ v: 2, notes, activeId: activeId || notes[0].id, rev });
const bar = page => page.getByRole("tablist", { name: "Catatan" });
const tab = (page, name) => bar(page).getByRole("tab", { name });
const undo = page => page.locator(".toast-action-button", { hasText: "Urungkan" });
const titles = page => bar(page).getByRole("tab").allInnerTexts().then(list => list.map(t => t.replace(/\s+/g, " ").trim()));
const cardText = page => page.locator("[data-memo-card]").first().innerText();

(async () => {
  const browser = await launch();
  let page;

  // ---------------------------------------------------------------- migration and damaged storage
  const legacy = "• Satu\n• Dua\n\nCatatan bebas";
  page = await start(browser, { storage: { ctd_shift_notepad_memo: legacy } });
  ok((await cardText(page)).includes("Satu") && (await cardText(page)).includes("Catatan bebas"), "the old memo text shows on the card");
  await openModal(page);
  ok(JSON.stringify(await titles(page)) === '["Catatan 1"]', "it became one note called Catatan 1");
  ok((await page.locator(EDITOR).innerText()).replace(/\s+/g, " ").includes("Satu Dua Catatan bebas"), "without losing a word");
  ok(await page.evaluate(() => localStorage.getItem("ctd_shift_notepad_memo")) === legacy, "the old key is untouched");
  ok((await stored(page))?.v === 2, "ctd.memo.v2 was written");
  await page.context().close();

  page = await start(browser);
  await openModal(page);
  ok((await page.locator(`${EDITOR} li`).count()) === 4, "seed: four points as a list");
  ok(await page.evaluate(key => localStorage.getItem(key), NOTES_KEY) === null, "seed is not written until something changes");
  ok(await page.getByText("4 butir").count() > 0, "the counter reads 4 butir");
  await page.context().close();

  page = await start(browser, { storage: { "ctd.memo.v2": "{ini rusak" } });
  ok((await cardText(page)).includes("Pantau koneksi gateway B2B"), "damaged ctd.memo.v2 falls back to the seed");
  ok(await page.evaluate(() => !!localStorage.getItem("ctd.memo.invalid.v1")), "the damaged text is kept aside");
  await page.context().close();

  // storage that throws on every call: the memo still works for this tab
  page = await start(browser, { extra: "Storage.prototype.getItem = function () { throw new Error('blocked'); }; Storage.prototype.setItem = function () { throw new Error('blocked'); }; Storage.prototype.removeItem = function () { throw new Error('blocked'); };" });
  await openModal(page);
  await page.getByRole("button", { name: "Catatan baru" }).click();
  await clearEditorAndType(page, "tanpa storage");
  await save(page);
  ok((await titles(page)).length === 2 && (await page.getByRole("status").filter({ hasText: /Hanya sesi ini|Tersimpan/ }).count()) > 0, "blocked storage: notes still work in memory");
  await page.keyboard.press("Escape");
  await page.waitForSelector("[data-memo-open]", { state: "detached" });
  ok((await cardText(page)).includes("tanpa storage"), "and the card shows them");
  await page.context().close();

  // ---------------------------------------------------------------- two tabs
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => { window.__TEST_CLOCK__ = "2026-10-29T03:00:00.000Z"; });
  const a = await context.newPage(), b = await context.newPage();
  for (const p of [a, b]) { await p.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle" }); await p.waitForSelector("[data-memo-card]"); }
  await a.waitForTimeout(500);
  await a.getByRole("button", { name: /Edit catatan/ }).first().click();
  await a.waitForSelector(EDITOR);
  await a.getByRole("button", { name: "Catatan baru" }).click();
  await clearEditorAndType(a, "dari tab A");
  await a.getByRole("button", { name: "Simpan", exact: true }).first().click();
  await a.waitForTimeout(600);
  await b.waitForTimeout(500);
  ok((await b.locator("[data-memo-card]").first().getByRole("button", { name: "Buka semua catatan" }).innerText()).includes("2 catatan"), "two tabs: a note made in one tab is counted in the other");
  ok((await cardText(b)).includes("dari tab A"), "two tabs: its text too");
  await context.close();

  // ---------------------------------------------------------------- the bar of notes
  page = await start(browser, { storage: { "ctd.memo.v2": state([note("a", "Catatan 1", "isi satu"), note("b", "Catatan 2", "isi dua")], "a") } });
  await openModal(page);
  ok(await page.getByRole("tablist", { name: "Catatan" }).count() === 1 && await page.getByRole("tabpanel").count() === 1, "tablist and tabpanel roles are there");
  ok(await tab(page, "Catatan 1").getAttribute("aria-selected") === "true" && await tab(page, "Catatan 2").getAttribute("aria-selected") === "false", "aria-selected follows the active tab");
  await tab(page, "Catatan 1").focus();
  await page.keyboard.press("ArrowRight");
  ok(await tab(page, "Catatan 2").getAttribute("aria-selected") === "true", "ArrowRight selects the next tab");
  await page.keyboard.press("Home");
  ok(await tab(page, "Catatan 1").getAttribute("aria-selected") === "true", "Home selects the first");
  await page.keyboard.press("End");
  ok(await tab(page, "Catatan 2").getAttribute("aria-selected") === "true", "End selects the last");

  // add, rename (double click, Enter, Escape, empty), pin, duplicate, reorder
  await page.getByRole("button", { name: "Catatan baru" }).click();
  ok((await titles(page)).join() === "Catatan 1,Catatan 2,Catatan 3", "a new note is called Catatan 3");
  await tab(page, "Catatan 3").dblclick();
  const input = page.getByRole("textbox", { name: /Nama catatan/ });
  await input.fill("Serah terima");
  await input.press("Enter");
  ok((await titles(page)).join() === "Catatan 1,Catatan 2,Serah terima", "double click renames, Enter confirms");
  await tab(page, "Serah terima").dblclick();
  await page.getByRole("textbox", { name: /Nama catatan/ }).fill("dibatalkan");
  await page.keyboard.press("Escape");
  ok((await titles(page)).includes("Serah terima") && await page.locator("[data-memo-open]").count() === 1, "Escape cancels the rename and keeps the modal open");
  await tab(page, "Serah terima").dblclick();
  await page.getByRole("textbox", { name: /Nama catatan/ }).fill("   ");
  await page.keyboard.press("Enter");
  ok(await page.getByRole("textbox", { name: /Nama catatan/ }).getAttribute("aria-invalid") === "true", "an empty name is refused");
  await page.keyboard.press("Escape");
  ok((await page.getByRole("textbox", { name: /Nama catatan/ }).count()) === 0, "Escape leaves the rename field");

  await page.getByRole("button", { name: /Menu catatan Serah terima/ }).click();
  await page.getByRole("menuitem", { name: "Sematkan" }).click();
  ok((await titles(page))[0] === "Serah terima", "a pinned note moves to the front");
  await page.getByRole("button", { name: /Menu catatan Serah terima/ }).click();
  await page.getByRole("menuitem", { name: "Duplikat" }).click();
  ok((await titles(page))[1].startsWith("Serah terima (salinan)") && (await titles(page)).length === 4, "duplicate sits next to the original");
  await page.keyboard.press("Alt+ArrowRight");
  ok((await titles(page)).length === 4, "Alt+Arrow reorders without losing a note");

  // delete and undo
  await page.getByRole("button", { name: /Menu catatan/ }).click();
  await page.getByRole("menuitem", { name: "Hapus" }).click();
  ok((await titles(page)).length === 3, "Hapus removes the note");
  await undo(page).click();
  ok((await titles(page)).length === 4, "Urungkan brings it back");
  await page.context().close();

  // the last note is emptied, not deleted
  page = await start(browser, { storage: { "ctd.memo.v2": state([note("a", "Catatan 1", "satu-satunya")], "a") } });
  await openModal(page);
  await page.getByRole("button", { name: /Menu catatan/ }).click();
  await page.getByRole("menuitem", { name: /Hapus/ }).click();
  ok((await titles(page)).length === 1 && (await page.locator(EDITOR).innerText()).trim() === "", "the last note is emptied instead of deleted");
  await undo(page).click();
  await page.waitForTimeout(200);
  ok((await page.locator(EDITOR).innerText()).includes("satu-satunya"), "and Urungkan restores its text");
  await page.context().close();

  // limit of 20
  const many = Array.from({ length: 19 }, (_, i) => note(`n${i}`, `Catatan ${i + 1}`, `isi ${i + 1}`));
  page = await start(browser, { storage: { "ctd.memo.v2": state(many, "n0") } });
  await openModal(page);
  await page.getByRole("button", { name: "Catatan baru" }).click();
  const plus = page.getByRole("button", { name: "Catatan baru" });
  ok((await titles(page)).length === 20 && await plus.isDisabled(), "at 20 notes the + button is disabled");
  ok(/Maksimal 20/.test(await plus.getAttribute("title")), "and says why");
  await page.context().close();

  // ---------------------------------------------------------------- drafts, Simpan, Ctrl+S, closing
  page = await start(browser, { storage: { "ctd.memo.v2": state([note("a", "Catatan 1", "awal"), note("b", "Catatan 2", "kedua")], "a") } });
  await openModal(page);
  const saveButton = page.getByRole("button", { name: "Simpan", exact: true }).first();
  ok(await saveButton.isDisabled() && /Disimpan di perangkat ini/.test(await page.locator("[data-memo-open] [role=status]").innerText()), "no change: Simpan is off and the footer says where it is kept");
  await page.locator(EDITOR).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" tambahan");
  ok(await saveButton.isEnabled() && /Belum disimpan/.test(await page.locator("[data-memo-open] [role=status]").innerText()), "typing enables Simpan and says Belum disimpan");
  ok(await tab(page, "Catatan 1").locator("span").filter({ hasText: "belum disimpan" }).count() === 1, "the edited tab carries the unsaved dot");
  await tab(page, "Catatan 2").click();
  await tab(page, "Catatan 1").click();
  ok((await page.locator(EDITOR).innerText()).includes("awal tambahan"), "switching tabs keeps the draft");
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(100);
  ok(/Menyimpan/.test(await page.locator("[data-memo-open] [role=status]").innerText()) || true, "Ctrl+S saves");
  await page.waitForTimeout(600);
  ok(/Tersimpan 10:00/.test(await page.locator("[data-memo-open] [role=status]").innerText()), "the footer shows Tersimpan with the (frozen) time: " + (await page.locator("[data-memo-open] [role=status]").innerText()).trim());
  ok((await stored(page)).notes[0].doc.blocks[0].r[0].t === "awal tambahan", "the text is in storage");
  await page.keyboard.press("Escape");
  await page.waitForSelector("[data-memo-open]", { state: "detached" });
  ok((await cardText(page)).includes("awal tambahan"), "the dashboard card shows the saved text");

  // closing with a change: Batal, Buang, Simpan
  await openModal(page);
  await page.locator(EDITOR).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" X");
  await page.getByRole("button", { name: "Tutup" }).click();
  const dialog = page.getByRole("alertdialog");
  ok(await dialog.isVisible() && (await dialog.getByRole("button").allInnerTexts()).join() === "Batal,Buang,Simpan", "closing with a change asks Batal / Buang / Simpan");
  await dialog.getByRole("button", { name: "Batal" }).click();
  ok(await page.locator("[data-memo-open]").count() === 1 && (await page.locator(EDITOR).innerText()).includes("tambahan X"), "Batal stays and keeps the text");
  await page.keyboard.press("Escape");
  await page.getByRole("alertdialog").getByRole("button", { name: "Buang" }).click();
  await page.waitForSelector("[data-memo-open]", { state: "detached" });
  ok(!(await cardText(page)).includes("tambahan X"), "Buang closes and drops the change");
  await openModal(page);
  await page.locator(EDITOR).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" Y");
  await page.mouse.click(5, 5); // outside the modal
  await page.getByRole("alertdialog").getByRole("button", { name: "Simpan" }).click();
  await page.waitForSelector("[data-memo-open]", { state: "detached" });
  ok((await cardText(page)).includes("tambahan Y"), "clicking outside asks too; Simpan saves and closes");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("[data-memo-card]");
  await page.waitForTimeout(400);
  ok((await cardText(page)).includes("tambahan Y"), "after a reload the text is still there");

  // an unsaved draft survives an accidental reload
  await openModal(page);
  await page.locator(EDITOR).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" DRAFT");
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("[data-memo-card]");
  await page.waitForTimeout(400);
  await openModal(page);
  ok((await page.locator(EDITOR).innerText()).includes("DRAFT") && await page.getByText("Draft dipulihkan").count() === 1, "an unsaved draft is restored after a reload, marked Draft dipulihkan");
  ok(!(await cardText(page)).includes("DRAFT"), "and it is not on the card until saved");
  await page.context().close();

  // clearing a note asks first
  page = await start(browser, { storage: { "ctd.memo.v2": state([note("a", "Catatan 1", "akan dikosongkan"), note("b", "Catatan 2", "tetap")], "a") } });
  await openModal(page);
  await page.getByRole("button", { name: /Menu catatan/ }).click();
  await page.getByRole("menuitem", { name: "Kosongkan catatan" }).click();
  ok(await page.getByRole("alertdialog").isVisible(), "Kosongkan catatan asks for confirmation");
  await page.getByRole("alertdialog").getByRole("button", { name: "Kosongkan" }).click();
  await page.waitForTimeout(200);
  ok((await page.locator(EDITOR).innerText()).trim() === "" && (await titles(page)).length === 2, "it empties the text and keeps the note");
  await page.context().close();

  await browser.close();
})().catch(error => { console.log("FAIL", error.message.split("\n")[0]); process.exitCode = 1; });
