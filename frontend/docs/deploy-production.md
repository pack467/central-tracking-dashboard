# Menjalankan frontend di production

Panduan ini untuk siapa pun yang menyiapkan server atau pipeline. Frontend dan backend adalah dua aplikasi terpisah: masing-masing di-install, di-build, dan dijalankan sendiri.

## Langkah

```bash
cd frontend
npm ci
CTD_DEPLOY_ENV=production npm run build   # isi env di bawah sebelum build
npm prune --omit=dev                      # opsional: buang paket yang hanya dipakai saat build
npm run start -- -p 3000
```

Butuh Node 22.13 atau lebih baru. Tanpa `-p`, server memakai port bawaan vinext.

## Environment

Nilai `NEXT_PUBLIC_*` ditanam ke JavaScript saat **build**, jadi harus sudah benar sebelum build. Kalau berubah, build ulang.

| Nama | Kapan | Isi |
|---|---|---|
| `CTD_DEPLOY_ENV` | build | `production`. Mengaktifkan pemeriksaan ketat: build berhenti kalau env salah atau ada data yang tidak boleh publik di bundle. |
| `NEXT_PUBLIC_SITE_URL` | build | Alamat `https://` yang dibuka pengguna. |
| `NEXT_PUBLIC_API_URL` | build | Alamat `https://` backend, tanpa `/` di akhir. |
| `NEXT_PUBLIC_USE_MOCK` | build | `false`. |
| `HANDOVER_DB_PATH` | jalan | File SQLite catatan handover, di disk yang tetap ada setelah deploy. Lihat di bawah. |
| `HANDOVER_BACKEND_URL` | jalan | Alamat internal backend untuk server ini, kalau berbeda dari `NEXT_PUBLIC_API_URL`. |
| `AUTH_COOKIE_GUARD` | jalan | `true` kalau API satu host dengan frontend. Pengunjung tanpa sesi langsung dialihkan ke `/login`. |
| `TRUST_FORWARDED_HEADERS` | jalan | `true` hanya kalau ada reverse proxy di depan aplikasi. |

Saat build, `.env.local` dibaca lebih dulu kalau filenya ada. Jangan bawa file itu ke server build: akun uji di dalamnya akan menghentikan build production.

## Syarat di sisi server

- **Satu situs dengan backend.** Cookie sesi `ctd.sid` harus sampai ke frontend agar Handover mengenali pengguna. Paling mudah satu host, misalnya `https://ctd.perusahaan.id/api` diteruskan ke backend. Kalau tidak, API handover selalu menjawab 401.
- **`CORS_ORIGIN` di backend** harus memuat alamat frontend, kecuali API satu host.
- **HTTPS** di kedua sisi.

## Catatan handover

Backend belum punya endpoint handover, jadi catatannya disimpan oleh frontend sendiri:

- **`npm run start` di Node:** satu file SQLite di `HANDOVER_DB_PATH`. Tanpa nilai ini file dibuat di `.data/handover.sqlite` dalam folder aplikasi dan server menulis peringatan, karena deploy yang mengganti folder itu akan menghapus isinya.
- **Hanya satu instance.** File SQLite tidak dibagi antar server. Kalau butuh lebih dari satu instance, catatan handover harus pindah ke backend.
- **Cadangkan file itu.** Isinya tidak ikut database backend. Salin juga file `-wal` dan `-shm` di sebelahnya, atau hentikan aplikasi dulu.

## Deploy ke Cloudflare Workers

Build bawaan ditujukan untuk Node. Build untuk Workers tidak bisa dijalankan dengan `npm run start`, dan sebaliknya.

```bash
CTD_TARGET=cloudflare CTD_DEPLOY_ENV=production npm run build
```

Catatan handover lalu memakai binding D1 `DB`. `database_id` di `wrangler.local.json` masih placeholder, jadi database D1 harus dibuat dulu. Jalur ini baru diuji sampai tahap build, belum pernah di-deploy ke Cloudflare.

## Tautan monitoring

Build production biasa tidak memuat katalog tautan contoh, karena nama host jaringan klien tidak boleh ikut file publik. Modal tautan hanya menampilkan URL dari sistem di Master Data; kalau tidak ada, tertulis "Belum ada link monitoring untuk proyek ini".

## Sebelum rilis

```bash
npm run typecheck
npm run lint
npm run test:all    # build, lalu semua test; server dijalankan otomatis untuk test yang butuh halaman
```

`npm audit` masih melaporkan temuan moderate lewat `drizzle-kit`, `typescript-eslint`, dan `@vercel/og` (bawaan vinext). Saran `npm audit fix --force` berupa downgrade dan tidak perlu diikuti.
