import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Where handover notes are stored. On Cloudflare Workers, and on the dev server (which runs in workerd), that is the D1 binding. On plain
 * Node (`npm run start`) the module "cloudflare:workers" does not exist: a static import of it failed every handover request with a 500
 * before any of our code ran. There the notes live in a SQLite file instead (db/sqlite-store.ts). Both answer the same small API.
 */
let store: Promise<D1Database> | undefined;

async function openStore(): Promise<D1Database> {
  let binding: D1Database | undefined;
  try {
    ({ DB: binding } = (await import("cloudflare:workers")).env);
  } catch {
    const { openSqliteStore } = await import("./sqlite-store");
    return openSqliteStore();
  }
  if (!binding) throw new Error("Binding database handover tidak tersedia.");
  return binding;
}

export function getHandoverDb(): Promise<D1Database> {
  // a failed open is not remembered: the next request tries again
  store ??= openStore().catch((error) => { store = undefined; throw error; });
  return store;
}

export async function getDb() {
  return drizzle((await getHandoverDb()) as never, { schema });
}
