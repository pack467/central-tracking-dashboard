/** The short bio on the profile page. The backend's user has no field for it, so it is kept in this browser, per account, like the photo (lib/profile-photo.ts). */
export const BIO_MAX = 300;

const storageKey = (userId: string) => `ctd.profileBio.v1:${userId}`;
const CHANGED = "ctd-profile-bio-changed";

/** At most one empty line in a row, nothing around it, never over the limit. */
export const normalizeBio = (text: string) => text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, BIO_MAX).trimEnd();

export function readProfileBio(userId: string | null | undefined): string {
  if (!userId) return "";
  try { return normalizeBio(localStorage.getItem(storageKey(userId)) ?? ""); } catch { return ""; }
}

/** An empty bio is no bio: nothing stays behind. */
export function saveProfileBio(userId: string, text: string): void {
  const bio = normalizeBio(text);
  try {
    if (bio) localStorage.setItem(storageKey(userId), bio);
    else localStorage.removeItem(storageKey(userId));
  } catch {
    throw new Error("Bio tidak dapat disimpan di browser ini. Penyimpanan browser mungkin penuh atau diblokir.");
  }
  window.dispatchEvent(new Event(CHANGED));
}

/** Told when the bio changes here or in another tab. */
export function subscribeProfileBio(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(CHANGED, listener); window.removeEventListener("storage", listener); };
}
