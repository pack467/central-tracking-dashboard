// Some tests ask the running app for a page. `npm run test:all` starts it; without it those tests are skipped, and say why.
// CTD_TEST_BASE says where it is. The check asks for the login page, because any server on the port answers something (the backend is usually on :3000).
export const BASE = process.env.CTD_TEST_BASE ?? "http://localhost:3000";
const up = await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(2000) }).then(response => response.ok, () => false);

export const needsServer = up ? {} : { skip: `needs the app on ${BASE} (npm run test:all starts it)` };
