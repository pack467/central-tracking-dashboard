/**
 * What a new password must be, checked before sending. PATCH /auth/password itself only asks for 8 characters and at most 72 bytes (bcrypt reads only the
 * first 72, so a longer one would be cut silently); capital, small, number and symbol are this form's own rule, the backend does not enforce them.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX_BYTES = 72;

const bytesOf = (text: string) => new TextEncoder().encode(text).length;

export interface PasswordCheck { key: "length" | "maximum" | "upper" | "lower" | "number" | "symbol" | "different" | "match"; label: string; ok: boolean }

export function passwordChecks(current: string, next: string, confirmation: string): PasswordCheck[] {
  return [
    { key: "length", label: `Minimal ${PASSWORD_MIN} karakter`, ok: next.length >= PASSWORD_MIN },
    { key: "maximum", label: `Maksimal ${PASSWORD_MAX_BYTES} karakter`, ok: bytesOf(next) <= PASSWORD_MAX_BYTES },
    { key: "upper", label: "Huruf kapital (A–Z)", ok: /\p{Lu}/u.test(next) },
    { key: "lower", label: "Huruf kecil (a–z)", ok: /\p{Ll}/u.test(next) },
    { key: "number", label: "Angka (0–9)", ok: /\p{N}/u.test(next) },
    { key: "symbol", label: "Simbol (!@#$…)", ok: /[^\p{L}\p{N}\s]/u.test(next) },
    { key: "different", label: "Beda dari password lama", ok: next.length > 0 && next !== current },
    { key: "match", label: "Konfirmasi sama", ok: next.length > 0 && next === confirmation },
  ];
}

/** Advice only: the server decides what it accepts. */
export function passwordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { level: 0, label: "" };
  if (password.length < PASSWORD_MIN) return { level: 1, label: "Terlalu pendek" };
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(kind => kind.test(password)).length;
  const repeats = new Set(password).size <= 2;
  if (repeats || kinds < 2) return { level: 1, label: "Lemah" };
  if (password.length >= 12 && kinds >= 3) return { level: 3, label: "Kuat" };
  return { level: 2, label: "Cukup" };
}
