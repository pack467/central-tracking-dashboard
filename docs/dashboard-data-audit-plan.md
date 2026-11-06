# Audit data dashboard dan rencana perbaikan

Tanggal audit: 30 Oktober 2026. Cakupan: halaman Dashboard (`/dashboard`) beserta panel "View"-nya, hanya sisi frontend. Backend dan database **tidak disentuh**: audit membaca data lewat aplikasi yang sedang berjalan (login ke backend lokal, membaca salinan tiket yang disimpan aplikasi di `sessionStorage`) dan membaca kode.

## 0. Status pengerjaan (30 Oktober 2026)

Dikerjakan hanya di frontend; backend dan database tidak disentuh. Pilihan yang dipakai adalah yang disarankan di bagian 5 (Activity/Meeting selesai bila `closed_at` terisi, SLA per severity 60/120 menit, staf dari modul personel, data lokal dipisah per pengguna, dua daftar tiket).

| # | Status | Yang dilakukan |
|---|---|---|
| D-1 | Selesai | "Tiket Hari Ini" kini dua daftar: "Hari ini" (dibuka hari ini, WIB) dan "Masih terbuka". Di data lokal keduanya 0 dan panel menyebut tiket terakhir masuk 2026-10-04 |
| D-2 | Selesai | Satu aturan di `lib/ticket-metrics.ts` (`isTicketDone`); `isOpenTicket` (sidebar, serah-terima, Shift Log) ikut. Tiket "masih terbuka" turun dari 122 ke 0 |
| D-3 | Selesai | Rekap per User dihitung dari tiket (hari ini/bulan ini/tahun ini, WIB); daftar orang dari modul personel backend (19 orang) ditambah pemilik tiket yang tidak ada di daftar. 14 kartu dicocokkan dengan hitungan dari tiket: sama. Angka dasar karangan dihapus |
| D-4 | Sementara | List Monitoring Shift kini turunan dari jadwal checkpoint dan penilaian operator di halaman Monitoring (read-only); yang belum dinilai tampil "Belum". Dashboard punya catatan data lokal. Sambungan ke backend tetap menunggu kontrak monitoring |
| D-5 | Selesai | Angka cadangan MoM, penyebab SLA karangan, dan tanggal "2026-08-31" dihapus; "Bulan Ini" memakai bulan WIB sekarang; subjudul panel "View" ("14 staf", "Agu vs Sep") diambil dari data |
| D-6 | Selesai | `slaTargetFor` / `slaStatus` / `slaCompliance`: 60 menit Critical/High, 120 menit Medium/Low, tiket yang belum selesai tidak dinilai. Garis acuan grafik durasi menjadi 60 dan 120 menit. Kepatuhan SLA (1 Jun – 1 Sep): 81%, dari 1.244 tiket selesai |
| D-7 | Belum | Median/P90 dan penanda durasi ekstrem |
| D-8 | Selesai | Tiket membawa `ownerIds` (ID pengguna dari backend); pencocokan orang memakai ID, lalu nama persis, tidak lagi "mengandung" |
| S-1 | Selesai, tapi tidak terjangkau | `lib/csv.ts` menetralkan rumus; **fungsi `exportCsv` ternyata tidak dipasang ke tombol mana pun** di dashboard, jadi ekspor CSV tidak bisa dipakai saat ini |
| S-2 | Selesai | `lib/local-data-owner.ts`: memo, penilaian, catatan serah-terima, notifikasi, dan status dipisah per ID pengguna dan tidak dihapus. Diuji dua akun di satu browser: akun kedua mulai bersih, akun pertama mendapat datanya kembali |
| A-1 | Belum | Muat per rentang tanggal (`open_from`/`open_to`) mengubah toko tiket yang dipakai semua halaman; perlu rancangan tersendiri |
| A-3 | Belum | Data lama dipertahankan saat gagal memuat |
| U-1, U-2, U-3 | Selesai | Subjudul panel, label nilai tidak menutupi sumbu, jumlah checkpoint dari data |
| U-4, U-5 | Belum | Data uji harian; pemeriksaan visual MoM dan donat pada data banyak |

Bukti: tes unit baru `ticket-metrics` (9), `csv` (4), `local-data-owner` (5), `volume-buckets` (8), dan tes yang diperbarui (`chart-scale`, `backend-connect`, `ops-memo-monitoring`, `analytics-filter-toolbar`) lolos; `tsc` bersih; skrip browser `output/master-data-round2/scripts/verify-dashboard-data.cjs` lolos semua pemeriksaan. Tes yang gagal dan sudah gagal sebelum pekerjaan ini: `mom-ticket-comparison` (4, berkas CSS lama sudah dihapus), satu tes CSS di `analytics-filter-toolbar`, dan `profile-metrics` (1).

## 1. Jawaban singkat

**Belum aman sepenuhnya.** Data tiket dari backend sendiri bersih: 3.649 tiket, tanpa duplikat, semuanya punya tanggal, shift, pemilik, dan proyek. Yang bermasalah adalah **cara dashboard mengolah dan menampilkan** data itu, plus beberapa angka yang bukan berasal dari data sama sekali.

Yang paling mendesak (angka yang tampil salah atau karangan):

| # | Masalah | Dampak |
|---|---|---|
| D-1 | "Tiket Hari Ini" menampilkan 124 tiket, padahal hari ini tidak ada tiket | Operator mengira ada 124 tiket yang harus ditangani |
| D-2 | 122 tiket berstatus Activity/Meeting dianggap "masih aktif" padahal sudah punya waktu tutup | Beban per engineer, shift aktif, dan SLA ikut salah |
| D-3 | "Rekap Tiket per User" memakai angka karangan (Bulan Ini 34, Tahun Ini 220) untuk orang yang tidak punya tiket | Laporan kinerja individu yang tidak benar |
| D-4 | "List Monitoring Shift" (11 OK / 2 NOK) adalah daftar tetap di kode, bukan hasil monitoring | Terlihat seperti status nyata |
| D-5 | Banyak angka cadangan yang ditulis langsung di kode (41 menit, 92% SLA, penyebab SLA breach karangan) | Muncul sebagai data nyata saat data kosong |

## 2. Yang sudah diperiksa dan aman

| Pemeriksaan | Hasil |
|---|---|
| Duplikat ID tiket | 0 dari 3.649 |
| Tiket tanpa tanggal, shift, pemilik, atau proyek | 0 |
| Subjek tiket berisi HTML atau awalan rumus (`=`, `+`, `-`, `@`) | 0 (lihat S-1: risikonya tetap ada kalau nanti ada) |
| Jumlah tiket ketiga shift = jumlah tiket terfilter | Cocok (1.244 = 686 + 435 + 123) |
| Memo shift memasukkan teks ke halaman | Aman: setiap karakter di-escape sebelum masuk (`lib/shift-notes-doc.ts`) |
| Cache tiket terikat ke pengguna dan dibersihkan saat logout | Ya (`lib/session-data.ts`) |
| Respons backend selama audit | 47 × 200, 1 × 401 (pengecekan sesi sebelum login, wajar) |
| Error di konsol browser | Tidak ada selain 401 di atas |
| Grafik per hari/minggu/bulan | Lolos uji di 1920 px, 1366 px, dan ponsel; label dan batang tidak bertumpuk |
| `tsc` dan tes unit grafik/filter tanggal | Bersih / lolos |

## 3. Temuan

Tingkat: **P0** angka salah atau karangan, **P1** perhitungan tidak konsisten atau celah, **P2** tampilan dan kerapian. Pemilik: FE = frontend, BE = backend (hanya dilaporkan, tidak diubah), PO = perlu keputusan Anda.

### P0. Data yang tampil salah

**D-1. "Tiket Hari Ini" bukan hari ini** (FE)
- Bukti: panel menampilkan 124 tiket; analitik "hari ini" menunjukkan 0. Kode di `TicketReportView.tsx` (`todayTickets`): tiket masuk daftar kalau tanggalnya sama dengan `rawActiveDate` **atau** statusnya belum Closed.
- `rawActiveDate` adalah tanggal tiket **terbaru di data** (4 Okt 2026), bukan tanggal WIB hari ini (30 Okt 2026).
- Kemungkinan besar 122 dari 124 tiket itu adalah tiket Activity/Meeting yang belum berstatus Closed (lihat D-2); angka 122 sama dengan jumlah tiket non-Closed di data, dan sisanya 2 tiket tanggal terbaru. Rinciannya belum dicek satu per satu.
- Perbaikan: ganti jadi dua daftar yang jelas, "Dibuka hari ini (WIB)" memakai `useWibToday`, dan "Masih terbuka" yang hanya berisi tiket yang benar-benar terbuka. Beri judul yang jujur.

**D-2. Status Activity/Meeting dengan waktu tutup dianggap aktif** (FE + keputusan PO)
- Bukti: status di data hanya `Closed` 3.527, `Activity` 119, `Meeting` 3. Keseluruhan 122 tiket non-Closed **semuanya sudah punya `resolutionMinutes`**, artinya `closed_at` terisi. Aplikasi menganggapnya aktif karena hanya melihat teks status.
- Dampak: `activeTickets`, beban per engineer, `shiftWorkload`, dan daftar "Tiket Hari Ini" ikut membengkak.
- Pertanyaan untuk Anda: apakah Activity dan Meeting adalah **jenis** tiket yang memang tidak "ditutup", atau status yang berarti selesai? Setelah dijawab, aturannya satu: tiket selesai kalau `closed_at` terisi atau status Closed. Itu ditulis sekali di `backend-tickets.ts` dan dipakai semua halaman.

**D-3. Rekap Tiket per User memakai angka karangan** (FE)
- Bukti: kartu menampilkan "Ade Yuri F. Damanik: Hari Ini 0, Bulan Ini 34, Tahun Ini 220". Angka 34 dan 220 adalah `baseMonth` dan `baseYear` yang ditulis di kode (`STAFF_ROSTER`), dipakai karena filter "hari ini" kosong.
- Rumus lain juga karangan: `monthCount = jumlah tiket × 4`, `yearCount = baseYear + hari ini`, dan tahun dibagi rata dengan persentase tetap.
- 14 nama di daftar tetap itu: 4 di antaranya (Yuha Azhari Simbolon, Nicholas Bima Nooka Putra, Agnes Siahaan, Pedro Hutagaol) **tidak punya satu pun tiket** di data.
- Perbaikan: hitung Hari Ini / Bulan Ini / Tahun Ini dari tiket (WIB), ambil daftar orang dari modul personel backend (`useBackendTeam`), hapus semua angka dasar. Orang tanpa tiket tampil 0, bukan angka rekaan.

**D-4. List Monitoring Shift adalah daftar tetap** (FE, sambungan ke backend menunggu BE)
- Bukti: `DEFAULT_MONITORING_ITEMS` berisi 13 baris di kode; statusnya hanya berubah lewat `localStorage` lama. Sekarang read-only, jadi "11 OK / 2 NOK" tidak akan pernah berubah dan tidak mengikuti penilaian di halaman Monitoring.
- `LocalDataNotice` ("hanya tersimpan di browser ini...") hanya dipasang di Master Data, Monitoring, dan Shift Log, **tidak** di Dashboard. Padahal Dashboard menggabungkan tiket asli dengan data lokal.
- Perbaikan sementara: turunkan daftar dari penilaian halaman Monitoring (`ctd.checkpoints`), pasang catatan data lokal di Dashboard. Perbaikan penuh: sambungkan ke endpoint monitoring begitu kontraknya jelas (`docs/backend-connection-status.md`, temuan 7).

**D-5. Angka cadangan yang ditulis di kode** (FE)
- `momData`: kalau tidak ada tiket, rata-rata resolusi bulan ini 41 menit, bulan lalu 46 menit, SLA 92% dan 96%, bulan awal "2026-09" dan "2026-08".
- `breachRootCauses`: tanpa data, muncul dua penyebab karangan ("Upstream Vendor / ISP Latency", "Database Lock..."). Dengan data, **setiap** tiket yang melanggar SLA dan tidak punya penyebab diberi "Resource / Database Saturation" begitu saja. Backend tidak punya kolom penyebab.
- Tanggal cadangan "2026-08-31" dipakai di 7 tempat untuk tiket tanpa tanggal (0 tiket terkena saat ini, tapi nilainya tetap salah bila terjadi).
- Waktu penyelesaian cadangan 30 menit dipakai di hitungan breach dan CSV untuk tiket tanpa durasi.
- Perbaikan: hapus semuanya. Data kosong tampil sebagai "Belum ada data", penyebab tidak diketahui tampil "Tidak dikategorikan".

### P1. Perhitungan tidak konsisten dan celah

**D-6. Tiga definisi SLA berbeda** (FE + keputusan PO)
- Kartu Tren Durasi: patuh bila ≤ 60 menit untuk semua tiket.
- Hitungan `slaRate`/breach: target 60 menit untuk Critical/High, **120** untuk lainnya.
- MoM: target `slaTargetMinutes` atau 120.
- Akibatnya tiket yang sama bisa "patuh" di satu panel dan "melanggar" di panel lain. Selain itu, di `slaRate`, tiket tanpa durasi dan tanpa umur dihitung `0` sehingga otomatis "patuh".
- Perbaikan: satu fungsi `slaTargetFor(ticket)` dan `isSlaMet(ticket)` di `lib/`, dipakai semua panel, dengan tes unit. Perlu keputusan angka target per severity.

**D-7. Nilai ekstrem merusak rata-rata** (FE; data sumber: BE/DevOps)
- Bukti: durasi terpanjang 21.262 menit (±14,8 hari); 88 tiket lebih dari 1 hari; 6 tiket lebih dari 7 hari; **26 tiket berdurasi 0 menit**, sehingga "Durasi Tercepat 0 menit" muncul di kartu.
- Rata-rata ikut tertarik oleh nilai ekstrem (untuk rentang 1 Jun – 1 Sep: rata-rata 159 menit, durasi terpanjang 8.558 menit). Median belum dihitung; itu bagian dari perbaikan.
- Perbaikan: tampilkan **median dan P90** di samping rata-rata, tandai tiket 0 menit dan di atas 7 hari sebagai "perlu diperiksa" lewat catatan kecil. Laporkan ke tim data bahwa 26 tiket tercatat selesai dalam 0 menit (kemungkinan buka dan tutup bersamaan).

**D-8. Pencocokan pemilik tiket terlalu longgar** (FE)
- `owner.includes(nama)` atau `nama.includes(owner)` dipakai di filter Shifter, Rekap per User, dan filter engineer. Nama pendek atau hampir sama bisa cocok ke orang yang salah, dan pemilik kosong cocok ke semua orang.
- Perbaikan: cocokkan dengan **ID pengguna**. Backend sudah membawa `user {id, name, email}` di setiap tiket (`backend/.claude/docs/tickets.md`), tetapi `backendTicketToModel` hanya menyimpan namanya; simpan juga `ownerId` dan cocokkan dengan ID itu (perubahan frontend saja).

**S-1. Ekspor CSV rentan formula injection** (FE)
- `exportCsv` hanya membungkus subjek dengan tanda kutip; Excel tetap mengeksekusi isi yang diawali `=`, `+`, `-`, atau `@` walaupun di dalam kutip. Kolom `rootCauseCategory` tidak meng-escape tanda kutip di dalamnya. Saat ini 0 tiket yang terkena, tapi isi tiket berasal dari pengguna.
- Perbaikan: beri awalan `'` pada sel yang diawali karakter rumus, escape semua kolom teks, tambah tes unit.

**S-2. Data lokal tidak dibersihkan saat logout** (FE)
- Cache tiket sudah dibersihkan, tapi `ctd.memo.v2` (memo shift), `ctd_shift_monitoring_checklist`, `ctd.checkpoints` (penilaian OK/NOK), dan data Master Data tetap di `localStorage` dan terlihat oleh siapa pun yang login berikutnya di browser yang sama (komputer bersama di NOC).
- Perbaikan: beri namespace per ID pengguna, atau bersihkan saat logout (keputusan: memo hilang saat logout atau tetap per pengguna).

**A-1. Muat penuh bergantung pada batas 100 permintaan/menit** (FE sebagian, BE untuk solusi penuh)
- Satu kali muat penuh = 37 permintaan (100 tiket per halaman). Batas backend 100 per menit per alamat IP. Tiga operator yang login bersamaan di satu jaringan kantor sudah melewati batas; dengan percobaan ulang yang dibatasi 3 kali, panel menampilkan galat.
- Dengan 10 kali lebih banyak tiket, satu muat penuh butuh ±370 permintaan, jadi tidak mungkin selesai dalam semenit.
- **Koreksi (setelah membaca dokumentasi backend):** backend **sudah** punya filter `open_from`/`open_to` (ISO 8601), `status` (dipisah koma), `user_id`, `project_id`, dan `GET /tickets/summary` (jumlah per status). Jadi frontend bisa meminta hanya rentang yang dipilih (default dashboard = hari ini, hanya beberapa tiket) dan tidak perlu memuat semua 3.649 tiket. Tidak ada perubahan backend yang dibutuhkan untuk ini.
- Yang masih belum ada di backend: agregasi per hari/shift/proyek di server (group-by). Untuk rentang panjang ("Semua Waktu"), frontend tetap harus mengambil halaman demi halaman. Itu satu-satunya bagian yang menjadi **permintaan untuk tim backend**.
- Mitigasi frontend: muat per rentang tanggal, tampilkan data bertahap per halaman, pakai data lama saat gagal (A-3), bagi cache antar tab.

**A-3. Satu halaman gagal membuat seluruh muat gagal** (FE)
- Di `loadAll`, kegagalan satu halaman setelah 3 percobaan membatalkan semuanya dan panel menampilkan galat, meski salinan sebelumnya masih ada.
- Perbaikan: pertahankan data terakhir yang berhasil dan tampilkan label "data per HH:MM, gagal memperbarui" (stale-while-error).

### P2. Tampilan dan kerapian

| # | Temuan | Perbaikan |
|---|---|---|
| U-1 | Panel "View": subjudul header masih "Menit / hari" dan "Tiket / hari" walau grafiknya per minggu atau bulan (`PanelViewer.tsx`, `PANEL_METADATA`) | Subjudul ikut granularitas |
| U-2 | Panel "View" Tren Durasi: label nilai titik pertama ("56m") menutupi angka sumbu "60m" | Geser label atau beri jarak dari sumbu |
| U-3 | Kartu "Total: N dari 13 Checklist": angka 13 ditulis tetap di kode | Ambil dari jumlah item |
| U-4 | Data lokal berakhir 4 Okt 2026, jadi semua panel "hari ini" kosong di lingkungan lokal | Tambah data uji harian, atau panduan memakai tanggal 30 Sep 2026 untuk uji |
| U-5 | Panel yang **belum** saya periksa secara visual pada data banyak: Perbandingan Bulan Lalu vs Bulan Ini (MoM), donat Kategori, Severity, Rekap per User dalam mode View | Masuk fase 3 |

### Risiko yang perlu diukur (belum terbukti)

- Ukuran `sessionStorage`: salinan tiket disimpan sebagai JSON; kuota browser sekitar 5 MB. Perlu diukur pada 3.649 tiket dan dihitung batasnya. Kalau terlampaui, penyimpanan gagal diam-diam dan setiap muat ulang memakai 37 permintaan lagi.
- Waktu interaksi dengan filter "Semua Waktu": semua `useMemo` dihitung ulang untuk 3.649 tiket pada tiap perubahan filter. Perlu diukur di perangkat sedang.
- Selektor tanggal "hari ini" setelah tengah malam WIB di halaman yang terbuka semalaman sudah teruji; belum diuji untuk panel "Tiket Hari Ini" (D-1).

## 4. Yang harus disampaikan ke backend/DevOps (tidak saya ubah)

1. Tiket berstatus Activity/Meeting yang sudah punya `closed_at` (122 tiket): apakah itu disengaja.
2. 26 tiket dengan durasi 0 menit dan 6 tiket lebih dari 7 hari: periksa pencatatan waktu buka dan tutup.
3. Tidak ada endpoint agregat (group-by per hari/shift/proyek); batas 100 permintaan/menit per IP membatasi "Semua Waktu" saat data bertambah (A-1). Filter tanggal sudah ada.
4. Backend tidak menyediakan shift atau penyebab SLA breach (shift dihitung di frontend dari jam buka). Target SLA per severity juga belum ada di tabel severity.
5. Backend sendiri sudah mencatat bahwa `TicketStatus` mencampur siklus hidup (Open/Pending/Closed/ReOpen) dengan jenis pekerjaan (Activity/Meeting) (`backend/.claude/docs/known-issues.md`, butir 7), dan impor menandai 122 tiket "bukan Closed tapi closed_at terisi" sebagai peringatan (`seed-and-import.md`).
6. Kontrak monitoring (`CreateMonitoringLogDto` kosong, `GET /monitoring-template` 400), tercatat di `docs/backend-connection-status.md`.

## 5. Keputusan yang dibutuhkan dari Anda

1. **Activity/Meeting**: dianggap jenis tiket yang selesai bila `closed_at` terisi? (D-2)
2. **Target SLA**: satu angka (60 menit) untuk semua, atau per severity (mis. Critical/High 60, lainnya 120)? (D-6)
3. **Daftar staf di Rekap**: ambil dari modul personel backend? (D-3)
4. **Data lokal saat logout**: dibersihkan, atau disimpan per pengguna? (S-2)
5. **Tiket Hari Ini**: tampilkan "dibuka hari ini" dan "masih terbuka" sebagai dua daftar? (D-1)

## 6. Rencana kerja

Urutan didasarkan pada dampak ke operator. Estimasi: S ≤ 0,5 hari, M ≈ 1 hari, L ≥ 2 hari.

**Fase 1: berhenti menampilkan angka salah (P0)** — D-1, D-2, D-3, D-5, D-4 (catatan data lokal + turunan dari penilaian). Ukuran M-L.
- Letakkan aturan "tiket selesai" satu kali di `backend-tickets.ts`.
- Pindahkan perhitungan inti dari `TicketReportView.tsx` ke `lib/ticket-metrics.ts` agar bisa diuji: `isTicketDone`, `slaTargetFor`, `isSlaMet`, `monthYearCounts`, `todayLists`.
- Hapus semua angka dan tanggal cadangan.
- Selesai bila: tidak ada angka di dashboard yang tidak bisa dilacak ke tiket, dan "Tiket Hari Ini" = 0 saat memang tidak ada tiket baru.

**Fase 2: konsistensi dan celah (P1)** — D-6, D-7, D-8, S-1, S-2, A-3. Ukuran M.
- Satu definisi SLA di semua panel; tampilkan median dan P90; ekspor CSV aman; logout membersihkan data lokal; data lama dipertahankan saat gagal memuat.

**Fase 3: skala dan kerapian (P2 + risiko)** — A-1 (mitigasi frontend), U-1 sampai U-5, pengukuran `sessionStorage` dan waktu filter. Ukuran M.
- Muat bertahap per halaman, cache antar tab, subjudul panel "View", pemeriksaan visual panel yang tersisa.

**Fase 4: bergantung pada backend** — A-1 (agregasi di server untuk "Semua Waktu"), D-4 (sambungan monitoring), pemisahan jenis dan status tiket (D-2), target SLA per severity di tabel severity (D-6). Dimulai setelah tim backend menyetujui kontraknya. Muat per rentang tanggal (A-1) dan pencocokan dengan `user.id` (D-8) **tidak** menunggu backend dan masuk Fase 2-3.

## 7. Rencana pengujian

| Area | Cara uji |
|---|---|
| Aturan tiket selesai, SLA, hitungan per pengguna, daftar hari ini | Tes unit di `tests/ticket-metrics.test.mjs` dengan data kecil: tiket Activity berisi `closed_at`, tiket 0 menit, tiket tanpa durasi, pergantian bulan dan tahun, tengah malam WIB |
| Ekspor CSV | Tes unit: subjek `=SUM(1)`, `@x`, `-1`, tanda kutip ganda, titik koma |
| Angka di layar = angka di data | Perluas `output/master-data-round2/scripts/audit-dashboard-data.cjs`: bandingkan setiap kartu dengan hitungan dari salinan tiket (hari ini, shift, per orang, total) |
| Logout bersih | Skrip browser: login, isi memo dan penilaian, logout, login akun lain, pastikan kosong |
| Beban muat | Skrip dengan tiga sesi bersamaan; pastikan panel tidak menampilkan galat dan tampil bertahap |
| Panel "View" | `verify-panel-viewer.cjs` dan `verify-volume-chart.cjs` (sudah ada), tambah MoM dan donat |
| Regresi | `tsc`, tes unit, eslint pada berkas yang disentuh, dan skrip browser di 1920, 1366, 390 px |

## 8. Lampiran: cara audit ini dilakukan

- Skrip hanya-baca: `output/master-data-round2/scripts/audit-dashboard-data.cjs` (login, tunggu data termuat, baca salinan tiket di `sessionStorage` dan teks di layar, tanpa menulis apa pun ke backend).
- Angka di atas berasal dari satu proses: 3.649 tiket, 2025-05-22 sampai 2026-10-04, satu klien (tritronik), 14 pemilik, 6 kategori, severity Low 1.354 / Medium 2.280 / High 15 (tidak ada Critical).
- Hasil mentah: `scratchpad/audit.json` pada sesi ini.
