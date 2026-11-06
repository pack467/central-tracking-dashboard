const path = require("path");
const os = require("os");
const { chromium } = require(path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"));
const OUT = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/master-data-round2/";
require("fs").mkdirSync(OUT, { recursive: true });
exports.OUT = OUT;
exports.BASE = process.env.CTD_BASE || "http://localhost:3000";
/** Gives a new context a stored session (the Operator NOC of the demo accounts), as if the person had logged in. */
exports.seedAuth = async context => context.addInitScript(() => {
  try {
    if (!localStorage.getItem("ctd.auth_token") && !location.pathname.startsWith("/login")) {
      localStorage.setItem("ctd.auth_token", "ctd_token_test");
      localStorage.setItem("ctd.auth_user", JSON.stringify({ id: "op-1", name: "Mhd. Galih Khairi", employeeId: "EMP-1001", role: "Operator NOC", email: "galih.khairi@company.id", avatarBg: "#2563eb", shift: "Malam" }));
    }
  } catch {}
});
exports.launch = async () => chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
/** A page with a frozen clock, console capture and the mock role passed through the URL. */
exports.open = async (browser, { width = 1440, height = 900, touch = false, noAuth: opts_noAuth = false } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  await context.addInitScript(() => { window.__TEST_CLOCK__ = "2026-10-28T03:00:00.000Z"; });
  if (!opts_noAuth) await exports.seedAuth(context);
  const page = await context.newPage();
  page.errors = [];
  page.on("console", message => { if (["error", "warning"].includes(message.type())) page.errors.push(`${message.type()}: ${message.text().slice(0, 300)}`); });
  page.on("pageerror", error => page.errors.push(`pageerror: ${String(error).slice(0, 300)}`));
  return page;
};
exports.shot = async (page, name) => page.screenshot({ path: OUT + name + ".png", fullPage: false });
