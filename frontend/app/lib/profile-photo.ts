/**
 * The profile photo: cropping it and keeping it. The backend has no way to upload a picture (photo_url only takes a web address, and changing it
 * needs users.manage), so the photo is kept in this browser, per account. Moving it to a server later only changes the read, save and remove below.
 */
export const PHOTO_ACCEPT = "image/png,image/jpeg,image/webp";
export const PHOTO_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const PHOTO_MAX_ZOOM = 3;
/** Twice the largest place it is shown (the 104 px avatar on the profile page) plus margin, so it stays sharp on high-density screens. */
const PHOTO_OUTPUT_PX = 256;
const PHOTO_MAX_LENGTH = 300_000;
const STORED_PHOTO = /^data:image\/(webp|jpeg|png);base64,[a-z0-9+/=]+$/i;

export interface CropOffset { x: number; y: number }

/** Why this file cannot be used, or null when it can. SVG is not accepted: it can carry scripts. */
export function photoFileProblem(file: Pick<File, "type" | "size">): string | null {
  if (!PHOTO_ACCEPT.split(",").includes(file.type)) return "Pilih gambar PNG, JPG, atau WebP.";
  if (file.size > PHOTO_MAX_FILE_BYTES) return "Ukuran gambar maksimal 5 MB.";
  return null;
}

/** At zoom 1 the image just covers the square frame, so no empty part can show. */
export const coverScale = (width: number, height: number, frame: number) => frame / Math.min(width, height);

/** Keeps the image over the whole frame: it can move only as far as it is larger than the frame. */
export function clampOffset(offset: CropOffset, width: number, height: number, frame: number, zoom: number): CropOffset {
  const scale = coverScale(width, height, frame) * zoom;
  const limitX = Math.max(0, (width * scale - frame) / 2), limitY = Math.max(0, (height * scale - frame) / 2);
  // "+ 0" turns the -0 of a side with no room to move into a plain 0
  return { x: Math.min(limitX, Math.max(-limitX, offset.x)) + 0, y: Math.min(limitY, Math.max(-limitY, offset.y)) + 0 };
}

/** The square of the original image that the frame shows, in the image's own pixels. */
export function cropRect(width: number, height: number, frame: number, zoom: number, offset: CropOffset) {
  const scale = coverScale(width, height, frame) * zoom;
  const size = frame / scale;
  return { sx: (width - size) / 2 - offset.x / scale, sy: (height - size) / 2 - offset.y / scale, size };
}

/** The cropped square as a small image, the only thing kept: never the original file. */
export function renderCrop(image: HTMLImageElement, rect: ReturnType<typeof cropRect>): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PHOTO_OUTPUT_PX;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser ini tidak dapat memproses gambar.");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, rect.sx, rect.sy, rect.size, rect.size, 0, 0, PHOTO_OUTPUT_PX, PHOTO_OUTPUT_PX);
  const webp = canvas.toDataURL("image/webp", 0.88);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.88);
}

const storageKey = (userId: string) => `ctd.profilePhoto.v1:${userId}`;
const CHANGED = "ctd-profile-photo-changed";

/** Only an image this code made goes into an <img>: what is in storage can be edited by hand. */
export const isStoredPhoto = (value: unknown): value is string => typeof value === "string" && value.length <= PHOTO_MAX_LENGTH && STORED_PHOTO.test(value);

export function readProfilePhoto(userId: string | null | undefined): string | null {
  if (!userId) return null;
  try {
    const stored = localStorage.getItem(storageKey(userId));
    return isStoredPhoto(stored) ? stored : null;
  } catch { return null; }
}

export function saveProfilePhoto(userId: string, photo: string): void {
  if (!isStoredPhoto(photo)) throw new Error("Gambar terlalu besar untuk disimpan. Coba gambar lain.");
  try {
    localStorage.setItem(storageKey(userId), photo);
  } catch {
    throw new Error("Foto tidak dapat disimpan di browser ini. Penyimpanan browser mungkin penuh atau diblokir.");
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function removeProfilePhoto(userId: string): void {
  try { localStorage.removeItem(storageKey(userId)); } catch { /* nothing kept that could be removed */ }
  window.dispatchEvent(new Event(CHANGED));
}

/** Told when the photo changes here or in another tab. */
export function subscribeProfilePhoto(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(CHANGED, listener); window.removeEventListener("storage", listener); };
}
