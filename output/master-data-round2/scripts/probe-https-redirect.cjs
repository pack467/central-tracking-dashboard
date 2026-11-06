// Build made with NEXT_PUBLIC_SITE_URL=https://ctd.example.id: an http visit by LAN IP is sent to the https address; localhost is left alone.
const { launch } = require("./pw.cjs");
const ok = (c, l, e = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${e ? "  " + e : ""}`); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await launch();
  for (const [base, expectRedirect] of [["http://192.168.18.6:3100", true], ["http://localhost:3100", false]]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const attempted = [];
    page.on("request", r => { if (r.url().startsWith("https://ctd.example.id")) attempted.push(r.url()); });
    await page.goto(`${base}/login?next=%2Ftickets#x`, { waitUntil: "load", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    if (expectRedirect) ok(attempted.some(u => u === "https://ctd.example.id/login?next=%2Ftickets"), `${base}: sent to the https address with path and query kept`, attempted[0] || "no attempt");
    else ok(attempted.length === 0 && await page.getByRole("button", { name: "Masuk" }).count() > 0, `${base}: stays where it is (localhost is not redirected) and the page works`);
    await context.close();
  }
  await browser.close();
})().catch(e => { console.log("FAIL", e.message.slice(0, 300)); process.exitCode = 1; });
