// Runs every test file (npm run test:all, after a build). Tests that ask for a page need the app: this starts the production build on its own port
// for the length of the run, since :3000 and :3001 are the backend and the dev server in the team's setup.
import { execSync, spawn, spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const PORT = 3100;
const isUp = () => fetch(`http://localhost:${PORT}/login`, { signal: AbortSignal.timeout(2000) }).then(response => response.ok, () => false);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let server;
if (!(await isUp())) {
  server = spawn(`npx vinext start -p ${PORT}`, { shell: true, stdio: "ignore", detached: process.platform !== "win32" });
  let ready = false;
  for (let attempt = 0; attempt < 60 && !ready; attempt++) { await wait(1000); ready = await isUp(); }
  if (!ready) console.error(`[test-all] The app did not start on :${PORT}. Tests that need it will be skipped.`);
}

const files = readdirSync("tests").filter(name => name.endsWith(".test.mjs")).map(name => `tests/${name}`);
const run = spawnSync(process.execPath, ["--import", "./tests/report-typescript-loader.mjs", "--test", "--test-force-exit", ...files], { stdio: "inherit", env: { ...process.env, CTD_TEST_BASE: `http://localhost:${PORT}` } });

if (server) {
  try {
    if (process.platform === "win32") execSync(`taskkill /PID ${server.pid} /T /F`, { stdio: "ignore" });
    else process.kill(-server.pid);
  } catch { /* already gone */ }
}
process.exit(run.status ?? 1);
