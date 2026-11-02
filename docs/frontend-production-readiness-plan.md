# Rencana kesiapan production: frontend

Audit 30 Oktober 2026, hanya membaca kode dan hasil build. Belum ada yang diubah. Backend dan database tidak disentuh.

Status yang dipakai di dokumen ini:
- **P0**: harus beres sebelum production. Kalau dibiarkan bisa bocor data, atau aplikasi tampak jalan padahal datanya salah atau hilang.
- **P1**: konfigurasi deploy. Kalau salah, aplikasi error total di production.
- **P2**: ketepatan data dan kerapian. Perlu sebelum merge ke `main`.

Kolom "Siapa": **FE** = dikerjakan di frontend, **BE** = backend developer, **DO** = devops.

## Ringkasan

| # | Masalah | Prioritas | Siapa |
| --- | --- | --- | --- |
| 1 | Kata sandi Runbooks tertanam di JavaScript publik dan disimpan polos di `localStorage` | P0 | FE, DO, BE |
| 2 | Ubah tiket di mode hybrid hanya tersimpan di memori, lalu hilang | P0 | FE |
| 3 | Halaman yang belum tersambung menyimpan data per browser, tidak dibagi antar operator | P0 | FE |
| 4 | Build tanpa env yang benar diam-diam jadi mode mock, atau login demo ikut aktif | P0 | FE |
| 5 | Memuat semua tiket (37 permintaan per user) akan kena batas 100 permintaan/menit | P0 | FE, BE, DO |
| 6 | Data tiket tidak pernah diperbarui otomatis | P0 | FE |
| 7 | Cache data tidak dibersihkan saat sesi habis (hanya saat logout) | P0 | FE |
| 8 | Cookie `SameSite=Lax`: frontend dan API beda site membuat login berputar-putar | P1 | DO, FE |
| 9 | CSP `connect-src` diambil dari URL API saat build | P1 | FE, DO |
| 10 | Handover: database D1 belum dikonfigurasi dan tidak mengenali user backend | P1 | FE, BE, DO |
| 11 | `AUTH_COOKIE_GUARD` hanya jalan kalau API satu host dengan frontend | P1 | DO |
| 12 | Modul akun demo (password, nama, email staf) ikut terkirim di build production | P1 | FE |
| 13 | Gagal memuat Personel tidak ditampilkan dan tidak dicoba ulang | P2 | FE |
| 14 | Asumsi pemetaan data (klien "tritronik", severity default, shift) | P2 | FE, BE |
| 15 | Cache tiket di `sessionStorage` (~2,3 MB) akan melewati kuota | P2 | FE |
| 16 | Lint: 1 error baru di `auth.tsx`, sekitar 166 error lama di seluruh proyek | P2 | FE |

## Status pengerjaan (30 Oktober 2026)

**Pembaruan:** Runbooks (halaman, kode, data) kemudian dihapus seluruhnya, jadi butir 1 sudah tuntas di sisi kode dan butir 3 tidak lagi memuat Runbooks. Yang tersisa dari butir 1 hanya tugas DO (ganti sandi lama). Status temuan putaran berikutnya ada di `docs/frontend-audit-2-plan.md`.

Dikerjakan di frontend saja. Backend dan database tidak disentuh. Belum di-commit.

| # | Status | Yang dikerjakan | Yang masih tersisa |
| --- | --- | --- | --- |
| 1 | Selesai di frontend | Semua `password` dihapus dari `runbooksData.ts`; kredensial tidak lagi disimpan di `localStorage` (kunci lama dibersihkan saat dibuka); kartu menampilkan "kata sandi tidak disimpan di aplikasi" | **DO: ganti sandi yang pernah ada di file itu** (masih ada di riwayat git). BE: endpoint "reveal" kalau memang diperlukan |
| 2 | Selesai | Di mode backend tiket read-only: tombol Tiket Baru (header dan melayang), Ctrl+N, Edit, Eskalasi, Close hilang, drawer memberi tahu alasannya. Mode mock tidak berubah | Sambungkan penulisan setelah BE menyediakan `GET /projects` |
| 3 | Sebagian | Catatan "belum tersambung ke backend, hanya tersimpan di browser ini" di Runbooks, Monitoring, Shift Log, Master Data (dengan keterangan Personel dan Peran sudah tersambung). Tidak tampil di halaman yang tersambung maupun di mode mock penuh | Menyembunyikan halaman tertentu atau menyambungkannya: keputusan tim |
| 4 | Selesai | `npm run build` menjalankan `scripts/check-production-env.mjs`. Dengan `CTD_DEPLOY_ENV=production` build gagal untuk: demo login, `HANDOVER_SIMULATED_ACTOR`, tanpa login backend, API URL kosong atau bukan https, akun uji. Nama modul salah selalu gagal | **DO: isi `CTD_DEPLOY_ENV=production` di pipeline build production** |
| 5 | Sebagian | Percobaan ulang 429 memakai `Retry-After` (kalau terbaca) ditambah jeda acak; 4 halaman paralel; cache per pengguna di `sessionStorage` (muat ulang tidak menghabiskan 37 permintaan lagi, terbukti di uji) | Paging dan filter dari server, ringkasan dari `/tickets/summary`, rentang tanggal untuk Dashboard dan Reports: refactor besar tampilan, dan butuh endpoint agregat dari BE. **BE: `Access-Control-Expose-Headers: Retry-After`**, throttle per pengguna |
| 6 | Selesai | Tiap 60 detik (tab terlihat) dan saat tab kembali: 1 permintaan `sort=updated_at` (100 tiket terbaru berubah) digabung ke daftar. Tombol Segarkan di top bar melakukan hal yang sama | Perubahan lebih dari 100 tiket per menit dan tiket yang dihapus tidak terdeteksi sampai muat penuh |
| 7 | Selesai | `bindSessionData`: cache tiket dan personel terikat pada id pengguna dan dibuang saat logout, 401, atau akun berganti, juga saat aplikasi dibuka tanpa sesi | |
| 8 | Sebagian | Login memeriksa sekali bahwa cookie benar-benar kembali; kalau tidak, pesan "browser tidak menyimpan sesinya" (diuji) | **DO: satu situs untuk frontend dan API, HTTPS, `CORS_ORIGIN`** |
| 9 | Ditangani lewat #4 | URL API wajib diisi dan https pada build production | DO: build ulang saat alamat API berubah |
| 10 | Belum | | Keputusan: Handover pindah ke backend atau tetap D1 (DO membuat D1 dan binding) |
| 11 | Belum (DO) | Sudah ada di `docs/frontend-auth.md` | DO: aktifkan guard hanya kalau API satu host |
| 12 | Selesai | Build biasa tidak memuat akun demo (`password123` tidak ada di bundel, chunk `demo-accounts` tidak ada); build dengan `NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true` tetap memuatnya (diuji dua-duanya). Nilai variabel itu ditanam lewat `define` di `vite.config.ts` | Nama staf di data mock besar (`data.ts`) masih ada |
| 13 | Selesai | Gagal memuat Personel: pesan error, 3 kali coba ulang (5, 15, 45 detik), tidak ada pesan palsu saat belum login (401) | Tombol "Coba lagi" manual |
| 14 | Sebagian | Shift tiket memakai definisi tunggal `lib/shifts.ts` | `clientId` berdasarkan id klien dan severity kosong: butuh `GET /clients` dan keputusan tampilan |
| 15 | Tetap | Cache berfungsi di 3.649 tiket (diuji) | Akan melewati kuota di sekitar ribuan tiket lagi; selesai dengan #5 |
| 16 | Selesai | Error lint di `auth.tsx` diperbaiki. File yang disentuh: 0 error eslint. Tiga error lain di file yang sama sudah ada di HEAD | Sekitar 166 error lama di proyek |

Pengujian: `verify-backend-connected.cjs` terhadap backend asli (32 pemeriksaan lolos), `verify-cookie-guard.cjs`, `verify-mock-unchanged.cjs`, `verify-security.cjs` (22), tabel Master Data, kategori (31), tes unit (`backend-connect` 9, `production-env` 5, `proxy-guard`, `handover-auth`, dan lainnya), `tsc` bersih.

Yang sudah dicek dan aman:
- `npm audit --omit=dev`: 0 kerentanan.
- Tidak ada source map di `dist`.
- Sandi akun uji `.env.local` tidak ikut ke `dist`.
- `innerHTML` di Memo diisi dari `docToHtml` yang meng-escape semua teks.
- Tidak ada `eval` atau `dangerouslySetInnerHTML`.
- Security headers (CSP, HSTS, `frame-ancestors 'none'`) aktif.
- Halaman `error.tsx`, `global-error.tsx` dan `not-found.tsx` ada.

---

## P0

### 1. Kata sandi Runbooks ada di kode klien
**Temuan.** `app/lib/runbooksData.ts` (sekitar baris 290–330) berisi entri kredensial lengkap dengan field `password`, contohnya "Grafana Dashboard (Produksi)" di `grafana.internal.tritronik.com`. `RunbooksView.tsx:76` lalu menyimpan daftar itu polos di `localStorage` (`ctd.runbooks.creds`).

**Dampak di production.** File JavaScript di `/_next/static` bisa diunduh siapa saja tanpa login, karena guard login tidak melindungi file statis. Sandi apa pun di sana praktis publik. Selain itu, siapa pun yang memakai komputer operator bisa membacanya dari `localStorage`.

**Rencana.**
1. **DO**: pastikan apakah sandi di file itu asli. Kalau ya, **ganti (rotate) sekarang**, karena sandi itu sudah ada di riwayat git.
2. **FE**: hapus semua nilai `password` dari `runbooksData.ts`. Halaman Runbooks cukup menampilkan label, URL, username dan catatan.
3. **FE**: hentikan penyimpanan kredensial di `localStorage`. Bersihkan kunci `ctd.runbooks.creds` lama saat aplikasi dibuka.
4. **BE**: kalau sandi memang perlu ditampilkan, buat endpoint "reveal" yang butuh izin khusus dan tercatat di log audit, atau arahkan ke password manager tim. Frontend tidak menyimpannya sama sekali.

**Verifikasi.** `grep -r "password" dist/client` tidak menemukan nilai kredensial. Tes unit memastikan data seed tidak punya field `password`.

### 2. Ubah tiket di mode hybrid tidak tersimpan
**Temuan.** Dengan `NEXT_PUBLIC_API_MODULES=...,tickets`, tombol Tiket Baru, Ubah dan ganti status tetap aktif. Hasilnya hanya ada di memori (`useBackendTickets`) dan hilang saat halaman dimuat ulang. Peringatan toast hanya muncul sekali.

**Dampak.** Operator mengira tiket sudah dibuat atau ditutup, padahal tidak ada di backend. Untuk NOC ini berbahaya.

**Rencana (FE).**
- Selama penulisan tiket belum tersambung, buat Tickets **read-only** di mode backend:
  - Sembunyikan atau nonaktifkan Tiket Baru, Ubah, ganti status dan hapus.
  - Beri keterangan "Perubahan tiket belum tersedia".
  - Caranya: satu fungsi `ticketWritesEnabled()` di `backend-tickets.ts`, dipakai oleh `TicketsView`, `TicketDetailDrawer`, `TicketCreateModal`, menu konteks dan Dashboard.
- Setelah backend punya `GET /projects` (lihat `backend-connection-status.md`), sambungkan `POST/PATCH /tickets` dan hapus pembatasan ini.

**Verifikasi.** Skrip e2e: di mode backend tidak ada tombol tulis, dan di mode mock tombolnya tetap ada.

### 3. Data per browser di halaman yang belum tersambung
**Temuan.** Halaman-halaman ini menyimpan datanya di `localStorage`:
- Master Data (`ctd.masterData.v2`) selain Personel dan Peran
- Runbooks (`ctd.runbooks.*`)
- Memo dan Notifikasi (`ctd.acknowledged`)
- Tiket di mode mock (`ctd.tickets.v*`)

**Dampak.** Di production setiap operator melihat data yang berbeda. Data hilang kalau cache browser dibersihkan atau operator ganti komputer. Aplikasinya terlihat normal, jadi masalah ini tidak langsung ketahuan.

**Rencana (FE).** Untuk build production, setiap modul punya satu dari tiga status:
- **Tersambung**: datanya dari backend.
- **Read-only**: data contoh dengan label "Data contoh".
- **Disembunyikan**: menu tidak tampil.

Status ini ditentukan dari `apiModuleEnabled()` di `lib/config.ts`. Buat satu daftar modul di satu tempat yang dibaca Sidebar dan halaman. Putuskan bersama tim modul mana yang boleh tampil sebagai data contoh.

**Verifikasi.** Build production dengan modul `auth,tickets,people,roles`: menu modul lain tersembunyi atau berlabel, dan tidak ada penulisan ke `localStorage` selain preferensi UI (sidebar, panel).

### 4. Build production dengan env salah tetap lolos
**Temuan.** `config.ts:27` memakai mock secara default kalau `NEXT_PUBLIC_USE_MOCK` tidak di-set. Semua `NEXT_PUBLIC_*` ditanam saat build, bukan saat dijalankan. Akibatnya:
- Build tanpa env akan menolak semua login dengan pesan "Login belum tersedia".
- Build dengan `NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true` membuka akun demo (`password123`) di production.
- Build dengan `NEXT_PUBLIC_API_URL` yang salah atau `http://` akan diblokir CSP dan aturan mixed content.

**Rencana (FE).** Tambahkan pemeriksaan sebelum build (`scripts/check-production-env.mjs`, dipanggil dari script `build`). Build **gagal** dengan pesan jelas kalau `NODE_ENV=production` dan salah satu kondisi ini terjadi:
- `NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true`
- tidak ada modul backend yang aktif (`USE_MOCK` bukan `false` dan `API_MODULES` kosong)
- `NEXT_PUBLIC_API_URL` kosong atau bukan `https://` (kecuali `localhost`)
- nama modul di `API_MODULES` tidak dikenal

Variabel yang dipakai untuk build tiap lingkungan (staging, production) didokumentasikan di `.env.example`. Ingat: satu build untuk satu lingkungan.

**Verifikasi.** Tes unit untuk pemeriksaan ini, ditambah percobaan build dengan env salah yang harus gagal.

### 5. Memuat semua tiket akan kena batas permintaan
**Temuan.** `backend-tickets.ts` memuat seluruh tiket: 3.649 tiket = 37 permintaan per user setiap kali cache kosong. Backend membatasi 100 permintaan per menit **per IP**.

**Dampak.**
- Di kantor, semua operator biasanya keluar lewat satu IP (NAT). Hal yang sama terjadi kalau ada reverse proxy tanpa `TRUST_PROXY`.
- Maka 3 operator yang login dalam menit yang sama sudah memicu `429`. Retry yang ada hanya menunda sampai sekitar 36 detik, lalu gagal.
- Saat tiket mencapai sekitar 10.000, satu kali muat saja sudah melebihi batas.

**Rencana.**
- **FE**: ganti "muat semua" dengan permintaan sesuai kebutuhan layar:
  - Halaman Tickets: paging, filter dan pencarian dikerjakan server (`page`, `limit`, `status`, `q`, `open_from`, `open_to`, `sort`) lewat `useTicketsQuery`. URL tetap menyimpan state.
  - Angka ringkasan: `GET /tickets/summary`.
  - Dashboard dan Notifikasi: hanya rentang waktu yang ditampilkan (misalnya hari ini dan 7 hari terakhir) lewat `open_from`.
  - Reports: rentang tanggal yang dipilih. Kalau rentangnya besar, butuh endpoint agregat dari BE.
  - Detail tiket: `GET /tickets/{id}`, bukan mencari di daftar.
  - Retry 429 memakai jeda acak (jitter) dan menghormati header `Retry-After` kalau ada.
- **BE**: endpoint agregat untuk Dashboard dan Reports, atau batas `limit` lebih besar untuk user yang login. Throttle per user, bukan per IP.
- **DO**: `TRUST_PROXY` di belakang proxy supaya IP asli user terbaca.

**Verifikasi.** E2e menghitung permintaan: membuka Dashboard, Tickets dan Reports berurutan tetap di bawah 15 permintaan. Tes beban dengan 10 sesi dari satu IP tanpa `429`.

### 6. Tiket tidak pernah diperbarui
**Temuan.** Tiket dimuat sekali per sesi (cache memori 30 detik dan `sessionStorage` 3 menit). Tidak ada polling dan tidak ada tombol muat ulang yang memanggil `reload()`.

**Dampak.** Tiket baru dari operator lain tidak muncul sampai halaman dimuat ulang. Untuk dashboard NOC, ini membuat data menyesatkan.

**Rencana (FE).**
- Setelah poin 5 selesai, perbarui data yang sedang tampil setiap 60 detik selama tab terlihat (`document.visibilityState`). Contohnya: halaman 1 dengan `sort=updated_at` (cek nilai `sort` yang diizinkan backend).
- Tampilkan "Diperbarui hh:mm" dan tombol muat ulang yang memanggil `reload()`.
- Hentikan polling saat tab tersembunyi.

### 7. Cache tidak dibersihkan saat sesi habis
**Temuan.** Saat backend menjawab `401` di tengah pemakaian, `auth.tsx:82` hanya menjalankan `setUser(null)`. Cache tiket (memori dan `sessionStorage`) serta cache Personel (`useBackendTeam`) tetap ada. Keduanya hanya dibersihkan lewat tombol logout (`auth.tsx:137-138`).

**Dampak.**
- Daftar tiket tetap tersimpan di tab setelah sesi berakhir.
- User berikutnya yang login di tab yang sama dalam 3 menit memakai data milik sesi sebelumnya.
- Hari ini datanya sama untuk semua user. Begitu backend menerapkan hak akses per user, ini jadi kebocoran data.

**Rencana (FE).**
- Pindahkan pembersihan cache ke satu fungsi `clearSessionData()`, dipanggil dari logout, dari `setOnUnauthorized`, dan saat id user berubah.
- Beri kunci cache berdasarkan id user.

**Verifikasi.** Tes: sesi habis membuat `sessionStorage` kosong, lalu login user lain memicu muat baru.

---

## P1: konfigurasi deploy

### 8. Cookie sesi lintas site
**Temuan.** Cookie `ctd.sid` memakai `SameSite=Lax`. Kalau frontend dan API ada di site berbeda, misalnya `ctd.vercel.app` dan `api.perusahaan.id`, cookie tidak ikut terkirim dari `fetch`. Login tampak berhasil, lalu `/auth/me` menjawab `401`, dan user kembali ke halaman login berulang kali.

**Rencana.**
- **DO, disarankan**: sajikan API di bawah host yang sama, misalnya `https://ctd.perusahaan.id/api` diteruskan ke NestJS. Cara ini sekaligus menyelesaikan CORS, CSP, poin 11 dan identitas Handover di poin 10. Alternatifnya subdomain satu site (`app.` dan `api.` di domain yang sama).
- **DO**: HTTPS di kedua sisi. `NODE_ENV=production` di backend (cookie `Secure`). `CORS_ORIGIN` berisi origin frontend.
- **FE**: kalau `/auth/me` langsung gagal setelah login berhasil, tampilkan pesan "Sesi tidak tersimpan di browser: periksa konfigurasi domain/cookie". Jangan diam-diam kembali ke halaman login.

### 9. CSP bergantung pada URL API saat build
**Temuan.** `next.config.ts:15-25` menambahkan origin `NEXT_PUBLIC_API_URL` ke `connect-src`. Kalau API dipindah tanpa build ulang, semua panggilan API diblokir CSP.

**Rencana.** Ditangani oleh pemeriksaan di poin 4 dan catatan deploy: ganti URL API berarti build ulang. Kalau API satu host (poin 8), cukup `'self'`.

### 10. Handover belum siap production
**Temuan.**
- `/api/handovers` menyimpan ke Cloudflare D1. `wrangler.local.json` masih memakai `database_id` placeholder (`00000000-...`).
- Identitas user diambil dari header `oai-authenticated-*` (`HANDOVER_TRUST_OAI_HEADERS`) atau user simulasi khusus development (`handover-auth.ts:17-29`). Sesi backend NestJS tidak dikenali.
- Saat uji dengan `vinext start`, endpoint ini menjawab `500`.

**Dampak.** Di production Handover gagal (`500` atau `401`). Selain itu, data handover ada di database terpisah dari backend.

**Rencana.** Perlu keputusan tim:
- **(a) Disarankan**: Handover pindah ke backend NestJS. **BE** menyediakan endpoint, lalu **FE** menyambungkannya seperti tiket.
- **(b)** Tetap di D1. **FE** memverifikasi user di server dengan meneruskan cookie `ctd.sid` ke `GET /auth/me`. Syaratnya API satu host (poin 8). **DO** membuat database D1 dan binding-nya.

Sampai ada keputusan, sembunyikan tombol "Siapkan Handover" di build production (lihat poin 3).

### 11. `AUTH_COOKIE_GUARD`
**Temuan.** Guard di `proxy.ts` membaca cookie `ctd.sid` di host frontend. Cookie itu milik host API.

**Rencana (DO).** Aktifkan guard hanya kalau API disajikan di host yang sama (poin 8). Kalau tidak, semua user akan terkunci di halaman login. Ini sudah ada di `docs/frontend-auth.md`; perlu ditambahkan ke catatan deploy.

### 12. Modul akun demo ikut terkirim
**Temuan.** Build production berisi `dist/client/_next/static/chunks/demo-accounts-*.js`. Isinya `password123` serta nama dan email staf (`PRESET_OPERATORS`). Login demo memang ditolak di production, tapi file itu tetap bisa diunduh siapa saja.

**Rencana (FE).**
- Bungkus `import("@/app/lib/demo-accounts")` di `auth.tsx` dengan kondisi yang diketahui saat build (`process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === "true"`), supaya bundler membuang chunk-nya.
- Ganti nama dan email asli di data demo dengan nama fiktif.
- Lakukan hal yang sama untuk data mock besar (`app/lib/data.ts`): hanya dimuat saat modulnya memakai mock.

**Verifikasi.** `grep -r password123 dist/client` kosong pada build production.

---

## P2: ketepatan data dan kerapian

### 13. Gagal memuat Personel tidak terlihat
**Temuan.** `useBackendTeam.ts:22`: kalau `/users` atau `/roles` gagal, snapshot diisi `loaded: true` dengan daftar kosong. Error tidak ditampilkan dan tidak pernah dicoba ulang sampai logout. Akibatnya pemilih PIC, roster dan Master Data kosong tanpa penjelasan.

**Rencana (FE).** Tampilkan error, misalnya lewat `notify` seperti tiket. Jangan tandai `loaded` saat gagal, beri retry dengan jeda, dan sediakan tombol "Coba lagi".

### 14. Asumsi pemetaan data
**Temuan dan rencana.**
- `backend-tickets.ts:86` memakai `clientId` dari slug nama klien, default "tritronik". Kalau backend menambah klien dengan nama yang tidak cocok dengan id klien di aplikasi, tiketnya hilang dari filter klien. **FE**: petakan berdasarkan id setelah **BE** menyediakan `GET /clients`.
- Severity kosong dianggap "Medium". **FE**: tampilkan "Tanpa severity" supaya statistik tidak menggelembung.
- Shift dihitung ulang di `backend-tickets.ts:84`. **FE**: pakai `getShiftInfoForMinutes` dari `lib/shifts.ts` supaya hanya ada satu definisi shift. Hasilnya sama hari ini, tapi akan beda kalau jam shift diubah.

### 15. Kuota `sessionStorage`
**Temuan.** Daftar tiket sekitar 2,3 MB, sedangkan kuota browser sekitar 5 MB. Di sekitar 8.000 tiket, penyimpanan gagal diam-diam dan setiap muat ulang kembali memakai 37+ permintaan.

**Rencana.** Masalah ini hilang dengan poin 5 (tidak lagi menyimpan semua tiket). Sampai saat itu, batasi cache ke halaman yang sedang dipakai.

### 16. Lint dan pemeriksaan sebelum merge
**Temuan.**
- `auth.tsx:92` melanggar `react-hooks/set-state-in-effect`.
- Seluruh proyek punya sekitar 166 error eslint lama.
- Perubahan sambungan backend (layanan, hook dan tes baru) belum di-commit.

**Rencana (FE).**
- Perbaiki error di `auth.tsx`.
- Kalau CI menjalankan lint seluruh proyek, sepakati dulu baseline-nya: perbaiki, atau batasi lint ke file yang berubah.
- Commit sambungan backend sebagai PR tersendiri ke `main` setelah poin P0 FE selesai.

---

## Urutan kerja yang disarankan

1. **Hari ini, tanpa menunggu siapa pun**:
   - Konfirmasi poin 1 ke devops (sandi asli atau bukan).
   - FE: poin 1 (hapus sandi), 7, 12, 13.
2. **Sebelum deploy pertama**:
   - FE: poin 2, 3, 4.
   - DO: keputusan arsitektur domain (poin 8 dan 11).
   - Tim: keputusan Handover (poin 10).
3. **Bersamaan dengan backend**:
   - FE: poin 5 dan 6 (paging dari server, ringkasan, polling).
   - BE: endpoint agregat, throttle per user, `GET /projects` dan `GET /clients`.
   - Setelah itu sambungkan penulisan tiket (poin 2) dan pemetaan klien (poin 14).
4. **Sebelum merge ke `main`**: poin 15 dan 16, lalu jalankan ulang semua verifikasi:
   - `verify-backend-connected.cjs`
   - `verify-security.cjs`
   - `verify-real-login.cjs`
   - `verify-headers.cjs`
   - tes unit

Catatan untuk backend dan devops yang sudah ada sebelumnya tetap berlaku: `docs/backend-connection-status.md`.
