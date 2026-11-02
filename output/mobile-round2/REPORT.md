# Mobile Dashboard — putaran kedua

Implementasi lokal pada 26 Oktober 2026. Tidak ada commit, dependency baru, file CSS baru, perubahan seed/data, rumus KPI, filter global atau skema URL. Perubahan lokal milik pengguna yang sudah ada dipertahankan. Runtime proyek adalah Vinext dengan struktur Next.js App Router, React dan TypeScript.

Pengujian memakai Chrome headless, zona Asia/Jakarta, waktu tetap 26 Oktober 2026 pukul 20.17 WIB untuk pasangan screenshot. DPR 3 dan touch pada lebar ≤844px; DPR 1 untuk desktop. Screenshot disimpan dalam piksel CSS. Data fixture yang tampil tetap 88 tiket analitik dan 33 tiket pada panel hari ini.

## Diagnosis sebelum perubahan

- Dugaan dua kolom pada 412px tidak terkonfirmasi pada source yang ada saat tugas dimulai. Pada 360/390/412/430px, kartu sudah satu kolom dengan lebar **336/366/380/398px**. Dua kolom muncul pada 768/844px: **356+356 / 394+394px**, akibat kelas **sm:max-lg:grid-cols-2**. Kelas itu dihapus; satu kolom dipakai hingga 1023px. Desktop ≥1024px tetap memakai aturan awal. DOM tetap Tiket → Memo → Monitoring, tanpa CSS order.
- Tinggi baseline pada 390px: Tiket **592,5px**, memo **169px**, monitoring **348px**, Volume **378px**, staf **467px**. Tinggi Dashboard **3.845px**. Tidak ada font terlihat <11px di Dashboard baseline; perubahan difokuskan pada hierarki dan keterbacaan.
- Volume: sumbu Y berada di SVG yang sama dengan plot geser. Ketika scroll dimulai pada tanggal terbaru, label di x≈38 ikut keluar layar. Wrapper lama setinggi 220px mempunyai scrollbar horizontal; label baseline+22 hampir menyentuh dasar SVG. Ruang label berkurang lagi oleh scrollbar native. Perbaikan memisahkan kolom sumbu 36px dari scroll dan memberi plot 252px serta margin bawah 36px.
- Skala lama berasal dari computeYTicks: puncak 44 dibulatkan ke **60**, bukan dikunci tepat 44. Tanggal akhir hanya 1–5 tiket sehingga banyak area kosong tetap wajar karena puncak berada di sebelah kiri, di luar viewport. Kini batas atas **49** untuk puncak 44, dengan 5 tick integer dan tanda minimum 6px untuk total positif yang sangat kecil. Skala tetap linear dan menggunakan nilai data asli.
- Legenda sistem dan chip staf mempunyai overflow horizontal native. Scrollbar disembunyikan melalui utilitas; fade muncul hanya pada sisi yang masih dapat digeser. Simbol kecil di sisi chip merupakan bagian scrollbar browser, bukan ikon aplikasi yang perlu digandakan.
- Paginasi mobile memiliki **padding-right 52px**. Padding itu dihapus. Margin vertikal Filter 6px membuat celah nyata **18px** meski parent gap 12px; kini margin mobile nol sehingga celah nyata 12px.
- Anotasi Trafik sebelumnya justru disembunyikan pada telepon oleh CSS lama. Perhitungan desktop menjepit pusat anotasi ke 6–94%, tanpa memperhitungkan lebarnya. Anotasi mobile sekarang bertuliskan singkat **Lonjakan 25**, dengan lebar penuh diperhitungkan ketika dijepit.
- FAB 52×52px sebelumnya tidak membaca arah gulir. Sekarang memakai scroll pasif, requestAnimationFrame, idle 700ms dan transisi translate/opacity 200ms. Fokus keyboard memunculkannya kembali.

## Hasil implementasi

Panel compact memakai padding isi 14px, judul 15px semibold, isi 13px, teks sekunder minimal 11px, gap antarbagian 12px. Tiket menampilkan 5 baris seragam **84px**, lalu tombol 44px dan paginasi satu baris. Memo tetap pratinjau tiga baris dengan View. Monitoring menampilkan 5 check, judul panel lengkap, status 56×40px, penanda NOK merah 3px dan ringkasan satu baris.

Grafik garis menggunakan ukuran wadah dari ResizeObserver. Label ambang Target 60m/Breach 90m masuk ke plot; label max/min mencoba posisi di atas/bawah titik dan sisi plot, lalu menghindari garis, label SLA dan satu sama lain. Bila tidak ada tempat, label tambahan dilewati. Tooltip 220px dijepit ke lebar wadah dan layar; anotasi disembunyikan selama tooltip aktif. Target aktif tetap dapat diperiksa dengan touch dan panah keyboard, Home, End, Escape.

Volume memiliki kolom sumbu tetap 36px, plot 252px, area tanggal native horizontal dan awal di tanggal terbaru. Kolom diberi jarak sekitar 52px untuk target 44px dan sela sekitar 8px, dengan batang ≥24px. Total hanya ditampilkan pada puncak dan titik akhir pada compact. Legenda sistem tetap mengubah visibilitas seri di grafik itu saja.

Kategori memakai donut sekitar 140px di atas daftar baris 36px bila kartu <440px, dan berdampingan bila cukup lebar. Severity memakai empat kartu 2×2 dengan tinggi 108px. Tab dua sel 44px hanya menampilkan panel compact aktif, sehingga tinggi panel lain tidak meninggalkan ruang kosong. Kartu staf memakai avatar 32px, angka mono 16px, tiga kolom KPI, chip geser serta satu area kartu untuk membuka Detail.

Bottom nav memakai sela 8px, item minimal 56px lebar, tinggi bar 56px ditambah border/safe-area. Landscape pendek memakai isi 44px tanpa label. Saat input aktif dan visualViewport berkurang >max(140px,20%), nav dan FAB disembunyikan. Padding/spacer bawah menyediakan ruang aman terakhir. Pada uji dasar halaman, legenda berakhir sekitar y=681, sedangkan FAB mulai sekitar y=725; tidak ada tumpang tindih.

Semua feedback sentuh memakai active background #243044, skala 0,98, highlight browser transparan, touch manipulation, dan outline keyboard solid 2px. Reduced motion mematikan transition-property; nilai duration yang masih tersimpan tidak menghasilkan animasi.

## Matriks viewport dan screenshot

| Viewport | Tinggi sebelum | Tinggi sesudah | Kolom atas sesudah | Teks <11px | Overflow halaman | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 320×4411 | 3845 | 4411 | 296px | 0 | 0px | [Sebelum](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/before/dashboard-320.png>) · [Sesudah](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-320.png>) |
| 360×4378 | 3845 | 4378 | 336px | 0 | 0px | [Sebelum](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/before/dashboard-360.png>) · [Sesudah](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-360.png>) |
| 375×4378 | 3845 | 4378 | 351px | 0 | 0px | [Sebelum](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/before/dashboard-375.png>) · [Sesudah](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-375.png>) |
| 390×4378 | 3845 | 4378 | 366px | 0 | 0px | [Sebelum](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/before/dashboard-390.png>) · [Sesudah](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-390.png>) |
| 412×4378 | 3845 | 4378 | 380px | 0 | 0px | [Sebelum](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/before/dashboard-412.png>) · [Sesudah](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-412.png>) |
| 430×4378 | 3845 | 4378 | 398px | 0 | 0px | [Sebelum](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/before/dashboard-430.png>) · [Sesudah](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-430.png>) |
| 768×4362 | 3317 | 4362 | 724px | 0 | 0px | [Sebelum](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/before/dashboard-768.png>) · [Sesudah](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-768.png>) |
| 844×4474 | 3317 | 4474 | 800px | 0 | 0px | [Sebelum](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/before/dashboard-844.png>) · [Sesudah](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-844.png>) |
| 1024×4591 | 4591 | 4591 | 764px | desktop dipertahankan | 0px | [Sebelum](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/before/dashboard-1024.png>) · [Sesudah](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-1024.png>) |
| 1280×3258 | 3258 | 3258 | 540px 410px | desktop dipertahankan | 0px | [Sebelum](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/before/dashboard-1280.png>) · [Sesudah](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-1280.png>) |
| 1440×3073 | 3073 | 3073 | 700px 410px | desktop dipertahankan | 0px | [Sebelum](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/before/dashboard-1440.png>) · [Sesudah](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-1440.png>) |
| 1920×3183 | 3183 | 3183 | 1110px 410px | desktop dipertahankan | 0px | [Sebelum](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/before/dashboard-1920.png>) · [Sesudah](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-1920.png>) |

Pada 390px, tinggi bertambah **533px** untuk kontrol 44px, lima check monitoring, KPI staf yang terbaca dan daftar kategori 36px. Peningkatan tinggi berasal dari isi dan kontrol, bukan kolom kosong yang dipaksa setinggi tetangganya.

## Perbandingan desktop

| Lebar | Raw: setiap beda kanal | Beda kanal >1/255 | Beda kanal >2/255 | Maks. beda kanal | Dimensi |
| --- | --- | --- | --- | --- | --- |
| 1024 | 0.000000% | 0.000000% | 0.000000% | 0 | 1024×4591 → 1024×4591 |
| 1280 | 0.000000% | 0.000000% | 0.000000% | 0 | 1280×3258 → 1280×3258 |
| 1440 | 0.000203% | 0.000000% | 0.000000% | 1 | 1440×3073 → 1440×3073 |
| 1920 | 0.514763% | 0.013025% | 0.000016% | 6 | 1920×3183 → 1920×3183 |

Perubahan bermakna pada toleransi 2/255 berada di bawah batas 0,5%. **Pembacaan raw harus dibedakan dari itu:** pada 1920px, dithering/rasterisasi SVG dapat membuat raw melebihi 0,5%, meski hampir seluruhnya hanya beda 1–2 tingkat kanal dan geometri/panel sama. Jika kriteria ditafsirkan raw tanpa toleransi sedikit pun, hasil 1920px belum dapat disebut lulus secara literal. PNG diff dan angka lengkap tersedia di [pixels.json](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/pixels.json>).

## Audit halaman lain — laporan saja, 390px

Hitungan berasal dari elemen terlihat dengan teks langsung dan ukuran komputasi; target kecil adalah elemen interaktif yang salah satu sisinya <40px. Jumlah elemen bukan jumlah masalah yang unik. Screenshot diambil setelah loading halaman selesai. Capture diagnosis awal beberapa halaman masih dapat menangkap skeleton; karena itu angka skeleton awal tidak dipakai sebagai pembanding klaim perbaikan isi halaman lain.

| Halaman | Tinggi px | Teks <11px | Target <40px | Overflow halaman | Temuan dan saran | Bukti |
| --- | --- | --- | --- | --- | --- | --- |
| /tickets | 3559 | 119 | 11 | Tidak | Eyebrow, label KPI, kategori/severity masih 9–10px. Tombol New Ticket 36px, tab 37px, filter 32px. Chip status bergeser secara internal. Naikkan label ≥11px dan kontrol ≥40/44px pada tugas halaman Tickets tersendiri. | [Screenshot](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/tickets-390.png>) |
| /monitoring | 3883 | 80 | 12 | Tidak | Label status/metadata sekitar 10px; tab filter 24px dan tombol Guide 34px. Deretan sistem bergeser secara internal. Gunakan filter 40px dan label ≥11px; rapikan tinggi kartu checkpoint. | [Screenshot](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/monitoring-390.png>) |
| /shift-log | 5289 | 74 | 31 | Tidak | Label tanggal/shift/shifter 10–10,5px, filter 38px dan tombol detail sekitar 28,5px. Daftar panjang menambah tinggi halaman. Gunakan label 11px, tombol 40/44px, dan ringkasan bertahap. | [Screenshot](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/shift-log-390.png>) |
| /reports | 3120 | 75 | 4 | Tidak | Label KPI/tabel masih kecil; tab 36px. Tabel rekap mempunyai scroll internal yang memang dibutuhkan. Gunakan tab 44px, header tabel 11px, dan prioritas kolom atau kartu ringkas. | [Screenshot](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/reports-390.png>) |
| /team-roster | 1974 | 42 | 20 | Tidak | Eyebrow, statistik dan metadata jadwal masih kecil; aksi anggota/shift di bawah 40px. Gunakan kartu anggota dengan nama penuh dan aksi 44px; batasi kolom jadwal saat sempit. | [Screenshot](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/team-roster-390.png>) |
| /master-data | 3882 | 36 | 38 | Tidak | Label 10–10,5px, breadcrumb sekitar 17px tinggi, pencarian/select 36px, tombol ikon 27px. Tab internal sekitar 641px pada viewport 390px. Gunakan tab 44px dengan petunjuk geser dan tombol ikon 40px. | [Screenshot](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/master-data-390.png>) |
| /runbooks | 1473 | 24 | 10 | Tidak | Label kategori, metadata dan kontrol tab/aksi kecil tetap berasal dari halaman Runbooks. Naikkan label ≥11px serta tab/aksi 40/44px; cek judul panjang di kartu SOP. | [Screenshot](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/runbooks-390.png>) |

Tidak ada overflow horizontal **halaman** pada tujuh halaman ini. Scroll tabel/chip internal dicatat sebagai scroll internal, bukan overflow body. Bottom nav, ruang aman FAB, pressed/focus dan deteksi keyboard berasal dari shell bersama; isi halaman tersebut tidak dirombak. Daftar panjang/tabel di Shift Log, Reports dan Master Data masih membutuhkan pekerjaan halaman tersendiri agar mengikuti tipografi Dashboard.

## Ellipsis / clamp yang disengaja

Judul panel terlihat utuh. Judul tiket tetap line-clamp dua baris dengan title penuh; meta memiliki title kategori dan nama. Monitoring tetap satu baris truncate sesuai permintaan, dengan title tugas penuh dan catatan NOK, serta aria-label tombol status yang juga menyebut tugas lengkap. Nama/jabatan staf mempunyai title dan membuka Detail lewat kartu. Memo mempunyai title penuh dan tombol View.

Elemen yang benar-benar terpotong pada pengukuran tiap telepon:

| Viewport | Teks/komponen | Nilai penuh / akses |
| --- | --- | --- |
| 320px | • Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi. • Antrean ActiveMQ broker #228 masih dalam bata | • Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi. • Antrean ActiveMQ broker #228 masih dalam batas investigasi failover. • Jadwal checklist checkpoint berikutnya pukul 06:30 WIB (USIEM & SM). • Status failover DR cluster standby normal tanpa kendala. |
| 320px | Health check gateway B2B sekunder | Health check gateway B2B sekunder |
| 320px | Queue distributor check & routing | Queue distributor check & routing |
| 320px | Graylog indexer rate & pipeline buffer | Graylog indexer rate & pipeline buffer |
| 320px | Broker health check broker #228 | Broker health check broker #228 — Antrean naik |
| 320px | Validation worker cluster FMC | Validation worker cluster FMC |
| 320px | Andri Agung Exaudi Sigiro | Andri Agung Exaudi Sigiro |
| 360px | • Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi. • Antrean ActiveMQ broker #228 masih dalam bata | • Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi. • Antrean ActiveMQ broker #228 masih dalam batas investigasi failover. • Jadwal checklist checkpoint berikutnya pukul 06:30 WIB (USIEM & SM). • Status failover DR cluster standby normal tanpa kendala. |
| 360px | Health check gateway B2B sekunder | Health check gateway B2B sekunder |
| 360px | Queue distributor check & routing | Queue distributor check & routing |
| 360px | Graylog indexer rate & pipeline buffer | Graylog indexer rate & pipeline buffer |
| 360px | Broker health check broker #228 | Broker health check broker #228 — Antrean naik |
| 360px | Validation worker cluster FMC | Validation worker cluster FMC |
| 375px | • Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi. • Antrean ActiveMQ broker #228 masih dalam bata | • Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi. • Antrean ActiveMQ broker #228 masih dalam batas investigasi failover. • Jadwal checklist checkpoint berikutnya pukul 06:30 WIB (USIEM & SM). • Status failover DR cluster standby normal tanpa kendala. |
| 375px | Health check gateway B2B sekunder | Health check gateway B2B sekunder |
| 375px | Queue distributor check & routing | Queue distributor check & routing |
| 375px | Graylog indexer rate & pipeline buffer | Graylog indexer rate & pipeline buffer |
| 375px | Broker health check broker #228 | Broker health check broker #228 — Antrean naik |
| 375px | Validation worker cluster FMC | Validation worker cluster FMC |
| 390px | • Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi. • Antrean ActiveMQ broker #228 masih dalam bata | • Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi. • Antrean ActiveMQ broker #228 masih dalam batas investigasi failover. • Jadwal checklist checkpoint berikutnya pukul 06:30 WIB (USIEM & SM). • Status failover DR cluster standby normal tanpa kendala. |
| 390px | Health check gateway B2B sekunder | Health check gateway B2B sekunder |
| 390px | Queue distributor check & routing | Queue distributor check & routing |
| 390px | Graylog indexer rate & pipeline buffer | Graylog indexer rate & pipeline buffer |
| 390px | Broker health check broker #228 | Broker health check broker #228 — Antrean naik |
| 412px | • Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi. • Antrean ActiveMQ broker #228 masih dalam bata | • Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi. • Antrean ActiveMQ broker #228 masih dalam batas investigasi failover. • Jadwal checklist checkpoint berikutnya pukul 06:30 WIB (USIEM & SM). • Status failover DR cluster standby normal tanpa kendala. |
| 412px | Health check gateway B2B sekunder | Health check gateway B2B sekunder |
| 412px | Graylog indexer rate & pipeline buffer | Graylog indexer rate & pipeline buffer |
| 412px | Broker health check broker #228 | Broker health check broker #228 — Antrean naik |
| 430px | • Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi. • Antrean ActiveMQ broker #228 masih dalam bata | • Pantau koneksi gateway B2B sekunder menjelang lonjakan transaksi pagi. • Antrean ActiveMQ broker #228 masih dalam batas investigasi failover. • Jadwal checklist checkpoint berikutnya pukul 06:30 WIB (USIEM & SM). • Status failover DR cluster standby normal tanpa kendala. |

## Verifikasi dan batas hasil

- Typecheck dan build akhir lulus: [typecheck](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/final-typecheck.log>) · [build](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/final-build.log>).
- Lint penuh **belum lulus**: baseline 203 error / 26 warning; akhir 203 error / 26 warning. Error baru menurut perbandingan file/rule/pesan tanpa nomor baris: **0**. Tidak ada penonaktifan aturan lint. [Perbandingan](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/checks.json>) · [lint lengkap](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/final-lint.json>).
- Tiga tes geometri lulus, termasuk semua sudut plot, tabrakan label SLA dan ruang yang tidak cukup: [hasil](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/geometry-tests.log>).
- 10/10 kelompok pengujian browser lulus: scroll horizontal touch native, sumbu tetap, isolasi legenda, tooltip kedua tepi, keyboard grafik, segmented/tab, FAB arah/idle/fokus, visualViewport, pressed/focus/reduced motion dan landscape. [interaksi](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/interactions.json>).
- 20 siklus sheet cepat dan 20 siklus memo berhasil; viewer dan detail staf juga ditutup tanpa sisa overflow hidden, inert, aria-hidden atau overlay. StrictMode: **20 siklus lulus**. [StrictMode](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/strict-mode.json>).
- Tidak ada console error/hydration error baru pada capture browser akhir (0 tercatat). Tidak ada fetch tambahan yang ditambahkan.
- Tinggi wrapper skeleton → konten sama pada 390px: Tiket Hari Ini 557→557px; Memo & Catatan Shift 78→78px; List Monitoring Shift 335.5→335.5px; Ticket Volume per Project (Stacked by System)Volume Tiket 315→315px; Rekap Tiket per User 488→488px;  404→404px; Tren Durasi Penyelesaian (Resolution Velocity)Tren Durasi 381→381px; Tren Trafik Beban per Shift (Shift Traffic Velocity)Tren Trafik 453→453px.
- **CLS nol literal belum tercapai.** Total cold load yang tercatat 0.000371034345863289; setelah splash 0.000011224805896842688. Sisa berasal dari raster/metric teks pada startup, bukan perbedaan tinggi wrapper panel. Hasil scroll mencatat 1 long task pada satu run development ini; ini bukan jaminan kinerja perangkat fisik. [pengukuran loading dan scroll](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/loading-quality.json>) · [skeleton](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/loading-390.png>).
- **Pengecualian 320px:** padding halaman 12px membuat kartu 296px dan isi 268px; persyaratan isi/kartu ≥300px bersamaan dengan padding tersebut tidak mungkin dipenuhi. Tidak dipaksakan min-width yang menimbulkan scroll halaman.
- Target sekunder: status monitoring 56×40px, legenda 40px, segmented 40px, topbar 40px. Legenda sengaja 40px, melebihi tinggi 32–36px pada spesifikasi grafik, untuk memenuhi batas target sekunder. Landscape nav 44px adalah pengecualian yang diminta.
- Grafik garis memakai touch-action pan-y. **Pengecualian Volume:** scroll native horizontal harus mengizinkan pan-x dan pan-y (touch auto/manipulation), sehingga plot dapat digeser tanpa mengunci scroll vertikal halaman; memaksa pan-y di kolom batang akan mematikan swipe horizontal. Pengujian CDP touch membuktikan scroll horizontal bekerja.
- Font kecil desktop dan target desktop dipertahankan untuk memenuhi batas perubahan desktop. Audit desktop mencatat 286 elemen teks <11px pada Dashboard; itu tidak dipromosikan menjadi perubahan desktop di tugas ini.

## Teks mobile baru

- Segmented: **Semua / Pagi / Malam / Subuh**, menggantikan prefiks Shift yang berulang pada compact. Teks desktop tetap lengkap.
- Anotasi **Lonjakan {jumlah}**; label **Target 60m** dan **Breach 90m** kini terlihat di plot mobile.
- ARIA grafik: instruksi panah kiri/kanan untuk rincian dan label area Volume yang menjelaskan geser tanggal. Label dan hitungan lain mengikuti data/perilaku yang sudah ada.

## File implementasi

| File | Perubahan |
| --- | --- |
| [frontend/app/components/tickets/TicketReportView.tsx](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/tickets/TicketReportView.tsx>) | Grid compact, ritme, daftar, pagination, grafik, tab dan ARIA. |
| [frontend/app/hooks/useScrollEdges.ts](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/hooks/useScrollEdges.ts>) | ResizeObserver dan petunjuk fade sesuai arah yang masih dapat digeser. |
| [frontend/app/components/ui/HorizontalScroll.tsx](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/ui/HorizontalScroll.tsx>) | Scroll native tanpa scrollbar untuk legenda dan chip staf. |
| [frontend/app/lib/chart-layout.ts](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/lib/chart-layout.ts>) | Penjepitan dan penghindaran tabrakan label di plot. |
| [frontend/app/hooks/useMobileChrome.ts](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/hooks/useMobileChrome.ts>) | Arah gulir, idle, visualViewport, fokus input, cleanup timer/listener. |
| [frontend/app/components/routing/AppShell.tsx](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/routing/AppShell.tsx>) | Padding 12/16px, ruang aman bawah, menghubungkan state chrome. |
| [frontend/app/components/layout/BottomNav.tsx](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/layout/BottomNav.tsx>) | Jarak 8px, badge, keyboard, landscape singkat tanpa label. |
| [frontend/app/components/ui/FloatingNewTicketButton.tsx](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/ui/FloatingNewTicketButton.tsx>) | Transisi arah gulir 200ms, tampil saat fokus, reduced motion. |
| [frontend/app/components/layout/Topbar.tsx](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/layout/Topbar.tsx>) | Slot shift/jam mobile berukuran tetap untuk mengurangi pergeseran. |
| [frontend/app/layout.tsx](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/layout.tsx>) | Pressed state, touch manipulation, tap highlight transparan dan outline keyboard 2px, termasuk portal. |
| [frontend/app/components/ui/skeleton/DashboardSkeleton.tsx](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/ui/skeleton/DashboardSkeleton.tsx>) | Bentuk lima baris dan dimensi compact mengikuti panel baru. |
| [frontend/app/components/ui/skeleton/PanelSkeletonWrapper.tsx](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/ui/skeleton/PanelSkeletonWrapper.tsx>) | Loading height responsif tanpa menambah inline layout baru. |
| [frontend/app/components/dashboard/MemoModal.tsx](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/dashboard/MemoModal.tsx>) | Lifecycle fokus stabil saat parent merender ulang dan focus return tanpa scroll. |
| [frontend/app/components/dashboard/panel-viewer/PanelViewer.tsx](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/dashboard/panel-viewer/PanelViewer.tsx>) | Lifecycle fokus viewer stabil dan cleanup saat ditutup. |
| [frontend/app/styles/tailwind/responsive.css](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/styles/tailwind/responsive.css>) | Hanya menghapus aturan padding dan hidden annotation yang sudah digantikan; tidak menambah CSS. |
| [frontend/tests/mobile-chart-layout.test.mjs](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/tests/mobile-chart-layout.test.mjs>) | Tiga pengujian batas plot dan tabrakan label. |

Source QA dan semua bukti disimpan di output/mobile-round2 dan .codex-tmp/r2-*. Tidak ada commit, publish atau perubahan backend.

## Bukti tambahan

Swipe turun menutup sheet; sesudahnya PageDown menggulir ke y=64 dan gesture sentuh ke y=882, tanpa overflow lock atau inert tersisa. [Pengujian scroll keyboard/touch](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/scroll-modes.json>).

Tahap 1: [screenshot 390px](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/stage1/dashboard-390.png>) · [typecheck](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/stage1-typecheck.log>) · [lint](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/stage1-lint.json>) · [build](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/stage1-build.log>).

Tahap 2: [screenshot 390px](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/stage2/dashboard-390.png>) · [typecheck](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/stage2-typecheck.log>) · [lint](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/stage2-lint.json>) · [build](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/stage2-build.log>).

Tahap 3: [screenshot 390px](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/after/dashboard-390.png>) · [typecheck](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/stage3-typecheck.log>) · [lint](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/stage3-lint.json>) · [build](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/stage3-build.log>).

Tahap 4/akhir: [screenshot 390px](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/delivery/dashboard-390.png>) · [typecheck](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/final-typecheck.log>) · [lint](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/final-lint.json>) · [build](<E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-round2/final-build.log>). Kegagalan lint sementara selama iterasi telah dibandingkan dengan baseline; hasil akhir tidak menambah error maupun warning.
