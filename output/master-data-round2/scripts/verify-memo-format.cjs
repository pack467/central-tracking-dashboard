// Formatting: every toolbar button, list keys, paste and hostile content, checklist on the dashboard, copy as plain text.
const { launch, ok, EDITOR, NOTES_KEY, start, openModal, stored, editorHtml, clearEditorAndType, tool, save } = require("./memo-helpers.cjs");

const firstDoc = async page => (await stored(page)).notes[0].doc;
const flat = doc => doc.blocks.map(block => `${block.k}${block.l ? ":" + block.l : ""}${block.d ? ":d1" : ""}${block.c ? ":x" : ""}|${block.r.map(run => (run.m ? `[${run.m.join("")}]` : "") + run.t).join("")}`);

(async () => {
  const browser = await launch();
  const fresh = async (text = "", opts = {}) => {
    const page = await start(browser, { storage: { "ctd.memo.v2": { v: 2, notes: [{ id: "n1", title: "Catatan 1", doc: { v: 1, blocks: [] }, createdAt: "2026-10-29T00:00:00.000Z", updatedAt: "2026-10-29T00:00:00.000Z" }], activeId: "n1", rev: 1 } }, ...opts });
    await openModal(page);
    await clearEditorAndType(page, text);
    return page;
  };

  // --- inline formats on a selection
  let page = await fresh("halo dunia");
  await page.keyboard.press("Control+a");
  await tool(page, "Tebal").click();
  ok(await page.locator(`${EDITOR} b`).count() > 0, "Tebal wraps the selection in <b>");
  ok(await tool(page, "Tebal").getAttribute("aria-pressed") === "true", "Tebal reports aria-pressed=true on bold text");
  await tool(page, "Miring").click();
  await tool(page, "Garis bawah").click();
  await tool(page, "Penting").click();
  ok(await tool(page, "Penting").getAttribute("aria-pressed") === "true", "Penting is pressed on highlighted text");
  await save(page);
  let doc = await firstDoc(page);
  ok(JSON.stringify(doc.blocks[0].r) === JSON.stringify([{ t: "halo dunia", m: ["b", "i", "u", "hl"] }]), "saved as one run with marks b,i,u,hl", JSON.stringify(doc.blocks[0].r));
  await page.keyboard.press("Control+a");
  await tool(page, "Penting").click();
  await tool(page, "Tebal").click();
  await save(page);
  doc = await firstDoc(page);
  ok(JSON.stringify(doc.blocks[0].r) === JSON.stringify([{ t: "halo dunia", m: ["i", "u"] }]), "pressing Penting and Tebal again removes only those marks", JSON.stringify(doc.blocks[0].r));
  await page.context().close();

  // --- the same shortcuts the toolbar names
  page = await fresh("kunci");
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+b");
  await page.keyboard.press("Control+i");
  await page.keyboard.press("Control+u");
  await save(page);
  ok(JSON.stringify((await firstDoc(page)).blocks[0].r) === JSON.stringify([{ t: "kunci", m: ["b", "i", "u"] }]), "Ctrl+B, Ctrl+I and Ctrl+U work");
  await page.context().close();

  // --- formatting at the cursor, no selection
  page = await fresh("awal ");
  await tool(page, "Tebal").click();
  await page.keyboard.type("tebal");
  await tool(page, "Tebal").click();
  await page.keyboard.type(" biasa");
  await save(page);
  ok(JSON.stringify((await firstDoc(page)).blocks[0].r) === JSON.stringify([{ t: "awal " }, { t: "tebal", m: ["b"] }, { t: " biasa" }]), "bold at the caret applies to what is typed next", JSON.stringify((await firstDoc(page)).blocks[0].r));
  await page.context().close();

  // --- heading, clear format
  page = await fresh("Judul penting");
  await tool(page, "Judul").click();
  ok(await page.locator(`${EDITOR} h3`).count() === 1 && await tool(page, "Judul").getAttribute("aria-pressed") === "true", "Judul makes a heading and reports it");
  await page.keyboard.press("Control+a");
  await tool(page, "Tebal").click();
  await tool(page, "Penting").click();
  await tool(page, "Hapus format").click();
  const cleared = await editorHtml(page);
  ok(!/<b>|<h3>|background-color: rgba\(251/.test(cleared.replace(/transparent/g, "")) || !/<b>|<h3>/.test(cleared), "Hapus format removes bold and heading", cleared);
  await save(page);
  doc = await firstDoc(page);
  ok(flat(doc).join() === "p|Judul penting", "after Hapus format the note is plain text", flat(doc).join());
  await page.context().close();

  // --- bullet list keys
  page = await fresh("satu");
  await tool(page, "Poin").click();
  await page.keyboard.press("Enter");
  await page.keyboard.type("dua");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("setelah daftar");
  await save(page);
  ok(flat(await firstDoc(page)).join() === "li:ul|satu,li:ul|dua,p|setelah daftar", "Enter continues a list, Enter on an empty item leaves it", flat(await firstDoc(page)).join());
  await page.context().close();

  // --- numbered list and nesting with Tab
  page = await fresh("");
  await tool(page, "Angka").click();
  await page.keyboard.type("pertama");
  await page.keyboard.press("Enter");
  await page.keyboard.type("anak");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.keyboard.type("anak dua");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.type(" kembali");
  await save(page);
  doc = await firstDoc(page);
  const tabbed = flat(doc);
  ok(tabbed[0] === "li:ol|pertama" && tabbed[1].startsWith("li:ol:d1|anak") && tabbed.some(line => line.startsWith("li:ol|") && line.includes("kembali")), "Tab nests one level, Shift+Tab brings it back", tabbed.join(" // "));
  await page.context().close();

  // --- checklist: tick in the editor, Enter does not copy the ticked state
  page = await fresh("");
  await tool(page, "Centang").click();
  await page.keyboard.type("periksa backup");
  const li = page.locator(`${EDITOR} ul[data-todo] > li`).first();
  const box = await li.boundingBox();
  await page.mouse.click(box.x + 8, box.y + 10);
  ok(await li.getAttribute("data-checked") !== null, "clicking the box in the editor ticks the item");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("periksa log");
  ok(await page.locator(`${EDITOR} ul[data-todo] > li`).nth(1).getAttribute("data-checked") === null, "a new checklist line starts unticked");
  await save(page);
  ok(flat(await firstDoc(page)).join() === "li:todo:x|periksa backup,li:todo|periksa log", "checklist saved with its ticked state", flat(await firstDoc(page)).join());
  // the dashboard card: a tick there saves at once
  await page.keyboard.press("Escape");
  await page.waitForSelector("[data-memo-open]", { state: "detached" });
  const box2 = page.locator("[data-memo-card]").getByRole("checkbox").nth(1);
  await box2.click();
  await page.waitForTimeout(150);
  ok(flat(await firstDoc(page)).join() === "li:todo:x|periksa backup,li:todo:x|periksa log", "ticking a box on the dashboard card saves straight away", flat(await firstDoc(page)).join());
  await page.context().close();

  // --- undo and redo
  page = await fresh("abc");
  await page.keyboard.press("Control+a");
  await tool(page, "Tebal").click();
  ok(await page.locator(`${EDITOR} b`).count() > 0, "bold applied before undo");
  await tool(page, "Urungkan").click();
  ok(await page.locator(`${EDITOR} b`).count() === 0, "Urungkan reverts it");
  await tool(page, "Ulangi").click();
  ok(await page.locator(`${EDITOR} b`).count() > 0, "Ulangi applies it again");
  await page.context().close();

  // --- paste: only what the model allows gets in, nothing runs
  page = await fresh("");
  await page.evaluate(() => {
    const el = document.querySelector("[role=textbox][aria-label^='Isi catatan']");
    el.focus();
    const data = new DataTransfer();
    data.setData("text/html", '<p onclick="window.__xss=1">Aman <b>tebal</b><script>window.__xss=1<\/script><img src=x onerror="window.__xss=1"><style>p{color:red}</style><a href="javascript:window.__xss=1">tautan</a></p><ul><li>a</li><li>b<ul><li>b1</li></ul></li></ul><iframe src="javascript:window.__xss=1"></iframe>');
    data.setData("text/plain", "fallback");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(250);
  const pasted = await editorHtml(page);
  ok(!/<script|<img|<iframe|<style|onclick|onerror|javascript:|<a\b/i.test(pasted), "pasted HTML keeps no script, image, iframe, style, link or handler", pasted);
  ok(await page.evaluate(() => window.__xss === undefined), "nothing from the pasted markup ran");
  await save(page);
  ok(flat(await firstDoc(page)).join() === "p|Aman [b]tebaltautan,li:ul|a,li:ul|b,li:ul:d1|b1", "allowed structure survives the paste", flat(await firstDoc(page)).join());
  await clearEditorAndType(page, "");
  await page.evaluate(() => {
    const el = document.querySelector("[role=textbox][aria-label^='Isi catatan']");
    const data = new DataTransfer();
    data.setData("text/plain", "• x\n• y\n1. z\n[ ] w");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(200);
  await save(page);
  ok(flat(await firstDoc(page)).join() === "li:ul|x,li:ul|y,li:ol|z,li:todo|w", "plain text paste turns bullets, numbers and [ ] into lists", flat(await firstDoc(page)).join());
  await page.context().close();

  // --- stored text is never markup
  const evil = "<img src=x onerror=window.__xss=1><script>window.__xss=1</script>";
  page = await start(browser, { storage: { "ctd.memo.v2": { v: 2, notes: [{ id: "e1", title: "<b>judul</b>", doc: { v: 1, blocks: [{ k: "p", r: [{ t: evil }] }, { k: "li", l: "todo", d: 0, r: [{ t: evil }] }] }, createdAt: "a", updatedAt: "b" }], activeId: "e1", rev: 1 } } });
  await openModal(page);
  ok(await page.evaluate(() => window.__xss === undefined), "hostile stored text does not run in the card or the editor");
  ok((await page.locator(EDITOR).innerText()).includes("<img src=x onerror") && await page.locator("#memo-panel img, [data-memo-card] img").count() === 0, "it is shown as plain characters");
  ok(await page.getByRole("tab", { name: "<b>judul</b>" }).count() === 1, "a note title with markup is shown literally");
  await page.context().close();

  // --- copy as plain text
  page = await fresh("");
  await tool(page, "Judul").click();
  await page.keyboard.type("Rencana");
  await page.keyboard.press("Enter");
  await tool(page, "Poin").click();
  await page.keyboard.type("poin");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await tool(page, "Angka").click();
  await page.keyboard.type("langkah");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await tool(page, "Centang").click();
  await page.keyboard.type("cek");
  await page.getByRole("button", { name: /^Salin/ }).first().click();
  await page.waitForTimeout(300);
  const clip = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
  ok(clip === "Rencana\n• poin\n1. langkah\n[ ] cek", "Salin puts tidy plain text on the clipboard", JSON.stringify(clip));
  ok(await page.getByText("Tersalin").first().isVisible(), "Salin confirms with 'Tersalin'");
  await page.context().close();
  await browser.close();
})().catch(error => { console.log("FAIL", error.message.split("\n")[0]); process.exitCode = 1; });
