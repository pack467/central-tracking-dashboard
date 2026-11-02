declare module "cloudflare:workers" {
  export const env: {
    DB?: any;
    [key: string]: any;
  };
}

interface Fetcher {
  fetch: typeof fetch;
}

interface D1Database {
  prepare: (query: string) => any;
  dump: () => Promise<ArrayBuffer>;
  batch: (statements: any[]) => Promise<any[]>;
  exec: (query: string) => Promise<any>;
}
