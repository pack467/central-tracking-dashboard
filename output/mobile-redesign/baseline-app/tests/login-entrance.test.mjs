import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const frontendRoot = resolve(import.meta.dirname, "..");

test("LoginView component has Framer Motion entrance animation with staggered reveal", () => {
  const compPath = resolve(frontendRoot, "app/components/auth/LoginView.tsx");
  assert.ok(existsSync(compPath), "LoginView.tsx must exist");

  const content = readFileSync(compPath, "utf8");

  // Framer Motion imports
  assert.ok(content.includes('from "framer-motion"'));
  assert.ok(content.includes("motion"));
  assert.ok(content.includes("useReducedMotion"));

  // Staggered variants
  assert.ok(content.includes("leftPanelVariants"));
  assert.ok(content.includes("leftHeaderVariants"));
  assert.ok(content.includes("leftHeadingVariants"));
  assert.ok(content.includes("leftSubtitleVariants"));
  assert.ok(content.includes("ourTeamBtnVariants"));
  assert.ok(content.includes("formCardVariants"));
  assert.ok(content.includes("formItemVariants"));
  assert.ok(content.includes("staggerChildren"));

  // Interactive submit button with whileHover and whileTap
  assert.ok(content.includes("whileHover"));
  assert.ok(content.includes("whileTap"));

  // Preserved functionality: form inputs remain accessible and interactive
  assert.ok(content.includes('id="login-identifier"'));
  assert.ok(content.includes('id="login-password"'));
  assert.ok(content.includes('type="submit"'));
  assert.ok(content.includes("handleSubmit"));
});

test("Server renders /login with status 200 and key branding content", async () => {
  const res = await fetch("http://localhost:3000/login");
  assert.equal(res.status, 200);

  const html = await res.text();
  assert.ok(html.includes("Selamat datang"));
  assert.ok(html.includes("Email atau ID Karyawan"));
  assert.ok(html.includes("Kata sandi"));
  assert.ok(html.includes("Our Team"));
});
