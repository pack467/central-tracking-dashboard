# Audit frontend putaran 2: celah dan risiko error yang tersisa

Audit 30 Oktober 2026, setelah perbaikan di `docs/frontend-production-readiness-plan.md`. Isinya hanya hasil membaca kode, membaca build, dan satu uji di browser. Belum ada kode yang diubah. Backend dan database tidak disentuh.

Prioritas:
- **P1**: perbaiki sebelum production. Sudah terbukti atau hampir pasti terjadi.
- **P2**: perbaiki sebelum data dibagikan antar pengguna, atau sebelum merge ke `main`.
- **P3**: perbaikan kecil.

Kolom "Siapa": **FE** frontend, **BE** backend developer, **DO** devops, **Tim** keputusan bersama.

## Ringkasan

| # | Temuan | Prioritas | Siapa |
| --- | --- | --- | --- |
| A1 | Dibuka lewat HTTP (misalnya IP LAN), CSS dan JS gagal dimuat, halaman rusak | P1 | DO, FE |
| A2 | Data pribadi dan alamat server internal ikut di JavaScript publik (tanpa login) | P1 | Tim, FE |
| A3 | Hak akses (role) tidak diterapkan di UI sama sekali | P1 | FE, BE |
| A4 | Jam shift memakai zona waktu perangkat, bukan WIB | P2 | FE |
| A5 | Tombol salin bisa error tanpa pesan | P2 | FE |
| A6 | URL yang diketik pengguna tidak dicek skemanya | P2 | FE |
| A7 | CSP masih mengizinkan skrip inline | P2 | FE |
| A8 | Framework `vinext` masih versi beta | P2 | Tim |
| A9 | Logout di satu tab tidak langsung terasa di tab lain | P3 | FE |
| A10 | Halaman publik `/team` menampilkan email, LinkedIn, GitHub staf | P3 | Tim |
| A11 | Dev server menerima Host apa saja | P3 | FE |

Masih terbuka dari rencana sebelumnya (detailnya di `docs/frontend-production-readiness-plan.md`, bagian Status):
- Paging tiket dari server (#5).
- Keputusan Handover (#10).
- Halaman yang belum tersambung: disembunyikan atau disambungkan (#3).
- Pemetaan klien dan severity (#14).
- Tugas devops: ganti sandi Runbooks yang pernah ada di kode, isi `CTD_DEPLOY_ENV=production`, satu situs dengan HTTPS.

## Status pengerjaan (30 Oktober 2026, putaran 2)

Dikerjakan di frontend saja. Backend dan database tidak disentuh. Belum di-commit. Runbooks (halaman, kode, data) juga dihapus atas permintaan.

| # | Status | Yang dikerjakan | Yang masih tersisa |
| --- | --- | --- | --- |
| A1 | Selesai | `NEXT_PUBLIC_SITE_URL=https://...` menyalakan HSTS dan `upgrade-insecure-requests`. Tanpa itu keduanya tidak dikirim, jadi IP LAN dan server HTTP internal tidak lagi rusak (diuji: sebelumnya 35 permintaan gagal, sekarang 0). Kunjungan HTTP ke situs yang dinyatakan HTTPS dialihkan ke alamat HTTPS (path dan query tetap; localhost dikecualikan). Build production (`CTD_DEPLOY_ENV=production`) wajib memuat alamat ini | **DO + Tim**: putuskan HTTPS wajib di semua lingkungan |
| A2 | Hampir selesai | Runbooks dihapus: 13 alamat server internal, 9 email `@tritronik.com`, sandi, dan nomor telepon ikut hilang dari bundel. 20 nomor telepon contoh di data lain diganti nomor jelas fiktif (`+62 811-0000-0NN`), 1 email staf diganti `pic.contoh@example.com`. Pemindai `scripts/check-bundle.mjs` (hook `postbuild`) memeriksa `dist/client`: sandi demo, host `.internal.`, email `@tritronik.com`, nomor yang tampak asli, IP privat. Gagal di mode production, peringatan di mode lain. Hasil sekarang: bundel bersih | Nama lengkap staf di data mock dan seed masih ada, dan data mock besar masih ikut build. **Tim**: tentukan mana yang asli |
| A3 | Sebagian | **Koreksi**: klaim awal "tidak diterapkan sama sekali" terlalu kuat. Master Data sudah memakai `masterRole` (peran Admin ke atas boleh menulis). Yang diperbaiki: (1) bug nyata, GET `/roles` ditolak (403) untuk AGENT, VIEWER, TEAM_LEAD, sehingga daftar Personel ikut gagal. Sekarang Personel tetap tampil, kolom peran "Tidak tersedia", tab Peran memberi pesan izin dan tampil "–", bukan 0 (diuji dengan akun AGENT dan VIEWER). (2) Di mode hybrid semua orang dianggap `manager`; sekarang peran login yang menentukan, jadi tombol Tambah Personel hilang untuk yang tidak berhak. (3) `lib/access.ts` dan `useAccess()`: aksi UI dipetakan ke izin backend (`tickets.write`, `users.manage`, `roles.read`, dan seterusnya), dicek terhadap katalog `/permissions`. Tulis tiket nanti butuh `tickets.write` | API handover masih belum memeriksa peran dari sesi backend (ikut keputusan Handover) |
| A4 | Selesai | `lib/wib.ts`: satu jam WIB untuk shift, jam top bar, "hari ini", jam yang ditulis di tiket, dan filter notifikasi. **Bug nyata ikut diperbaiki**: `getTodayWIB` menambah selisih zona perangkat dua kali, sehingga di PC berzona WIB hasilnya tanggal UTC, yaitu kemarin antara 00:00 dan 07:00 WIB (jam shift Subuh). Diuji di lima zona waktu | Kalender (DatePicker) masih menandai "hari ini" menurut perangkat |
| A5 | Selesai | `copyTextToClipboard` (Clipboard API lalu cara lama, mengembalikan berhasil atau tidak) dipakai di semua tombol salin yang tersisa. Layar tidak lagi bilang "tersalin" saat gagal. 3 titik di Runbooks hilang bersama Runbooks | |
| A6 | Selesai | `safeExternalUrl` dan `safeMailto` (hanya http/https, tanpa login tertanam, tanpa karakter kontrol; mailto tanpa header tambahan) dipakai di link email, LinkedIn, GitHub halaman tim. Kolom URL SOP ikut terhapus bersama Runbooks. Referensi sistem di Master Data sudah punya pengecekan sendiri | |
| A7 | Selesai | CSP berbasis nonce dibuat per permintaan di `proxy.ts`: `script-src 'self' 'nonce-...'` tanpa `'unsafe-inline'`. Nonce berbeda di setiap respons, semua skrip inline memilikinya (38 sampai 39), login dan 16 halaman serta overlay tanpa satu pun pelanggaran CSP (diuji di build production). Aturan eslint melarang `dangerouslySetInnerHTML`, `innerHTML=`, `insertAdjacentHTML`, `document.write` di luar tiga file yang diizinkan | `style-src` masih `'unsafe-inline'` (UI memakai atribut style) |
| A8 | Belum | | **Tim**: putuskan apakah vinext beta boleh di production |
| A9 | Selesai | `BroadcastChannel`: logout atau sesi berakhir di satu tab membuat tab lain pindah ke `/login` dan membuang cache dalam kurang dari 1 detik (diuji dengan dua tab). Login di tab lain tidak otomatis memindahkan tab yang sedang di halaman login (halaman itu memang tidak pernah mengalihkan pengguna yang sudah login) | |
| A10 | Belum | | **Tim**: persetujuan staf untuk data di halaman `/team` |
| A11 | Selesai | Dev server hanya menjawab localhost dan alamat IP. Host lain (tunnel) harus disebut di `CTD_DEV_ALLOWED_HOSTS` (`*` untuk semua) | |

Pengujian di browser nyata dengan backend lokal:
- `verify-backend-connected` 30 pemeriksaan, `verify-roles-access` 22, `verify-csp` 9 (build http dan build https), `verify-cookie-guard`, `verify-tab-sync`, `probe-https-redirect` 2, `probe-lan-http`.
- Mode mock: `verify-headers` 8, `verify-security` 22, tabel Master Data, kategori 31, `verify-mock-unchanged` 6.
- Tes unit baru: `wib-time` 5 (di lima zona waktu), `csp` 4, `safe-url` 2, `check-bundle` 3, `production-env` 6, `backend-connect` 10.
- `tsc` bersih. Lint: tidak ada error baru di file yang disentuh.

Catatan: `login-entrance.test.mjs` menembak dev server di :3000. Dev server yang sudah berjalan sejak sebelum perubahan memakai konfigurasi lama dan menjawab 500, jadi **restart dev server** (`Ctrl+C`, lalu `npm run dev`). Di dev server baru semua halaman 200.

### Sudah dicek dan aman
- **XSS.** React meng-escape semua teks. Memo diisi dari `docToHtml` yang meng-escape. Tidak ada `eval`, `new Function`, `dangerouslySetInnerHTML`, `new RegExp` dari input, maupun listener `postMessage`. React 19.2 memblokir URL `javascript:` di `href`.
- **Redirect setelah login.** `safeNext` hanya menerima path internal: menolak `//`, URL ber-encode, dan origin lain.
- **Link keluar.** Semua `target="_blank"` memakai `rel="noopener noreferrer"`.
- **API handover.**
  - Tulis dan hapus memeriksa origin.
  - Body dibatasi 100 KB, `limit` dibatasi 500.
  - Hanya pembuat catatan yang boleh menghapus, dengan cek revisi.
  - Query memakai parameter (aman dari SQL injection).
- **Data tersimpan.** Semua `JSON.parse` dari `localStorage` atau `sessionStorage` ada di dalam `try`, jadi data rusak tidak membuat aplikasi crash.
- **Halaman error.** Hanya menampilkan kode `digest`, bukan pesan atau stack trace.
- **Dependensi dan build.** Versi React, vinext dan vite dipatok persis. `npm audit --omit=dev` 0 kerentanan. Tidak ada source map. Build biasa tanpa akun demo dan tanpa sandi.

---

## P1

### A1. Halaman rusak kalau dibuka lewat HTTP
**Temuan.** CSP di `frontend/next.config.ts:32` memuat `upgrade-insecure-requests`. Browser lalu memaksa semua file halaman pindah ke `https://`. Lewat `localhost` browser membebaskannya, tapi tidak lewat IP atau nama host lain.

**Bukti.** Skrip uji `output/master-data-round2/scripts/probe-lan-http.cjs` membuka build production lewat dua alamat:
- `http://localhost:3100`: normal.
- `http://192.168.18.6:3100`: **35 permintaan** (CSS, chunk JS, logo) dipindah ke `https://` dan gagal dengan `ERR_SSL_PROTOCOL_ERROR`. Halaman tampil tanpa gaya dan tidak bisa dipakai.

Kode di repo (`lib/master-data-model.ts:43`) mencatat aplikasi memang pernah dibuka lewat IP LAN dengan HTTP.

**Dampak.** Kalau production atau staging dipasang di jaringan internal tanpa HTTPS, aplikasi rusak total untuk semua orang. Tanpa HTTPS, cookie sesi backend (`Secure` di production) juga tidak tersimpan, jadi login pun gagal.

**Rencana.**
1. **DO + Tim**: putuskan HTTPS wajib untuk semua lingkungan yang dibuka pengguna, termasuk jaringan internal (sertifikat internal atau reverse proxy). Ini yang benar, karena login juga membutuhkannya.
2. **FE**: pasang `upgrade-insecure-requests` dan `Strict-Transport-Security` hanya kalau build memang untuk HTTPS. Buat satu variabel build, misalnya `CTD_SITE_URL=https://...`, dan biarkan `scripts/check-production-env.mjs` menolak `http://` pada build production.
3. **FE**: tambahkan pemeriksaan kecil di `layout.tsx` (skrip inline yang sudah diizinkan CSP). Kalau halaman dibuka lewat `http:` di host selain `localhost`, tampilkan pesan "Buka aplikasi lewat https://..." alih-alih halaman rusak.

**Verifikasi.** Jalankan `probe-lan-http.cjs`:
- Build HTTPS yang dibuka lewat HTTP menampilkan pesan yang jelas.
- Build untuk HTTP internal (kalau tim memutuskan itu diizinkan) tidak menghasilkan permintaan gagal.

### A2. Data pribadi dan alamat internal ada di JavaScript publik
**Temuan.** File JavaScript di `/_next/static` bisa diunduh siapa saja tanpa login. Hitungan di build saat ini:

| Isi | Jumlah | Sumber |
| --- | --- | --- |
| Nomor telepon (+62/08) | 28 | `lib/data.ts` (14), `lib/masterDataSeeds.ts` (9), `lib/runbooksData.ts` (8), `lib/clientData.ts` (8) |
| Alamat email (di luar `example`/`company.id`) | 19, termasuk 9 `@tritronik.com` | terutama `lib/runbooksData.ts` |
| Nama host internal | 13 | `grafana.internal.tritronik.com`, `netbox.internal…`, `kafka-ui.internal…`, `graylog.siem…`, `itsm…`, `confluence…`, `sharepoint…`, `drive.internal…` |
| IP privat | 1 | |
| Nama lengkap staf | banyak | data mock dan seed |

Nomor telepon terlihat berpola (misalnya `812-3456-789`), jadi kemungkinan contoh. Nama host dan nama staf terlihat asli.

**Dampak.**
- Peta infrastruktur internal klien (Grafana, NetBox, Kafka UI, SIEM) memudahkan orang luar merencanakan serangan.
- Nama, email dan nomor telepon yang asli adalah data pribadi (UU PDP), dan saat ini terbuka untuk publik.

**Rencana.**
1. **Tim**: pastikan mana yang asli: nama host, email, telepon, nama staf.
2. **FE**: ganti data contoh dengan yang jelas fiktif (`example.com`, `.invalid`, nomor `0800-000-xxxx`, nama rekaan).
3. **FE**: data mock dan seed hanya ikut build kalau modulnya memakai mock. Caranya sama dengan akun demo: impor dinamis di balik konstanta yang ditanam saat build, supaya build production yang tersambung ke backend tidak memuatnya.
4. **BE**: isi Runbooks yang asli (link internal, kontak eskalasi) disajikan dari backend setelah login, bukan dari kode.

**Verifikasi.** Hitungan di atas menjadi 0 pada build production. Tambahkan pemeriksaan otomatis setelah build: gagal kalau ada pola `@tritronik.com`, `.internal.`, atau nomor telepon di `dist/client`.

### A3. Hak akses tidak diterapkan di UI
**Koreksi (setelah dikerjakan):** Master Data ternyata sudah punya pembatasan berbasis peran (`masterRole`), jadi "tidak diterapkan sama sekali" di bawah terlalu kuat; lihat tabel Status.

**Temuan awal.** `hasPermission()` dan `can()` dari `lib/auth.tsx` dipakai **0 kali** di komponen. Di mode backend, pengguna berperan Viewer atau Agent melihat dan bisa memakai semua tombol: Master Data (tulis lokal), Handover (API D1), Monitoring, Runbooks.

**Dampak.**
- Untuk modul yang tersambung, backend tetap menolak, jadi aman, tapi UI menawarkan aksi yang akan gagal.
- Untuk yang belum tersambung, tidak ada penjaga sama sekali. Contohnya API handover: siapa pun yang login boleh membuat catatan, apa pun perannya.

**Rencana.**
1. **FE**: buat satu peta "aksi → izin backend", misalnya `tickets.create`, `users.update`, `handover.create`. Pakai nama izin dari `GET /permissions` di backend.
2. **FE**: sembunyikan atau nonaktifkan tombol sesuai `hasPermission`, dan tampilkan halaman "Tidak punya akses" untuk rute yang tidak diizinkan.
3. **BE/FE**: API handover di frontend harus memeriksa peran dari sesi backend. Ini terkait keputusan Handover (#10).
4. Ingat: UI hanya kenyamanan. Penegakan tetap di server.

**Verifikasi.** E2e dengan akun VIEWER dan AGENT dari seed backend: tombol tulis tidak ada, dan rute admin menampilkan "Tidak punya akses".

---

## P2

### A4. Jam shift memakai zona waktu perangkat
**Temuan.** Penentuan shift memakai zona waktu perangkat (`date.getHours()` di `lib/shifts.ts`, `getShiftInfo`), begitu pula jam di top bar, jendela transisi dan batas "hari ini". Sebaliknya, waktu tiket dari backend dikonversi tegas ke WIB, dan laporan mingguan memakai `Asia/Jakarta`.

**Dampak.** Perangkat yang tidak diatur ke WIB akan menampilkan shift aktif, jendela handover dan "Tiket Hari Ini" yang salah, dan tidak cocok dengan waktu tiket. Contohnya: staf di WITA atau WIT, PC kiosk atau NOC yang diatur ke UTC, atau laptop yang dibawa bepergian.

**Rencana (FE).**
- Buat satu helper `nowInWib()` (dan `toWib(date)`) berbasis `Intl.DateTimeFormat` dengan `timeZone: "Asia/Jakarta"`.
- Pakai di `lib/shifts.ts`, jam top bar, filter "hari ini", dan pembuatan tanggal handover.

**Verifikasi.** Jalankan tes unit dengan `TZ=UTC` dan `TZ=Asia/Makassar`. Hasil shift harus sama dengan `TZ=Asia/Jakarta`.

### A5. Tombol salin bisa error
**Temuan.** Tiga tempat memanggil `navigator.clipboard.writeText` tanpa pengaman dan tanpa menangani penolakan:
- `components/runbooks/CredentialsSection.tsx:136`
- `components/runbooks/LinksToolsSection.tsx:150`
- `components/runbooks/SopSection.tsx:463`

Di HTTP atau saat izin ditolak, `navigator.clipboard` tidak ada atau promise-nya ditolak. Hasilnya error di konsol, dan pengguna tidak tahu salinnya gagal. Tempat lain sudah memakai `?.`.

**Rencana (FE).** Satu helper `copyText(text)` yang mencoba Clipboard API lalu fallback, dan mengembalikan berhasil atau gagal. Hasilnya ditampilkan lewat toast. Pakai di semua tombol salin.

### A6. URL dari pengguna tidak dicek skemanya
**Temuan.**
- Lampiran SOP (`SopSection.tsx`, `type="url"`, hanya dicek tidak kosong) dan link eksternal SOP diterima apa adanya.
- `LinksToolsSection.tsx:52` memakai `new URL()` tapi tidak membatasi skema.
- Hari ini datanya hanya di browser pembuatnya, dan React 19 memblokir `javascript:`.

**Dampak.** Begitu Runbooks disimpan di backend dan dibagikan, URL `data:`, `javascript:` atau `file:` menjadi jalan phishing atau stored-XSS ke pengguna lain.

**Rencana (FE).** Satu fungsi `safeExternalUrl(value)` yang hanya menerima `https:` dan `http:` (opsional `mailto:`). Dipakai saat menyimpan (pesan error di form) dan saat menampilkan (link tidak dibuat kalau tidak aman).

### A7. CSP masih mengizinkan skrip inline
**Temuan.** `script-src 'self' 'unsafe-inline'` (`next.config.ts:21`). Saat ini tidak ditemukan celah injeksi HTML. Tapi kalau suatu saat ada, skrip penyerang langsung jalan.

**Rencana (FE).** Pindah ke CSP berbasis nonce atau hash setelah dipastikan vinext mendukung nonce untuk skrip bootstrap-nya. Sampai itu, pertahankan aturan "tidak ada HTML mentah dari data". Tambahkan aturan eslint yang melarang `dangerouslySetInnerHTML` dan `innerHTML` di luar Memo.

### A8. Framework masih beta
**Temuan.** `vinext 1.0.0-beta.2` dan `vite 8.0.13`. Versinya sudah dipatok persis, jadi tidak berubah diam-diam.

**Dampak.** Bug framework dan perbaikan keamanannya mengikuti jadwal proyek beta. Sudah ada contoh perilaku khusus: `NEXT_PUBLIC_*` yang tidak di-set menjadi `{}.NAMA`, dan `vinext dev` menolak instans kedua.

**Rencana (Tim).** Putuskan apakah beta dapat diterima untuk production. Kalau ya:
- Pantau rilisnya.
- Uji setiap kenaikan versi dengan semua skrip `verify-*`.
- Catat versi yang terbukti stabil.

---

## P3

### A9. Logout antar tab
**Temuan.** Logout atau sesi berakhir di satu tab tidak langsung terasa di tab lain. Tab lain baru keluar saat permintaan berikutnya mendapat `401` (paling lama sekitar 60 detik karena pembaruan tiket).

**Rencana (FE).** Kirim pesan lewat `BroadcastChannel("ctd-auth")` saat logout atau sesi berakhir. Tab lain lalu membersihkan cache (`bindSessionData(null)`) dan pindah ke `/login`.

### A10. Data staf di halaman publik `/team`
**Temuan.** `TeamDetailPoster.tsx` menampilkan email, LinkedIn dan GitHub staf di halaman yang bisa dibuka tanpa login. Ini sesuai desain halaman "Our Team".

**Rencana (Tim).** Pastikan setiap staf setuju datanya tampil publik (UU PDP), dan email yang tampil adalah email kerja. Kalau tidak, tampilkan field itu hanya setelah login.

### A11. Dev server menerima Host apa saja
**Temuan.** `vite.config.ts` memakai `allowedHosts: true`. Ini hanya berlaku saat development. Kalau dev server dibuka ke jaringan atau lewat tunnel, ia rentan DNS rebinding.

**Rencana (FE).** Batasi ke `localhost` ditambah daftar host dari variabel env, misalnya `CTD_DEV_ALLOWED_HOSTS`.

---

## Urutan kerja yang disarankan
1. **Keputusan tim dulu**:
   - HTTPS wajib (A1).
   - Data mana yang asli (A2).
   - Persetujuan data `/team` (A10).
   - Framework beta (A8).
   - Keputusan Handover (#10 rencana sebelumnya).
2. **FE, bisa langsung**:
   - A1 butir 2 dan 3.
   - A2 butir 2 dan 3.
   - A4, A5, A6, A9, A11.
3. **FE bersama BE**:
   - A3 (peta izin dari `GET /permissions`).
   - Paging tiket (#5 rencana sebelumnya).
4. **Setiap perubahan** dijalankan ulang dengan:
   - `verify-backend-connected.cjs`
   - `verify-cookie-guard.cjs`
   - `verify-mock-unchanged.cjs`
   - `verify-security.cjs`
   - `probe-lan-http.cjs`
   - tes unit dan `tsc`
