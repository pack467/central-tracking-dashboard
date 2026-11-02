# Login di frontend (Fase 2)

Frontend punya dua mode, dipilih lewat `NEXT_PUBLIC_USE_MOCK` di `.env.local`:

| Mode | Setelan | Cara login | Di mana sesi disimpan |
| --- | --- | --- | --- |
| **Backend** | `NEXT_PUBLIC_USE_MOCK=false` | `POST /auth/login` ke backend | Cookie `ctd.sid` (httpOnly) milik backend. Frontend tidak menyimpan token, sandi, atau data pengguna di browser. |
| **Demo** | default (`true`) | Akun demo bawaan, hanya saat development atau `NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true` | `localStorage`/`sessionStorage`. Bukan batas keamanan: datanya lokal dan bisa diubah di browser. |

## Mode backend
- `NEXT_PUBLIC_API_URL` = alamat backend **tanpa** `/api/v1` (backend tidak memakai prefix): mis. `http://localhost:3001`.
- Frontend dan backend harus satu *site* (mis. sama-sama `localhost`, atau `app.contoh.id` + `api.contoh.id`) karena cookie sesi `SameSite=Lax`.
- Di backend, `CORS_ORIGIN` harus memuat origin frontend (mis. `http://localhost:3000`). Backend sudah menolak penulisan dari origin lain.
- Alur: login -> `POST /auth/login` -> cookie + `csrf_token`. Saat halaman dimuat ulang, pengguna dipulihkan dari `GET /auth/me`, lalu token CSRF dari `GET /auth/csrf`. Setiap `POST/PATCH/PUT/DELETE` lewat `ApiClient` membawa `X-CSRF-Token`. Jawaban 401 dari panggilan apa pun mengeluarkan pengguna dan mengarahkannya ke `/login`. Logout memanggil `POST /auth/logout`.
- Peran dari server: `SUPER_ADMIN` -> Super Admin, `ADMIN` -> Admin, `TEAM_LEAD` -> Shift Lead, `AGENT` -> Operator NOC, `VIEWER` -> Viewer. Izin ada di `user.permissions` (`useAuth().hasPermission(key)`) hanya untuk menyembunyikan tombol; server memeriksa setiap izin.
- Batas percobaan login (5 per menit per IP) ditegakkan backend; form juga menahan 30 detik setelah 5 kegagalan.

## Penjaga rute di server (opsional)
`AUTH_COOKIE_GUARD=true` (env server, bukan `NEXT_PUBLIC`): halaman aplikasi tanpa cookie `ctd.sid` dialihkan ke `/login` sebelum dirender. Aktifkan hanya bila cookie sampai ke server frontend (host yang sama dengan API, atau domain induk bersama). `/login`, `/team`, `/about`, `/offline`, `/error` tetap terbuka. Backend tetap memeriksa sesi pada setiap panggilan API.

## Fase 3: header keamanan dan API handover
**Header (`frontend/next.config.ts`, semua respons)**: `X-Frame-Options: DENY` dan `frame-ancestors 'none'` (halaman tidak bisa dibingkai situs lain), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`. Khusus produksi: `Content-Security-Policy` dan `Strict-Transport-Security`. Dev server tidak memakai CSP/HSTS (butuh eval dan websocket untuk hot reload). Perubahan `next.config.ts` baru terbaca setelah dev server di-restart.
- CSP: sumber hanya dari situs ini, Google Fonts, data/blob untuk gambar, dan backend dari `NEXT_PUBLIC_API_URL` untuk koneksi. `script-src`/`style-src` masih memakai `'unsafe-inline'` karena kerangka kerja menulis skrip bootstrap inline; CSP berbasis nonce adalah langkah berikutnya.
- Bila API backend berada di origin lain, `NEXT_PUBLIC_API_URL` sudah otomatis masuk `connect-src` (dibaca saat build/start).

**API handover (`app/lib/handover-auth.ts`)** tidak lagi memercayai apa pun yang bisa diketik pengunjung:
| Env (server) | Arti |
| --- | --- |
| `HANDOVER_TRUST_OAI_HEADERS=true` | Percayai header `oai-authenticated-user-*`. **Wajib diaktifkan bila aplikasi di-host di platform yang menyuntikkan header itu (mis. hosting dengan `.openai/hosting.json` + D1)**; tanpa ini API handover menjawab 401. Aktifkan hanya bila proxy di depan menimpa header tersebut dari klien. |
| `HANDOVER_SIMULATED_ACTOR=true` | Operator bawaan ("local-operator") untuk demo. Selain itu hanya aktif saat `NODE_ENV=development`. Tidak lagi ditentukan oleh nama host (`localhost`, `ngrok`). |
| `HANDOVER_ALLOWED_ORIGINS` | Daftar origin tambahan (dipisah koma) yang boleh menulis. |
| `TRUST_FORWARDED_HEADERS=true` | Percayai `X-Forwarded-Host/Proto` di belakang reverse proxy. |
Penulisan harus berasal dari situs ini: `Origin` dibandingkan persis (bukan `includes`), `Origin: null` ditolak, dan permintaan yang dinyatakan browser sebagai lintas-situs (`Sec-Fetch-Site`) ditolak. Permintaan tanpa header browser sama sekali (curl, skrip) lolos karena tidak membawa kredensial ambien.

**Lainnya**: `chatgpt-auth.ts` (tidak dipakai) dihapus. Host di metadata `<head>` divalidasi (hanya `host[:port]` dan http/https) sehingga header `Host`/`X-Forwarded-Host` palsu tidak mengubah tautan OG.

## Build untuk production
- Semua `NEXT_PUBLIC_*` ditanam saat build. Satu build untuk satu lingkungan; mengganti alamat API berarti build ulang.
- Pipeline yang membuat build untuk pengguna harus mengisi `CTD_DEPLOY_ENV=production`. Dengan itu `npm run build` (hook `prebuild`, `frontend/scripts/check-production-env.mjs`) **gagal** kalau: login demo menyala, `HANDOVER_SIMULATED_ACTOR=true`, tidak ada login lewat backend, `NEXT_PUBLIC_API_URL` kosong atau bukan `https://`, atau akun uji `NEXT_PUBLIC_LOCAL_TEST_*` terisi. Tanpa `CTD_DEPLOY_ENV`, hal yang sama hanya jadi peringatan.
- Build biasa tidak memuat akun demo sama sekali (`password123` tidak ada di bundel). Hanya build dengan `NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true` yang memuatnya.
- Sesi hanya berupa cookie. Frontend dan API harus satu situs (mis. `app.contoh.id` dan `api.contoh.id`, atau satu host dengan jalur `/api`). Kalau browser tidak menyimpan cookie, login menampilkan pesan "browser tidak menyimpan sesinya" dan tidak masuk.
- CSP dibuat per permintaan di `proxy.ts` dengan nonce (`script-src 'self' 'nonce-...'`, tanpa `'unsafe-inline'`). `NEXT_PUBLIC_SITE_URL=https://...` menyalakan HSTS dan `upgrade-insecure-requests` serta mengalihkan kunjungan HTTP ke alamat itu; tanpa itu keduanya tidak dikirim supaya akses lewat IP atau HTTP internal tidak rusak.
- `npm run build` memindai `dist/client` (`scripts/check-bundle.mjs`, hook `postbuild`) mencari sandi demo, host internal, email perusahaan, nomor telepon yang tampak asli, dan IP privat; dengan `CTD_DEPLOY_ENV=production` temuan menghentikan build.
- Logout atau sesi berakhir di satu tab diteruskan ke tab lain lewat `BroadcastChannel`.
- Data tiket dan personel milik satu pengguna: saat logout, sesi berakhir (401), atau akun berganti, salinan di memori dan `sessionStorage` dibuang.

## Yang belum
- Halaman lain (tiket, master data, dst.) memakai backend sesuai `NEXT_PUBLIC_API_MODULES` (lihat `docs/backend-connection-status.md`); sisanya masih data mock dan diberi catatan "belum tersambung".
- CSP berbasis nonce (menghapus `'unsafe-inline'` dari `script-src`).
- API handover memakai identitas dari platform hosting, bukan sesi backend (`/auth/*`); menyatukannya menunggu endpoint handover di backend.
