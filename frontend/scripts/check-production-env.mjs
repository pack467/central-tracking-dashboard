// Run before every build (npm "prebuild"). NEXT_PUBLIC_* values are written into the JavaScript at build time, so a wrong value cannot be
// fixed after deploy: it has to be caught here. Set CTD_DEPLOY_ENV=production in the pipeline that builds what users will open; that turns
// the checks on. Without it only combinations that can never be right are errors, and the rest is printed as a warning.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KNOWN_MODULES = ["auth", "tickets", "people", "roles"];
const NEEDS_AUTH = ["tickets", "people", "roles"];

/** KEY=VALUE lines, # comments, optional quotes. Enough for .env files; not a full dotenv. */
export function parseEnvFile(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || line.trimStart().startsWith("#")) continue;
    let value = match[2];
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    result[match[1]] = value;
  }
  return result;
}

/** The same precedence the framework uses for a production build: the real environment, then .env.production.local, .env.local, .env.production, .env. */
export function loadBuildEnv(cwd = process.cwd(), base = process.env) {
  const merged = {};
  for (const name of [".env", ".env.production", ".env.local", ".env.production.local"]) {
    const file = resolve(cwd, name);
    if (existsSync(file)) Object.assign(merged, parseEnvFile(readFileSync(file, "utf8")));
  }
  return { ...merged, ...Object.fromEntries(Object.entries(base).filter(([, value]) => value !== undefined)) };
}

/** Returns { errors, warnings } for a build environment. */
export function checkProductionEnv(env) {
  const errors = [], warnings = [];
  const strict = env.CTD_DEPLOY_ENV === "production";
  const flag = name => String(env[name] ?? "").trim().toLowerCase();
  const useMock = flag("NEXT_PUBLIC_USE_MOCK") !== "false";
  const listed = String(env.NEXT_PUBLIC_API_MODULES ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  const unknown = listed.filter(name => !KNOWN_MODULES.includes(name));
  const active = useMock ? listed.filter(name => KNOWN_MODULES.includes(name)) : KNOWN_MODULES;
  const apiUrl = String(env.NEXT_PUBLIC_API_URL ?? "").trim();

  // wrong whatever the target
  if (unknown.length) errors.push(`NEXT_PUBLIC_API_MODULES has unknown names: ${unknown.join(", ")} (known: ${KNOWN_MODULES.join(", ")}).`);
  if (useMock && NEEDS_AUTH.some(name => listed.includes(name)) && !listed.includes("auth")) errors.push("NEXT_PUBLIC_API_MODULES lists tickets, people or roles without auth: they need a login session.");
  if (apiUrl && !/^https?:\/\/[^\s/]+/i.test(apiUrl)) errors.push(`NEXT_PUBLIC_API_URL is not a URL: "${apiUrl}".`);

  const siteUrl = String(env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (siteUrl && !/^https?:\/\/[^\s/]+/i.test(siteUrl)) errors.push(`NEXT_PUBLIC_SITE_URL is not a URL: "${siteUrl}".`);

  const problem = message => (strict ? errors : warnings).push(message);
  if (!/^https:\/\//i.test(siteUrl)) problem("NEXT_PUBLIC_SITE_URL must be the https:// address users open. Without it the build sends no HSTS and no upgrade-insecure-requests, and an http visit is not sent to https.");
  if (flag("NEXT_PUBLIC_ALLOW_DEMO_LOGIN") === "true") problem("NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true opens the demo accounts (a known password) to everyone who opens the site.");
  if (flag("HANDOVER_SIMULATED_ACTOR") === "true") problem("HANDOVER_SIMULATED_ACTOR=true lets every handover request act as a built-in operator.");
  if (!active.includes("auth")) problem("No login through the backend: nobody can sign in (demo accounts are not available in production). Set NEXT_PUBLIC_USE_MOCK=false, or list auth in NEXT_PUBLIC_API_MODULES.");
  if (active.length && !apiUrl) problem("NEXT_PUBLIC_API_URL is empty, so the app would call its built-in default address. Set it to the real API address.");
  if (active.length && apiUrl && !/^https:\/\//i.test(apiUrl)) problem(`NEXT_PUBLIC_API_URL must be https:// in production (a page served over https cannot call "${apiUrl}"; the session cookie needs Secure).`);
  if (flag("NEXT_PUBLIC_LOCAL_TEST_EMAIL") || flag("NEXT_PUBLIC_LOCAL_TEST_PASSWORD")) problem("NEXT_PUBLIC_LOCAL_TEST_* (a test account) is set for this build.");
  return { errors, warnings, strict };
}

function main() {
  const { errors, warnings, strict } = checkProductionEnv(loadBuildEnv());
  for (const message of warnings) console.warn(`[env] warning: ${message}`);
  if (!strict && warnings.length) console.warn("[env] CTD_DEPLOY_ENV is not 'production', so these are warnings. The pipeline that builds for users must set CTD_DEPLOY_ENV=production to make them errors.");
  if (errors.length) {
    for (const message of errors) console.error(`[env] error: ${message}`);
    console.error("[env] Build stopped. Fix the environment values above (see frontend/.env.example and docs/frontend-auth.md).");
    process.exit(1);
  }
  console.log(`[env] build environment ok${strict ? " (production checks on)" : ""}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
