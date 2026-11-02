// Opens the built app by LAN IP over plain http and counts what fails to load.
const { launch } = require("./pw.cjs");
(async () => {
  const browser = await launch();
  for (const base of ["http://localhost:3100", "http://192.168.18.6:3100"]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const failed = [];
    page.on("requestfailed", r => failed.push(`${r.url().slice(0, 60)} ${r.failure()?.errorText}`));
    const upgraded = [];
    page.on("request", r => { if (r.url().startsWith("https://192.168") || r.url().startsWith("https://localhost")) upgraded.push(r.url().slice(0, 60)); });
    await page.goto(`${base}/login`, { waitUntil: "load", timeout: 20000 }).catch(e => failed.push("goto " + e.message.slice(0, 80)));
    await page.waitForTimeout(3000);
    const hasForm = await page.getByRole("button", { name: "Masuk" }).count();
    console.log(`${base}: login button rendered=${hasForm > 0}, failed requests=${failed.length}, upgraded to https=${upgraded.length}`);
    for (const f of failed.slice(0, 3)) console.log("   ", f);
    await context.close();
  }
  await browser.close();
})();
