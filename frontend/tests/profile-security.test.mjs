import test from "node:test";
import assert from "node:assert/strict";
import { clampOffset, coverScale, cropRect, isStoredPhoto, photoFileProblem } from "../app/lib/profile-photo.ts";
import { passwordChecks, passwordStrength } from "../app/lib/password-rules.ts";

const passed = (checks, key) => checks.find(check => check.key === key).ok;

test("the password rules are the backend's: 8 or more, at most 72 bytes because bcrypt ignores the rest", () => {
  assert.equal(passed(passwordChecks("lama", "1234567", ""), "length"), false);
  assert.equal(passed(passwordChecks("lama", "12345678", ""), "length"), true);
  assert.equal(passed(passwordChecks("lama", "a".repeat(72), ""), "maximum"), true);
  assert.equal(passed(passwordChecks("lama", "a".repeat(73), ""), "maximum"), false);
  assert.equal(passed(passwordChecks("lama", "é".repeat(40), ""), "maximum"), false, "40 characters but 80 bytes");
});

test("a new password needs a capital, a small letter, a number and a symbol, and all of them together unlock it", () => {
  const failing = (next) => passwordChecks("lama", next, next).filter(check => !check.ok).map(check => check.key);
  assert.deepEqual(failing("BaruSekali#2026"), []);
  assert.deepEqual(failing("barusekali#2026"), ["upper"]);
  assert.deepEqual(failing("BARUSEKALI#2026"), ["lower"]);
  assert.deepEqual(failing("BaruSekali#"), ["number"]);
  assert.deepEqual(failing("BaruSekali2026"), ["symbol"]);
  assert.deepEqual(failing("Baru Sekali2026"), ["symbol"], "a space is not a symbol");
});

test("a new password must differ from the current one and be typed the same twice", () => {
  assert.equal(passed(passwordChecks("rahasia123", "rahasia123", "rahasia123"), "different"), false);
  assert.equal(passed(passwordChecks("lama", "rahasia123", "rahasia124"), "match"), false);
  assert.equal(passed(passwordChecks("lama", "rahasia123", "rahasia123"), "match"), true);
  assert.equal(passed(passwordChecks("", "", ""), "match"), false, "two empty fields are not a match");
});

test("the strength meter is advice, and does not praise a weak password", () => {
  assert.equal(passwordStrength("").level, 0);
  assert.equal(passwordStrength("abc").level, 1);
  assert.equal(passwordStrength("aaaaaaaaaaaaaaaa").level, 1, "long but one letter");
  assert.equal(passwordStrength("abcdefgh").level, 1, "one kind of character");
  assert.equal(passwordStrength("abcd1234").level, 2);
  assert.equal(passwordStrength("Abcd1234!xyz").level, 3);
});

test("only ordinary pictures of a sane size are taken: an SVG can carry scripts", () => {
  assert.equal(photoFileProblem({ type: "image/png", size: 1000 }), null);
  assert.match(photoFileProblem({ type: "image/svg+xml", size: 1000 }), /PNG, JPG, atau WebP/);
  assert.match(photoFileProblem({ type: "image/gif", size: 1000 }), /PNG, JPG, atau WebP/);
  assert.match(photoFileProblem({ type: "image/jpeg", size: 6 * 1024 * 1024 }), /maksimal 5 MB/);
});

test("what is read back from storage goes into an image only if it is one of ours", () => {
  assert.ok(isStoredPhoto("data:image/webp;base64,AAAA"));
  for (const bad of ["javascript:alert(1)", "https://example.com/a.png", "data:image/svg+xml;base64,AAAA", "data:text/html;base64,AAAA", "data:image/png;base64,AA<script>", null, 5]) assert.equal(isStoredPhoto(bad), false, String(bad));
  assert.equal(isStoredPhoto("data:image/webp;base64," + "A".repeat(300_001)), false, "too large");
});

test("the crop always covers the frame: the image cannot be moved so that an empty part shows", () => {
  assert.equal(coverScale(1000, 500, 240), 240 / 500);
  // a wide image at zoom 1 moves sideways only
  assert.deepEqual(clampOffset({ x: 9999, y: 9999 }, 1000, 500, 240, 1), { x: 120, y: 0 });
  assert.deepEqual(clampOffset({ x: -9999, y: -9999 }, 1000, 500, 240, 1), { x: -120, y: 0 });
  // zooming in gives room both ways
  const zoomed = clampOffset({ x: 9999, y: 9999 }, 1000, 500, 240, 2);
  assert.ok(zoomed.x > 120 && zoomed.y > 0);
});

test("the square kept is the one shown, and stays inside the image however it was moved", () => {
  assert.deepEqual(cropRect(1000, 500, 240, 1, { x: 0, y: 0 }), { sx: 250, sy: 0, size: 500 });
  assert.equal(cropRect(1000, 500, 240, 1, { x: 120, y: 0 }).sx, 0, "dragged fully right shows the left edge");
  assert.equal(cropRect(1000, 500, 240, 1, { x: -120, y: 0 }).sx, 500, "dragged fully left shows the right edge");
  for (const [zoom, x, y] of [[1, 120, 0], [2, 9999, -9999], [3, -9999, 9999]]) {
    const offset = clampOffset({ x, y }, 1000, 500, 240, zoom);
    const { sx, sy, size } = cropRect(1000, 500, 240, zoom, offset);
    assert.ok(sx >= -1e-9 && sy >= -1e-9 && sx + size <= 1000 + 1e-9 && sy + size <= 500 + 1e-9, `zoom ${zoom}`);
  }
});
