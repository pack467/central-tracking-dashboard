import { paths } from "@/app/lib/routes";
export interface ErrorAction {
  label: string;
  /** Navigate to a fixed URL */
  href?: string;
  /** Retry: calls reset() when provided, otherwise reloads the page */
  isReset?: boolean;
  /** Go back to the previous page (falls back to "/" when there is no history) */
  isBack?: boolean;
}

export interface ErrorDetails {
  title: string;
  description: string;
  primaryAction: ErrorAction;
  badge?: string;
}

const retry: ErrorAction = { label: "Coba Lagi", isReset: true };
const back: ErrorAction = { label: "Kembali", isBack: true };

export const errorContent: Record<string, ErrorDetails> = {
  "400": {
    title: "Permintaan tidak valid",
    description: "Permintaan yang dikirim tidak dapat diproses oleh sistem.",
    primaryAction: back,
    badge: "Bad Request",
  },
  "401": {
    title: "Sesi telah berakhir",
    description: "Silakan masuk kembali untuk melanjutkan akses dashboard.",
    primaryAction: { label: "Masuk Kembali", href: paths.login },
    badge: "Unauthorized",
  },
  "403": {
    title: "Akses ditolak",
    description: "Anda tidak memiliki izin untuk mengakses halaman ini.",
    primaryAction: back,
    badge: "Forbidden",
  },
  "404": {
    title: "Halaman tidak ditemukan",
    description: "Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.",
    primaryAction: back,
    badge: "Not Found",
  },
  "429": {
    title: "Terlalu banyak permintaan",
    description: "Batas frekuensi permintaan terlampaui, coba lagi beberapa saat lagi.",
    primaryAction: retry,
    badge: "Rate Limit Exceeded",
  },
  "500": {
    title: "Terjadi kesalahan sistem",
    description: "Sistem mengalami kendala saat memproses permintaan Anda.",
    primaryAction: retry,
    badge: "Internal Server Error",
  },
  "502": {
    title: "Gangguan gerbang server",
    description: "Layanan perantara gagal menerima respon valid dari server utama.",
    primaryAction: retry,
    badge: "Bad Gateway",
  },
  "503": {
    title: "Sedang dalam pemeliharaan",
    description: "Sistem sedang dalam pemeliharaan terjadwal, silakan coba beberapa saat lagi.",
    primaryAction: retry,
    badge: "Service Unavailable",
  },
  "504": {
    title: "Waktu respon server habis",
    description: "Server hulu membutuhkan waktu terlalu lama untuk memberikan respon.",
    primaryAction: retry,
    badge: "Gateway Timeout",
  },
  "offline": {
    title: "Tidak ada koneksi",
    description: "Periksa koneksi internet Anda lalu coba muat ulang halaman.",
    primaryAction: { label: "Muat Ulang", isReset: true },
    badge: "Offline Mode",
  },
};

export function getErrorContent(code?: string): ErrorDetails & { code: string } {
  const normalized = (code || "500").toLowerCase().trim();

  if (errorContent[normalized]) {
    return {
      ...errorContent[normalized],
      code: normalized,
    };
  }

  // Fallback untuk kode yang tidak terdaftar
  return {
    code: normalized,
    title: "Terjadi kesalahan",
    description: "Sistem mendeteksi kendala pada halaman yang diminta.",
    primaryAction: back,
    badge: `HTTP ${normalized}`,
  };
}
