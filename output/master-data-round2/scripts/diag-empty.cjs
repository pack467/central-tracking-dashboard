// Diagnosis: Tiket Hari Ini with no tickets today (clock moved to a day without tickets), and the wrappers of the borderless search boxes.
const fs = require("fs");
const { launch, open, BASE } = require("./pw.cjs");
(async () => {
  const browser = await launch();
  for (const [name, width, height, touch] of [["1440", 1440, 900, false], ["390", 390, 844, true]]) {
    const page = await open(browser, { width, height, touch });
    const tickets = fs.readFileSync(__dirname + "/empty-tickets.json", "utf8");
    await page.addInitScript(t => { localStorage.setItem("ctd.tickets.v4", t); }, tickets);
    await page.goto(`${BASE}/dashboard?mock=instant`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1800);
    const info = await page.evaluate(() => {
      const hint = [...document.querySelectorAll(".ops-empty-hint")].find(el => /tiket/i.test(el.textContent));
      if (!hint) return { hint: false, badge: document.querySelector(".ops-count-badge")?.textContent };
      const card = hint.closest("article"), cr = card.getBoundingClientRect(), hr = hint.getBoundingClientRect(), txt = document.createRange();
      txt.selectNodeContents(hint);
      const tr = txt.getBoundingClientRect();
      const chain = []; for (let n = hint.parentElement; n && n !== card; n = n.parentElement) chain.push(n.tagName.toLowerCase() + "." + String(n.className).split(" ").slice(0, 4).join(".") + ` ${Math.round(n.getBoundingClientRect().height)}h`);
      return { hint: true, text: hint.textContent, card: [Math.round(cr.width), Math.round(cr.height)], hintBox: [Math.round(hr.left - cr.left), Math.round(hr.top - cr.top), Math.round(hr.width), Math.round(hr.height)], textCenterY: Math.round(tr.top + tr.height / 2 - cr.top), cardCenterY: Math.round(cr.height / 2), chain };
    });
    console.log(name, JSON.stringify(info, null, 1));
    await page.screenshot({ path: `${process.env.SHOT_DIR}/tiket-kosong-${name}-before.png` });
    await page.context().close();
  }
  // wrappers of the search boxes whose own border is 0
  const page = await open(browser);
  for (const path of ["/tickets", "/team-roster", "/notifications", "/runbooks", "/reports/ticket-log"]) {
    await page.goto(`${BASE}${path}?mock=instant`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const chain = await page.evaluate(() => {
      const input = [...document.querySelectorAll("input")].find(el => /^cari/i.test(el.getAttribute("aria-label") || el.placeholder || ""));
      if (!input) return "no search input";
      const out = []; for (let n = input.parentElement, i = 0; n && i < 3; n = n.parentElement, i++) { const cs = getComputedStyle(n); out.push(`${n.tagName.toLowerCase()}.${String(n.className).split(" ").slice(0, 5).join(".")} border=${cs.borderTopWidth} ${cs.borderTopColor.slice(0, 20)} bg=${cs.backgroundColor.slice(0, 22)}`); }
      return out;
    });
    console.log(path, JSON.stringify(chain));
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
