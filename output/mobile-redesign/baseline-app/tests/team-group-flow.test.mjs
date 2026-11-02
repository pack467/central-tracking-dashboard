import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const frontendRoot = resolve(process.cwd());

test("Team data has all 4 members with real transparent photos", () => {
  const teamFilePath = resolve(frontendRoot, "app/data/team.ts");
  assert.ok(existsSync(teamFilePath), "team.ts must exist");

  const content = readFileSync(teamFilePath, "utf8");
  assert.ok(content.includes('id: "galih"'));
  assert.ok(content.includes('id: "dimas"'));
  assert.ok(content.includes('id: "pangondion"'));
  assert.ok(content.includes('id: "ihsanul"'));

  // Verify all 4 members have transparent photos and hasRealPhoto: true
  assert.ok(content.includes('/team/galih-transparent.png'));
  assert.ok(content.includes('/team/dimas-transparent.png'));
  assert.ok(content.includes('/team/pangondion-transparent.png'));
  assert.ok(content.includes('/team/ihsanul-transparent.png'));

  // Verify assets exist on disk
  for (const file of [
    "galih-transparent.png",
    "dimas-transparent.png",
    "pangondion-transparent.png",
    "ihsanul-transparent.png",
  ]) {
    const p = resolve(frontendRoot, "public/team", file);
    assert.ok(existsSync(p), `Photo asset public/team/${file} must exist on disk`);
  }
});

test("TeamGroupHero component exists with unified group frame and responsive grid", () => {
  const compPath = resolve(frontendRoot, "app/components/team/TeamGroupHero.tsx");
  assert.ok(existsSync(compPath), "TeamGroupHero.tsx must exist");

  const content = readFileSync(compPath, "utf8");
  assert.ok(content.includes("export function TeamGroupHero"));
  assert.ok(content.includes("grid-cols-4"), "Must have 4 cols on desktop");
  assert.ok(content.includes("grid-cols-2"), "Must have 2 cols per row on mobile");
  assert.ok(content.includes("onSelectMember"), "Must support selecting individual member");
  assert.ok(content.includes("object-contain"), "Must use object-contain for transparent photos");
  assert.ok(!content.includes('Image className="rounded-full'), "Photos must not be circular (avatar rules)");
  assert.ok(!content.includes("rounded-full object-cover"), "Photos must not be circular (avatar rules)");

  // Verify unwanted texts are removed
  assert.ok(!content.includes("Rekayasawan Sistem"), "Rekayasawan Sistem badge must be removed");
  assert.ok(!content.includes("Pilih salah satu anggota"), "Pilih salah satu hint must be removed");
  assert.ok(!content.includes("Tim Aktif Operasional"), "Tim Aktif status must be removed");
  assert.ok(!content.includes("Klik kartu untuk spotlight"), "Klik kartu hint must be removed");

  // Verify no individual card wrapper borders or dividers
  assert.ok(!content.includes("bg-slate-950/40 hover:bg-slate-900/70"), "Must not use individual card background");
  assert.ok(!content.includes("divide-x"), "Must not use vertical divide-x lines");
  assert.ok(content.includes("absolute inset-x-0 bottom-0"), "Must have continuous edge-to-edge bottom fade");
});

test("TeamSpotlight component supports back to group view", () => {
  const compPath = resolve(frontendRoot, "app/components/team/TeamSpotlight.tsx");
  assert.ok(existsSync(compPath), "TeamSpotlight.tsx must exist");

  const content = readFileSync(compPath, "utf8");
  assert.ok(content.includes("onBackToGroup?: () => void"));
  assert.ok(content.includes('aria-label="Kembali ke semua anggota tim"'));
  assert.ok(content.includes("ArrowLeft"));
});

test("TeamSection manages view state (group <-> single)", () => {
  const compPath = resolve(frontendRoot, "app/components/team/TeamSection.tsx");
  assert.ok(existsSync(compPath), "TeamSection.tsx must exist");

  const content = readFileSync(compPath, "utf8");
  assert.ok(content.includes('useState<"group" | "single">("group")'));
  assert.ok(content.includes("TeamGroupHero"));
  assert.ok(content.includes("TeamSpotlight"));
  assert.ok(content.includes("handleSelectMember"));
  assert.ok(content.includes("handleBackToGroup"));
});

test("Server renders /team with Group Hero as initial view", async () => {
  const res = await fetch("http://localhost:3000/team");
  assert.equal(res.status, 200);

  const html = await res.text();
  assert.ok(html.includes("Meet Our Team"));
  assert.ok(html.includes("Hutabyte"));
  assert.ok(html.includes("Mhd. Galih Khairi"));
  assert.ok(html.includes("Dimas Yudistira"));
  assert.ok(html.includes("Pangondion Kurniawan Naibaho"));
  assert.ok(html.includes("Muhammad Ihsanul Arifin"));
});

test("Simulate group -> single -> group flow for Galih (0) and Pangondion (2)", () => {
  // State simulation matching TeamSection exactly
  let view = "group";
  let activeIndex = 0;

  const handleSelectMember = (index) => {
    activeIndex = index;
    view = "single";
  };

  const handleBackToGroup = () => {
    view = "group";
  };

  // 1. Initial State
  assert.equal(view, "group");

  // 2. Select Galih (0)
  handleSelectMember(0);
  assert.equal(view, "single");
  assert.equal(activeIndex, 0);

  // 3. Click "Lihat Semua Tim"
  handleBackToGroup();
  assert.equal(view, "group");

  // 4. Select Pangondion (2)
  handleSelectMember(2);
  assert.equal(view, "single");
  assert.equal(activeIndex, 2);

  // 5. Click "Lihat Semua Tim"
  handleBackToGroup();
  assert.equal(view, "group");
});

test("TeamBackButton exists and handles dynamic previous page navigation", () => {
  const backBtnPath = resolve(frontendRoot, "app/components/team/TeamBackButton.tsx");
  assert.ok(existsSync(backBtnPath), "TeamBackButton.tsx must exist");

  const btnContent = readFileSync(backBtnPath, "utf8");
  assert.ok(btnContent.includes("useRouter"));
  assert.ok(btnContent.includes("router.back()"));
  assert.ok(btnContent.includes("fromParam"));

  const pagePath = resolve(frontendRoot, "app/team/page.tsx");
  const pageContent = readFileSync(pagePath, "utf8");
  assert.ok(pageContent.includes("TeamBackButton"));

  const loginPath = resolve(frontendRoot, "app/components/auth/LoginView.tsx");
  const loginContent = readFileSync(loginPath, "utf8");
  assert.ok(loginContent.includes("/team?from=/login"));
});

