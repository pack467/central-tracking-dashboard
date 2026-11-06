import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BIO_MAX, normalizeBio } from "../app/lib/profile-bio.ts";
import { formatDuration, isTicketOf, permissionLabel, rosterDayIndex, ticketStats } from "../app/lib/profile-stats.ts";

const budi = { id: "6", name: "Budi Santoso" };
const ticket = over => ({ id: "1", subject: "s", project: "SM", severity: "Low", status: "Open", owner: "Lain", created: "09:00", ...over });

test("the profile page is about whoever is logged in, not a sample person, and shows no made-up numbers", () => {
  const source = readFileSync("app/components/views/ProfileView.tsx", "utf8");
  assert.ok(source.includes("useAuth"));
  for (const sample of ["galih", "seedRosterMembers", "seedTickets", "98.5%", "1.184 Jam"]) assert.ok(!source.toLowerCase().includes(sample.toLowerCase()), `has no ${sample}`);
  const mobile = readFileSync("app/components/layout/MobileNav.tsx", "utf8");
  assert.ok(!mobile.includes("Galih Khairi"), "the mobile menu names the person logged in");
});

test("a ticket is someone's by the backend's assignee, a person id, or a PIC name", () => {
  assert.ok(isTicketOf(ticket({ backend: { userId: "6" } }), budi));
  assert.ok(isTicketOf(ticket({ ownerIds: ["6"] }), budi));
  assert.ok(isTicketOf(ticket({ owner: " budi santoso " }), budi));
  assert.ok(isTicketOf(ticket({ owners: ["Andi", "Budi Santoso"] }), budi));
  assert.ok(!isTicketOf(ticket({ owner: "Budi" }), budi), "only the whole name counts");
});

test("ticket numbers are counted, and an average needs something to average", () => {
  const stats = ticketStats([
    ticket({ status: "Open" }),
    ticket({ status: "Closed", isStillOpen: false, resolutionMinutes: 30 }),
    ticket({ status: "Closed", isStillOpen: false, resolutionMinutes: 90, escalationLevel: "Level 2" }),
  ]);
  assert.deepEqual([stats.total, stats.open, stats.closed, stats.escalated, stats.averageMinutes], [3, 1, 2, 1, 60]);
  assert.equal(ticketStats([ticket()]).averageMinutes, null);
  assert.deepEqual([formatDuration(null), formatDuration(45), formatDuration(60), formatDuration(135)], ["—", "45 mnt", "1 jam", "2 jam 15 mnt"]);
});

test("SLA is the dashboard's: finished tickets against their own target, and no finished ticket means no number rather than 0%", () => {
  const closed = (severity, resolutionMinutes) => ticket({ status: "Closed", isStillOpen: false, severity, resolutionMinutes });
  assert.equal(ticketStats([closed("High", 60), closed("High", 61), closed("Low", 120), closed("Low", 121), ticket({ status: "Open" })]).slaRate, 50);
  assert.equal(ticketStats([ticket({ status: "Open" })]).slaRate, null);
});

test("a roster week runs Monday to Sunday, whatever day the calendar week starts on", () => {
  assert.deepEqual(["2026-11-02", "2026-11-06", "2026-11-08"].map(rosterDayIndex), [0, 4, 6]);
});

test("a bio is tidied, kept short, and stays plain text on the page", () => {
  assert.equal(normalizeBio("  Operator NOC\r\n\r\n\r\n\r\nShift malam  "), "Operator NOC\n\nShift malam");
  assert.equal(normalizeBio("a".repeat(BIO_MAX + 50)).length, BIO_MAX);
  assert.equal(normalizeBio("   \n "), "");
  assert.ok(!readFileSync("app/components/profile/BioSection.tsx", "utf8").includes("dangerouslySetInnerHTML"));
});

test("saving a password always answers: the button is not silently locked, and failure and success both notify", () => {
  const source = readFileSync("app/components/profile/PasswordCard.tsx", "utf8");
  assert.ok(source.includes("disabled={saving}"), "only locked while a request is running");
  assert.ok(source.includes("notify.critical(") && source.includes("notify.success("));
});

test("the avatar only shows who you are: changing the photo is the one labelled button", () => {
  const source = readFileSync("app/components/views/ProfileView.tsx", "utf8");
  assert.ok(!source.includes('aria-label="Edit foto profil"'));
  assert.ok(source.includes('"Edit Foto"') && source.includes('"Tambah Foto"'));
});

test("a permission the app has no words for shows as it is", () => {
  assert.equal(permissionLabel("tickets.read"), "Lihat tiket");
  assert.equal(permissionLabel("baru.saja"), "baru.saja");
});
