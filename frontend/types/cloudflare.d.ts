declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    [key: string]: unknown;
  };
}

interface Fetcher {
  fetch: typeof fetch;
}

/** The part of Cloudflare D1 the app uses. db/sqlite-store.ts answers the same calls on plain Node. */
interface D1PreparedStatement {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement;
  first: () => Promise<unknown>;
  all: () => Promise<unknown>;
  run: () => Promise<unknown>;
}

interface D1Database {
  prepare: (query: string) => D1PreparedStatement;
  dump: () => Promise<ArrayBuffer>;
  batch: (statements: D1PreparedStatement[]) => Promise<unknown[]>;
  exec: (query: string) => Promise<unknown>;
}
