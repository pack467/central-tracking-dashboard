// Before / after of a focused search box. "Before" re-applies the measured old state (a 2px sky outline, 2px offset on the focused input)
// on top of the current page, because the old rule no longer exists in the code.
const { launch, open, BASE } = require("./pw.cjs");
const DIR = process.env.SHOT_DIR;
const OLD = "input:focus, textarea:focus { outline: 2px solid oklch(0.746 0.16 232.661) !important; outline-offset: 2px !important; }";
const TARGETS = [
  ["tickets", "/tickets", "Cari tiket"], ["monitoring", "/monitoring", null], ["shift-log", "/shift-log", null], ["reports", "/reports/ticket-log", "Cari catatan laporan"],
  ["team-roster", "/team-roster", "Cari anggota tim"], ["master-data", "/master-data?group=services&tab=organizations", "Cari Organisasi"], ["runbooks", "/runbooks", "Cari di runbooks"],
];
(async () => {
  const browser = await launch();
  for (const [name, path, label] of TARGETS) {
    if (!label) continue; // Monitoring and Shift Log have no text search box
    for (const tag of ["before", "after"]) {
      const page = await open(browser);
      await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}mock=instant`, { waitUntil: "networkidle" });
      await page.waitForTimeout(900);
      const input = page.getByLabel(label).first();
      if (tag === "before") await page.addStyleTag({ content: OLD });
      await input.click();
      await page.keyboard.type("abc");
      await page.waitForTimeout(350);
      const box = await input.boundingBox();
      await page.screenshot({ path: `${DIR}/search-${name}-${tag}.png`, clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 22), width: Math.min(560, 1440 - Math.max(0, box.x - 40)), height: box.height + 44 } });
      await page.context().close();
    }
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.split("\n")[0]); process.exitCode = 1; });
