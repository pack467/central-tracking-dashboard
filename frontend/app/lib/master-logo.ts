/** Turns an uploaded image into the small data URL stored as the logo of an Organisasi, Proyek or Sistem. */
import { MASTER_LOGO_MAX_LENGTH } from "./master-data-model";

export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";
export const LOGO_MAX_FILE_BYTES = 2 * 1024 * 1024;
/** Twice the largest tile (52 px) plus margin, so a logo stays sharp on high-density screens. */
const LOGO_PX = 128;

interface Decoded { source: CanvasImageSource; width: number; height: number; release: () => void }

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file), image = new Image();
  try {
    image.src = url;
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

/** Rejects files that are not PNG/JPEG/WebP or larger than 2 MB, then shrinks the image to fit 128 x 128 keeping its proportions. */
export async function readLogo(file: File): Promise<string> {
  if (!LOGO_ACCEPT.split(",").includes(file.type)) throw new Error("Pilih gambar PNG, JPG, atau WebP.");
  if (file.size > LOGO_MAX_FILE_BYTES) throw new Error("Ukuran gambar maksimal 2 MB.");
  let image: Decoded;
  try {
    image = await decode(file);
  } catch {
    throw new Error("Gambar tidak dapat dibaca. Pastikan file tidak rusak.");
  }
  try {
    if (!image.width || !image.height) throw new Error("Gambar tidak dapat dibaca. Pastikan file tidak rusak.");
    const scale = Math.min(1, LOGO_PX / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Browser ini tidak dapat memproses gambar.");
    context.imageSmoothingQuality = "high";
    context.drawImage(image.source, 0, 0, canvas.width, canvas.height);
    // WebP keeps transparency and stays small; a browser without a WebP encoder returns PNG instead.
    const webp = canvas.toDataURL("image/webp", 0.9);
    const result = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
    if (result.length > MASTER_LOGO_MAX_LENGTH) throw new Error("Gambar terlalu besar untuk disimpan. Coba gambar yang lebih sederhana.");
    return result;
  } finally {
    image.release();
  }
}
