/**
 * Addresses that come from data (a profile link, a contact) reach an `href` only through these. React already refuses `javascript:` in an
 * href, but `data:`, `file:`, `vbscript:` and look-alikes are not its job, and a link someone else typed is opened by other people.
 */
const MAX_LENGTH = 2048;

/** Line breaks and other control characters can split a header or hide part of an address. */
function hasControlCharacter(text: string): boolean {
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** An http(s) address that may be opened in a new tab, as a normalised string, or undefined. No scheme-less text, no embedded login. */
export function safeExternalUrl(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  if (!text || text.length > MAX_LENGTH || /\s/.test(text) || hasControlCharacter(text)) return undefined;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (!url.hostname || url.username || url.password) return undefined;
    return url.href;
  } catch { return undefined; }
}

/** `mailto:` for a plain email address, or undefined. Rejects anything that could carry extra headers (cc, bcc, subject, body). */
export function safeMailto(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  if (!text || text.length > 254 || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(text)) return undefined;
  return `mailto:${text}`;
}
