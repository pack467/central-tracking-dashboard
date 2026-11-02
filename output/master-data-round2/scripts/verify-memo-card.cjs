// The Memo card on the dashboard: no chips, "N catatan" info, "Lihat semua" on its own row, one height, touch targets, contrast, CLS.
const { launch, ok, start } = require("./memo-helpers.cjs");
const SHOTS = process.env.SHOT_DIR;
const LONG = "Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi dan pastikan antrean ActiveMQ tetap dalam batas yang aman sampai serah terima berikutnya.";
const at = "2026-10-28T03:00:00.000Z";
const note = (i, text = LONG, extra = {}) => ({ id: `n${i}`, title: `Catatan ${i + 1}`, doc: { v: 1, blocks: text ? [{ k: "li", l: "ul", d: 0, r: [{ t: text }] }, { k: "li", l: "ul", d: 0, r: [{ t: text }] }, { k: "li", l: "ul", d: 0, r: [{ t: "Status failover DR standby normal." }] }] : [] }, createdAt: at, updatedAt: at, ...extra });
const state = (notes, activeId) => ({ "ctd.memo.v2": { v: 2, rev: 1, activeId: activeId || notes[0].id, notes } });

const read = page => page.evaluate(() => {
  const card = document.querySelector("[data-memo-card]"), r = card.getBoundingClientRect();
  const pill = card.querySelector('button[aria-label="Buka semua catatan"]'), more = card.querySelector("[data-memo-more]");
  const body = card.querySelector("[data-memo-copy]")?.closest("div.overflow-hidden") ?? null;
  const bodyBox = body?.parentElement?.getBoundingClientRect();
  const small = [...card.querySelectorAll("button")].filter(b => b.offsetParent !== null).map(b => { const x = b.getBoundingClientRect(); return { who: (b.getAttribute("aria-label") || b.textContent).trim().slice(0, 24), h: Math.round(x.height), w: Math.round(x.width) }; });
  const m = more?.getBoundingClientRect();
  return {
    height: Math.round(r.height), width: Math.round(r.width), chips: card.querySelectorAll("[aria-pressed]").length,
    pill: pill ? pill.textContent.trim() : null, updated: [...card.querySelectorAll("span")].map(s => s.textContent).find(t => /^Diperbarui/.test(t)) || null,
    more: !!more, overlap: m && bodyBox ? m.top < bodyBox.bottom - 0.5 : false, moreTop: m ? Math.round(m.top - bodyBox.bottom) : null,
    small, empty: /Belum ada catatan/.test(card.textContent), hscroll: document.documentElement.scrollWidth > innerWidth + 1,
    minFont: Math.min(...[...card.querySelectorAll("*")].filter(e => e.children.length === 0 && e.textContent.trim()).map(e => parseFloat(getComputedStyle(e).fontSize))),
  };
});

(async () => {
  const browser = await launch();
  for (const [name, width, height, touch] of [["desktop 1440", 1440, 900, false], ["mobile 390", 390, 844, true]]) {
    const heights = [];
    for (const [label, notes, expect] of [
      ["1 catatan", [note(0)], "1 catatan"],
      ["2 catatan", [note(0), note(1)], "2 catatan"],
      ["10 catatan", Array.from({ length: 10 }, (_, i) => note(i)), "10 catatan"],
      ["pendek", [note(0, "Singkat saja.")], "1 catatan"],
    ]) {
      const page = await start(browser, { width, height, touch, storage: state(notes) });
      const m = await read(page);
      heights.push(m.height);
      ok(m.chips === 0, `${name}, ${label}: no note chips on the card`);
      ok(m.pill === expect, `${name}, ${label}: the info reads "${m.pill}"`);
      ok(m.updated === "Diperbarui 10.00", `${name}, ${label}: shows "${m.updated}" (frozen clock)`);
      if (label !== "pendek") ok(m.more && !m.overlap && m.moreTop >= 0, `${name}, ${label}: "Lihat semua" sits ${m.moreTop}px below the text, not on it`);
      if (touch) ok(m.small.every(b => b.h >= 44), `${name}, ${label}: touch targets are 44px (${m.small.map(b => b.h).join("/")})`, JSON.stringify(m.small));
      ok(m.minFont >= 11 && !m.hscroll, `${name}, ${label}: smallest text ${m.minFont}px, no horizontal scroll`);
      if (label === "2 catatan") {
        await page.locator("[data-memo-card]").first().evaluate(el => el.closest("article").scrollIntoView({ block: "center" }));
        await page.locator("[data-memo-card]").first().evaluate(el => el.closest("article")).then(() => {});
        await page.locator("article", { hasText: "Memo & Catatan Shift" }).first().screenshot({ path: `${SHOTS}/memo-card-${name.split(" ")[0]}-new-after.png` });
        await page.getByRole("button", { name: "Buka semua catatan" }).click();
        await page.waitForSelector("[data-memo-open]");
        ok(await page.locator("[data-memo-open] [role=tablist] [role=tab]").count() === 2, `${name}: clicking the info opens the modal with its 2 note tabs`);
      }
      await page.context().close();
    }
    ok(new Set(heights.filter((_, i) => i !== 3)).size === 1 || Math.max(...heights) - Math.min(...heights) <= 0, `${name}: the card keeps one height for 1, 2, 10 notes and a short note (${heights.join(", ")}px)`);
  }

  // 0 notes with text: the empty card, no info pill
  for (const [name, width, height, touch] of [["desktop", 1440, 900, false], ["mobile", 390, 844, true]]) {
    const page = await start(browser, { width, height, touch, storage: state([note(0, "")]) });
    const m = await read(page);
    ok(m.empty && m.pill === null && m.chips === 0, `${name}: nothing written: "Belum ada catatan", no pill`);
    if (touch) ok(m.small.every(b => b.h >= 44), `${name}: the empty card's button is 44px`, JSON.stringify(m.small));
    await page.locator("article", { hasText: "Memo & Catatan Shift" }).first().screenshot({ path: `${SHOTS}/memo-card-${name}-empty-after.png` });
    await page.context().close();
  }

  // pinned note wins; otherwise the active one
  let page = await start(browser, { storage: state([note(0, "Aktif biasa"), note(1, "Yang disematkan", { pinned: true })], "n0") });
  ok((await page.locator("[data-memo-card]").first().innerText()).includes("Yang disematkan"), "the pinned note is the one shown");
  await page.context().close();
  page = await start(browser, { storage: state([note(0, "Pertama"), note(1, "Kedua dipilih")], "n1") });
  ok((await page.locator("[data-memo-card]").first().innerText()).includes("Kedua dipilih"), "without a pinned note the active one is shown");
  await page.context().close();

  // contrast of the info and links
  page = await start(browser, { storage: state([note(0), note(1)]) });
  const ratios = await page.evaluate(() => {
    const px = document.createElement("canvas").getContext("2d", { willReadFrequently: true }); px.canvas.width = px.canvas.height = 1;
    const parse = css => { px.clearRect(0, 0, 1, 1); px.fillStyle = "#000"; px.fillStyle = css; px.fillRect(0, 0, 1, 1); const d = px.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; };
    const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const of = el => { const layers = []; for (let n = el; n; n = n.parentElement) { const bg = parse(getComputedStyle(n).backgroundColor); if (bg.a > 0) layers.push(bg); if (bg.a === 1) break; } let back = layers.length && layers[layers.length - 1].a === 1 ? layers.pop() : { r: 30, g: 41, b: 59, a: 1 }; while (layers.length) back = over(layers.pop(), back); const fg = over(parse(getComputedStyle(el).color), back); const a = lum(fg), b = lum(back); return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100; };
    const card = document.querySelector("[data-memo-card]");
    return { "info pill": of(card.querySelector('button[aria-label="Buka semua catatan"]')), Diperbarui: of([...card.querySelectorAll("span")].find(s => /^Diperbarui/.test(s.textContent))), "Lihat semua": of(card.querySelector("[data-memo-more]")), Edit: of([...card.querySelectorAll("button")].find(b => /^Edit/.test(b.getAttribute("aria-label") || ""))), text: of(card.querySelector("[data-memo-copy]")) };
  });
  const lowest = Object.entries(ratios).reduce((a, b) => (b[1] < a[1] ? b : a));
  console.log("  contrast", JSON.stringify(ratios));
  ok(lowest[1] >= 4.5, `lowest contrast on the card is ${lowest[1]}:1 (${lowest[0]})`);
  await page.context().close();

  // CLS: the card, from first paint to settled, at desktop and phone size
  for (const [name, width, height, touch] of [["desktop", 1440, 900, false], ["mobile", 390, 844, true]]) {
    const p = await start(browser, { width, height, touch, storage: state([note(0), note(1)]), extra: "window.__cs = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput && e.sources.some(s => s.node && s.node.parentElement && s.node.parentElement.closest('.ops-shift-panel'))) window.__cs += e.value; }).observe({ type: 'layout-shift', buffered: true });" });
    await p.waitForTimeout(1200);
    ok(await p.evaluate(() => window.__cs) === 0, `${name}: layout shift of the memo card from load to settled is 0 (got ${await p.evaluate(() => window.__cs)})`);
    await p.context().close();
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
