// A formatted note with several tabs, on the card and in the modal. Usage: SHOT_DIR=... node shot-memo-rich.cjs
const { launch, start, openModal } = require("./memo-helpers.cjs");
const run = (t, m) => (m ? { t, m } : { t });
const rich = { v: 1, blocks: [
  { k: "h", r: [run("Serah terima shift pagi")] },
  { k: "p", r: [run("Pantau "), run("gateway B2B", ["b"]), run(" sebelum jam "), run("06:30", ["hl"]), run(" dan catat hasilnya.")] },
  { k: "li", l: "ul", d: 0, r: [run("Antrean ActiveMQ "), run("#228", ["b"]), run(" masih diinvestigasi")] },
  { k: "li", l: "ul", d: 1, r: [run("Cek konsumen yang macet", ["i"])] },
  { k: "li", l: "ol", d: 0, r: [run("Restart worker bila lag > 5 menit")] },
  { k: "li", l: "ol", d: 0, r: [run("Laporkan ke Shift Lead")] },
  { k: "li", l: "todo", d: 0, c: true, r: [run("Backup harian selesai")] },
  { k: "li", l: "todo", d: 0, r: [run("Verifikasi failover DR", ["u"])] },
] };
const note = (id, title, doc, extra = {}) => ({ id, title, doc, createdAt: "2026-10-29T00:00:00.000Z", updatedAt: "2026-10-29T00:00:00.000Z", ...extra });
const state = { v: 2, rev: 1, activeId: "a", notes: [
  note("a", "Serah terima", rich, { pinned: true }), note("b", "Insiden ActiveMQ", { v: 1, blocks: [{ k: "p", r: [run("Kronologi insiden.")] }] }),
  note("c", "Catatan 3", { v: 1, blocks: [] }), note("d", "Kontak vendor jaringan", { v: 1, blocks: [{ k: "p", r: [run("Hubungi NOC vendor.")] }] }),
] };
(async () => {
  const browser = await launch();
  for (const [name, width, height, touch] of [["desktop", 1440, 900, false], ["mobile", 390, 844, true]]) {
    const page = await start(browser, { width, height, touch, storage: { "ctd.memo.v2": state } });
    const card = page.locator("article", { hasText: "Memo & Catatan Shift" }).first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await card.screenshot({ path: `${process.env.SHOT_DIR}/memo-card-${name}-rich-after.png` });
    await openModal(page);
    await page.screenshot({ path: `${process.env.SHOT_DIR}/memo-modal-${name}-rich-after.png` });
    await page.context().close();
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
