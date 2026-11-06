import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import test from "node:test";
import { BASE, needsServer } from "./live-server.mjs";

const frontendRoot = resolve(import.meta.dirname, "..");

test("Layer 1: every page opens with a CSS animation the compositor can run, and nothing stays on the page after it", () => {
  const template = readFileSync(resolve(frontendRoot, "app/(app)/template.tsx"), "utf8");
  assert.ok(template.includes("route-enter"));
  assert.ok(!template.includes("framer-motion"), "a page move must not need a JavaScript animation library");

  const css = readFileSync(resolve(frontendRoot, "app/styles/tailwind/utilities.css"), "utf8");
  const keyframes = css.slice(css.indexOf("@keyframes routeEnter"), css.indexOf(".route-enter > * > * {"));
  assert.ok(keyframes.includes("opacity") && keyframes.includes("transform"));
  assert.ok(!/filter|width|height|top|left|margin/.test(keyframes), "only properties that do not repaint or move layout");
  const duration = Number(/routeEnter (\d+)ms/.exec(css)[1]);
  assert.ok(duration <= 300, "short");
  assert.ok(/routeEnter \d+ms [^;]*backwards;/.test(css), "backwards, so no transform is left behind for fixed elements to be placed against");
  assert.ok(/prefers-reduced-motion: reduce\)[\s\S]*\.route-enter > \* > \*/.test(css), "off for people who ask for less motion");

  const shell = readFileSync(resolve(frontendRoot, "app/components/routing/AppShell.tsx"), "utf8");
  assert.ok(!/app-page-view[^"]*will-change/.test(shell), "no permanent layer around every page");
});

test("Layer 2: LoginView has exit micro-interaction on 'Our Team' button before navigation", () => {
  const loginPath = resolve(frontendRoot, "app/components/auth/LoginView.tsx");
  assert.ok(existsSync(loginPath), "LoginView.tsx must exist");

  const content = readFileSync(loginPath, "utf8");
  assert.ok(content.includes("useRouter"));
  assert.ok(content.includes("isNavigatingToTeam"));
  assert.ok(content.includes("handleNavigateToTeam"));
  assert.ok(content.includes("routes.publicTeam()"));
  assert.ok(content.includes("setTimeout"));
  assert.ok(content.includes("startViewTransition"));
  assert.ok(content.includes("whileHover"));
  assert.ok(content.includes("whileTap"));
});

test("Server renders key pages (/login, /team, /) with status 200 and valid HTML", needsServer, async () => {
  const [loginRes, teamRes, homeRes] = await Promise.all([
    fetch(`${BASE}/login`),
    fetch(`${BASE}/team`),
    fetch(`${BASE}/dashboard`),
  ]);

  assert.equal(loginRes.status, 200, "/login should return 200");
  assert.equal(teamRes.status, 200, "/team should return 200");
  assert.equal(homeRes.status, 200, "/ should return 200");

  const loginHtml = await loginRes.text();
  assert.ok(loginHtml.includes("Our Team"), "Login page contains Our Team button");
  assert.ok(loginHtml.includes("CENTRAL"), "Login page contains CENTRAL brand");

  const teamHtml = await teamRes.text();
  assert.ok(teamHtml.includes("Meet Our Team"), "Team page contains header");
  assert.ok(teamHtml.includes("Mhd. Galih Khairi"), "Team page contains team members");

  const homeHtml = await homeRes.text();
  assert.ok(homeHtml.includes("app-shell"), "Home dashboard contains app-shell layout");
});


test("no loading.tsx anywhere in app: the router keys its Suspense on the route, so one above the shell rebuilt the whole shell on every page move", () => {
  const found = readdirSync(resolve(frontendRoot, "app"), { recursive: true }).filter(name => basename(String(name)) === "loading.tsx");
  assert.deepEqual(found, [], "a page keeps the old one on screen until it is ready; RouteView has the skeleton of the right shape for a first visit");
});
