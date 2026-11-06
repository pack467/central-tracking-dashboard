import test from "node:test";
import assert from "node:assert/strict";
import { fetchSession } from "../app/lib/auth-api.ts";

const user = { id: "u-1", name: "Budi", email: "budi@example.com", role: "AGENT", permissions: [] };
const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function withFetch(answers, run) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    const path = String(url).match(/\/auth\/\w+/)[0];
    calls.push(path);
    const answer = answers[path];
    if (answer instanceof Error) throw answer;
    return answer();
  };
  try { return await run(calls); } finally { globalThis.fetch = original; }
}

test("a valid session gives the user and fetches the CSRF token", () => withFetch(
  { "/auth/me": () => json(200, user), "/auth/csrf": () => json(200, { csrf_token: "t" }) },
  async (calls) => {
    const session = await fetchSession();
    assert.equal(session.state, "user");
    assert.equal(session.user.id, "u-1");
    assert.deepEqual(calls, ["/auth/me", "/auth/csrf"]);
  },
));

test("only a 401 means there is no session", () => withFetch({ "/auth/me": () => json(401, { message: "no" }) }, async () => {
  assert.deepEqual(await fetchSession(), { state: "none" });
}));

test("the backend's request limit is not a logout", () => withFetch({ "/auth/me": () => json(429, { message: "slow down" }) }, async () => {
  assert.deepEqual(await fetchSession(), { state: "unknown", throttled: true });
}));

test("a server error is not a logout", () => withFetch({ "/auth/me": () => json(503, { message: "down" }) }, async () => {
  assert.deepEqual(await fetchSession(), { state: "unknown", throttled: false });
}));

test("no connection is not a logout", () => withFetch({ "/auth/me": new TypeError("fetch failed") }, async () => {
  assert.deepEqual(await fetchSession(), { state: "unknown", throttled: false });
}));

test("an answer that is not a user counts as no session", () => withFetch({ "/auth/me": () => json(200, { nope: true }) }, async () => {
  assert.deepEqual(await fetchSession(), { state: "none" });
}));

test("a failed CSRF fetch does not log the person out", () => withFetch(
  { "/auth/me": () => json(200, user), "/auth/csrf": new TypeError("fetch failed") },
  async () => { assert.equal((await fetchSession()).state, "user"); },
));
