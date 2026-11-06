import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const frontendRoot = resolve(import.meta.dirname, "..");

test("Layer 1: app/(app)/template.tsx exists with Framer Motion route enter animation", () => {
  const templatePath = resolve(frontendRoot, "app/(app)/template.tsx");
  assert.ok(existsSync(templatePath), "app/(app)/template.tsx must exist");

  const content = readFileSync(templatePath, "utf8");
  assert.ok(content.includes('"use client"') || content.includes("'use client'"), "Must be a client component");
  assert.ok(content.includes('from "framer-motion"'));
  assert.ok(content.includes("motion.div"));
  assert.ok(content.includes("useReducedMotion"));
  assert.ok(content.includes("opacity: 0"));
  assert.ok(content.includes("opacity: 1"));
  assert.ok(content.includes("y: 0"));
  assert.ok(content.includes("transitionEnd"));
  assert.ok(content.includes("transform: \"none\""));
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

test("Server renders key pages (/login, /team, /) with status 200 and valid HTML", async () => {
  const [loginRes, teamRes, homeRes] = await Promise.all([
    fetch("http://localhost:3000/login"),
    fetch("http://localhost:3000/team"),
    fetch("http://localhost:3000/dashboard"),
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

