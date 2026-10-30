// "npm run check:backend": checks, one link at a time, that this frontend can reach the backend and the backend its database, with the
// values from .env.local. Each step says what is wrong and where to fix it. Guide: docs/menghubungkan-backend.md.
//   npm run check:backend                                      env, backend, database, CORS
//   npm run check:backend -- --id <email|NIK> --password <pw>   also tries a real login (and logs out again)
// The frontend origin used for the CORS check is http://localhost:3001; another one goes in CTD_FRONTEND_ORIGIN.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnvFile } from "./check-production-env.mjs";

const KNOWN_MODULES = ["auth", "tickets", "people", "roles"];
const TIMEOUT_MS = 5000;

/** The files the dev server reads, in its order, then the real environment on top. */
function loadDevEnv(cwd = process.cwd()) {
  const merged = {};
  const files = [];
  for (const name of [".env", ".env.development", ".env.local", ".env.development.local"]) {
    const file = resolve(cwd, name);
    if (!existsSync(file)) continue;
    Object.assign(merged, parseEnvFile(readFileSync(file, "utf8")));
    files.push(name);
  }
  for (const [key, value] of Object.entries(process.env)) if (key.startsWith("NEXT_PUBLIC_")) merged[key] = value;
  return { env: merged, files };
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

let failed = false;
const ok = (message) => console.log(`  [OK]    ${message}`);
const warn = (message) => console.log(`  [AWAS]  ${message}`);
const fail = (message, fix) => { failed = true; console.log(`  [GAGAL] ${message}`); if (fix) console.log(`          -> ${fix}`); };

async function request(url, init = {}) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return null;
  }
}

async function main() {
  const { env, files } = loadDevEnv();
  const origin = process.env.CTD_FRONTEND_ORIGIN || "http://localhost:3001";
  const api = (env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

  console.log("\n1. Pengaturan frontend");
  if (files.length) ok(`dibaca dari ${files.join(", ")}`);
  else fail("tidak ada file .env.local", "salin .env.example menjadi .env.local");
  if (!api) return fail("NEXT_PUBLIC_API_URL kosong", "isi dengan alamat backend, misalnya http://localhost:3000");
  if (!URL.canParse(api)) return fail(`NEXT_PUBLIC_API_URL bukan alamat yang valid: ${api}`, "contoh yang benar: http://localhost:3000");
  ok(`alamat backend: ${api}`);
  if (new URL(api).origin === origin) {
    fail(`NEXT_PUBLIC_API_URL sama dengan alamat frontend (${origin})`, "frontend memanggil dirinya sendiri; arahkan ke port backend (PORT di backend/.env)");
  }
  const allBackend = env.NEXT_PUBLIC_USE_MOCK === "false";
  const modules = allBackend ? KNOWN_MODULES : (env.NEXT_PUBLIC_API_MODULES || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (allBackend) ok("NEXT_PUBLIC_USE_MOCK=false: semua modul memakai backend");
  else if (modules.includes("auth")) ok(`modul ke backend: ${modules.join(", ")} (sisanya data mock)`);
  else fail("modul 'auth' tidak aktif: halaman login hanya mencocokkan akun demo dan TIDAK memanggil backend",
    "isi NEXT_PUBLIC_API_MODULES=auth,tickets,people,roles di .env.local, lalu restart dev server frontend");

  console.log(`\n2. Backend (${api})`);
  const ready = await request(`${api}/ready`);
  if (!ready) return fail("backend tidak menjawab", `jalankan backend, dan pastikan PORT di backend/.env sama dengan port di ${api}`);
  if (!ready.ok) return fail(`GET /ready menjawab ${ready.status}; alamat ini sepertinya bukan backend CTD`, "periksa port NEXT_PUBLIC_API_URL");
  ok("backend berjalan (GET /ready 200)");

  console.log("\n3. Database (dilihat dari backend)");
  const health = await request(`${api}/health`);
  if (health?.ok) ok("backend tersambung ke database (GET /health 200)");
  else fail(`GET /health menjawab ${health?.status ?? "tidak ada jawaban"}: backend tidak bisa membuka database`,
    "pastikan PostgreSQL jalan dan DATABASE_URL di backend/.env benar (host, port, nama database, user, password)");

  console.log(`\n4. Izin browser / CORS (frontend ${origin})`);
  const preflight = await request(`${api}/auth/login`, {
    method: "OPTIONS",
    headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
  });
  const allowed = preflight?.headers.get("access-control-allow-origin");
  if (allowed === origin && preflight.headers.get("access-control-allow-credentials") === "true") ok(`backend menerima request dari ${origin}`);
  else fail(`backend menolak request dari ${origin} (Access-Control-Allow-Origin: ${allowed ?? "tidak ada"})`,
    `tambahkan ${origin} ke CORS_ORIGIN di backend/.env, lalu restart backend`);

  const me = await request(`${api}/auth/me`, { headers: { Origin: origin } });
  if (me?.status === 401) ok("GET /auth/me tanpa login menjawab 401, sesuai harapan");
  else warn(`GET /auth/me tanpa login menjawab ${me?.status ?? "tidak ada jawaban"} (seharusnya 401)`);

  const id = arg("id") ?? process.env.CTD_CHECK_ID;
  const password = arg("password") ?? process.env.CTD_CHECK_PASSWORD;
  console.log("\n5. Login");
  if (!id || !password) return console.log("  (dilewati) tambahkan: npm run check:backend -- --id <email|NIK> --password <password>");
  const login = await request(`${api}/auth/login`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ identifier: id, password }),
  });
  if (!login) return fail("POST /auth/login tidak menjawab");
  if (login.status === 401 || login.status === 400) return fail("email/NIK atau password salah, atau akun tidak aktif",
    "password awal = SEED_DEFAULT_PASSWORD di backend/.env, tapi hanya untuk user yang passwordnya masih kosong saat seed dijalankan");
  if (login.status === 429) return fail("terlalu banyak percobaan login (maks 5 per menit)", "tunggu satu menit lalu coba lagi");
  if (!login.ok) return fail(`POST /auth/login menjawab ${login.status}`);
  const body = await login.json().catch(() => null);
  ok(`login berhasil: ${body?.user?.name ?? id} (role: ${body?.user?.role ?? "-"})`);

  // End the session again, so the check leaves nothing behind.
  const cookie = login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
  if (cookie && body?.csrf_token) {
    await request(`${api}/auth/logout`, { method: "POST", headers: { Origin: origin, Cookie: cookie, "X-CSRF-Token": body.csrf_token } });
  }
}

await main();
console.log(failed ? "\nAda yang belum tersambung. Perbaiki langkah [GAGAL] pertama dari atas, lalu jalankan lagi.\n" : "\nSemua sambungan yang dicek beres.\n");
process.exitCode = failed ? 1 : 0;
