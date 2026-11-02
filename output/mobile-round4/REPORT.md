Enam perbaikan Dashboard dan Panel Viewer — 27 Oktober 2026

Perubahan A–F sudah diterapkan di localhost:3000. Pilihan Anda dipakai: tujuh baris kategori boleh tumbuh pada layar besar agar panel terisi. Lima staf pada kartu rekap compact dari pekerjaan sebelumnya tetap dipertahankan. Tidak ada commit atau dependency baru.

**Diagnosis dan hasil implementasi**

A. Ikon filter sebelumnya berada sebagai SVG absolut di luar tombol Select. Latar tombol yang opaque menutup ikon tersebut; padding dan font dari pemanggil juga berbeda-beda. Inventaris menemukan 62 tempat pemakaian Select/MultiSelect dan 20 ikon luar yang perlu dipindahkan. Semua 20 ikon sekarang menjadi bagian flex trigger. Ikon, teks, dan chevron memiliki ruang sendiri: 16px / min-width 0 + flex 1 / 16px, gap 8px, padding horizontal 12px. Ikon tidak lagi memakai posisi absolut.

Font yang diukur dari tanggal/Proyek sebelum perubahan adalah 11,5px dengan bobot 400. Nilai ini sekarang konsisten pada single-select, multi-select, tanggal, dan klien. Tinggi desktop 34px; layar sentuh/mobile 44px. Audit akhir mencakup 309 sampel kontrol dalam 56 kombinasi halaman/form/state: font 11,5px, bobot 400, gap ikon–teks 8px, tanpa overlap. Ikon/chevron default slate #94a3b8 dan nilai aktif sky #38bdf8. Chevron berputar ketika terbuka. Nilai panjang terpotong dengan ellipsis dan tersedia lewat title. Ringkasan Shifter memakai “Semua Shifter (14)” atau “Tahan J. +1”.

Override lama khusus DatePicker di Reports terbukti memaksa tinggi 32/40px melalui utilitas important. Override pemanggil itu dihapus agar Reports mengikuti ukuran bersama 34/44px. File CSS lama tidak diubah. Uji mencakup Dashboard, Tiket, Monitoring, Catatan Shift, Reports, Roster, Master Data, Notifikasi, form tiket serta modal klien/proyek/sistem, termasuk kontrol disabled yang sesungguhnya pada Ubah proyek. Kontrol yang semula tidak memiliki ikon bisnis tetap memakai struktur nilai dan chevron yang sama. Bukti: [inventaris](select-inventory.json), [pengukuran kontrol](controls-test.json), [interaksi Select](select-tests.json), [disabled dan Memo](memo-disabled-tests.json).

B. Dashboard mengambil keterangan NOK dari issueNote pada DEFAULT_MONITORING_ITEMS dan penyimpanan ctd_shift_monitoring_checklist. Pada versi ini sumber itu terpisah dari assessments.note di halaman Monitoring; hubungan langsung yang diduga dalam permintaan tidak ditemukan. Penghapusan hanya dilakukan pada JSX subbaris Dashboard. Field, nilai tersimpan, dan halaman Monitoring tidak diubah. Catatan NOK khusus yang ditanam untuk pengujian tetap identik setelah render. Rel merah, latar, tombol NOK, serta label pembaca layar “&lt;judul&gt;, NOK” tetap ada. Baris OK dan NOK sama-sama 40px di desktop dan 46px di mobile; tombol status mobile 44px. Bukti: [uji data, urutan, dan geometri](mobile-test.json).

C. Donut viewer sebelumnya memakai kotak 300px tetapi lingkaran yang benar-benar terlihat hanya 246px. Panel kanan dibatasi max-width 768px dan dipusatkan/direnggangkan sehingga ada celah besar di tengah. Viewer kini memakai grid desktop 5:7, gap 16px, padding panel 24px, batas badan sekitar 1920px dan tinggi yang mengisi viewport. Pembatas panel kanan lama dihapus. Donut terukur dengan ResizeObserver dan rAF, cincin 16% diameter, legenda chip, angka tengah yang mengikuti sorotan, serta interaksi bersama dari segmen, legenda, kartu, dan baris.

| Viewport | Diameter donut aktual | Tinggi baris kategori | Tinggi baris tabel severity |
| --- | ---: | ---: | ---: |
| 2560×1440 | 520px | 161,4px | 62,25px |
| 1920×1080 | 520px | 110px | 60,25px |
| 1440×900 | 511px | 84,3px | 46,75px |
| 1366×768 | 438px | 65,4px | 44px |
| 1024×768 | 337px | 65,4px | 44px |
| 768×1024 | 300px | 76px | 44px |
| 390×844 | 220px | 76px | 44px |
| 844×390 | 300px | 76px | 44px |

Severity memakai empat kartu, angka 40px, share bar 8px, rasio bertumpuk 14px dengan label persen, dan tabel dengan Total di dasar. Kategori memakai tujuh baris yang tumbuh, peringkat, aksen teratas, angka 18px, serta share bar 10px. Panel daftar mengisi tinggi; header tetap dan daftar dapat menggulir jika kategori bertambah. Pada layar sangat tinggi, donut tetap dibatasi 520px dan dipusatkan vertikal: ruang di atas/bawah kelompok donut masih ada secara sengaja karena batas diameter tersebut. Karena itu tidak diklaim bahwa setiap area kosong di panel kiri selalu di bawah 24px. Celah antarkomponen menggunakan 8–16px dan padding desktop 24px.

Sorotan menampilkan nilai/persen yang sama, opacity bagian lain 0,45, tooltip SVG, Tab/Enter/Space, dan pengurangan animasi saat reduced-motion. Fokus keyboard dapat mengambil alih item yang sudah dipilih, lalu pilihan semula kembali setelah fokus keluar. Uji mouse mengenai segmen fisik yang benar, uji sentuh memilih/membatalkan sorotan, dan rotasi 390→844 mengukur ulang diameter 220→300px. Total pada fixture tetap 88 dan angka sama dengan kartu Dashboard. Kartu compact kategori/severity tidak berubah: perbandingan piksel persis 0% pada seluruh lima ukuran desktop yang diuji. Bukti: [16 kasus distribusi](distributions-test.json), [sentuh dan orientasi](touch-test.json), [fokus setelah pilihan](focus-test.json), [pixel diff desktop](desktop-pixels.json).

D. Di bawah lg urutan visual adalah Memo → Tiket Hari Ini → Monitoring. Pembungkus kanan memakai max-lg:contents dan anak memakai order responsive; markup tidak digandakan. Urutan DOM/tab/pembaca layar tetap Tiket → Memo → Monitoring untuk menjaga desktop seperti permintaan. Ini kompromi aksesibilitas yang disengaja: urutan baca mobile berbeda dari urutan visual. Tidak ada tabindex positif; fokus tetap membawa kontrol yang dituju ke area terlihat.

Kartu Memo mobile bertambah dari 207px menjadi 287px; area pratinjau 176px dengan padding 16px, aksen amber, font 14px/24px, daftar bullet asli, dan jarak poin 8px. Jendela teks 120px menampilkan hingga lima baris teks; jarak antar-poin ikut menggunakan ruang tersebut. Fade dan “Selengkapnya” hanya tampil saat hasil pengukuran benar-benar terpotong. Memo singkat tidak menampilkan aksi tersebut; memo kosong menampilkan “Belum ada catatan” dan “Tulis” setinggi 44px di dalam target kartu. Ketuk membuka modal yang sama dan isi mentah penyimpanan tetap identik. Skeleton mengikuti urutan dan ukuran baru. Bukti: [uji mobile](mobile-test.json), [kasus Memo](memo-disabled-tests.json), [skeleton](loading-390.png), [geometri saat loading](loading-quality.json).

E. Trigger jumlah mobile kini hanya “15”, menu berjudul “Tampilkan”, opsi “10”, “15”, “25”, “Semua”. Kelompok sebelumnya/halaman/berikutnya di kiri dan Select di kanan sama-sama memiliki tinggi 44px. Lebar Select aktual 92px agar ikon 16px, dua gap 8px, teks, chevron 16px, padding 24px, dan border muat. Ukuran sekitar 72px yang diminta sebagai perkiraan tidak cukup untuk geometri A tersebut. Nilai dan perilaku pagination sama. Segmented desktop identik dalam pixel diff.

F. Rekap lama di 390px memiliki tabel 714,53px dalam wadah 364px; kolom staf sticky sendiri 301,11px. Ini meninggalkan ruang terlalu sempit untuk angka dan memaksa gulir horizontal. Pada kondisi awal yang diuji, scrollLeft 0 dan kolom pertama mulai x=13px, sehingga margin negatif atau potongan kiri pada screenshot tidak berhasil direproduksi. Wadah main bersama ditambahkan min-w-0 agar anak flex/grid dapat menyusut sesuai lebar. Rekap pada <768px, atau pointer coarse dengan lebar <1024px, kini merender daftar kartu sebagai satu cabang DOM; desktop tetap memakai tabel aslinya dengan sumber data dan callback yang sama.

Header mobile 52px, tombol kembali/tutup 44px, strip statistik 96px (48px di landscape pendek), pencarian 44px, empat chip urutan 44px, avatar 40px, dan baris staf 68px. Footer Total 56px ditambah safe-area berada di luar scroller sehingga tidak menutupi baris terakhir. Seluruh teks baru minimal 11px. Ketuk staf membuka satu rincian dengan tiga KPI, chip sistem hari ini, dan Detail 44px. Animasi ekspansi 150ms dinonaktifkan pada reduced-motion. “(On Leave)” hanya ditampilkan sebagai chip “Cuti”; data jabatan dan pencarian sumber tetap asli. Saat urutan Nama aktif, metrik kanan tetap Hari ini karena nama bukan nilai numerik.

Seluruh 14 staf dibandingkan dengan tabel desktop: urutan default dan setiap nilai identik, total Hari ini 33 / Bulan 617 / Tahun 3415. Semua empat urutan diuji dua arah; pencarian Tahan tetap 0 / 38 / 245. Ekspansi tunggal, pencarian kosong/reset, Detail, Tab di modal anak, Escape yang menutup modal anak lebih dulu, dan pemulihan fokus lulus. Simulasi visualViewport saat keyboard membuka/menutup menyembunyikan dan mengembalikan footer. Delapan ukuran mobile tidak memiliki overflow horizontal atau teks di bawah 11px. Bukti: [uji Rekap](recap-test.json), [StrictMode 20 siklus](strict-mode.json).

**Audit viewer tabel lain pada 390px**

| Viewer | Lebar tabel / wadah | Kolom pertama | Temuan dan saran |
| --- | ---: | ---: | --- |
| Volume, mode Tabel | 699,27 / 364px | 111,20px | Gulir horizontal diperlukan; pertimbangkan kartu atau kolom prioritas dan petunjuk geser. |
| Perbandingan bulan, Tabel | 577,64 / 364px | 204,81px | Kolom nama cukup lebar; pertimbangkan tampilan kartu/ringkas dengan petunjuk geser. |
| Tren durasi | 385,42 / 364px | 104px | Overflow sekitar 21px; pertimbangkan prioritas kolom atau petunjuk geser. |
| Trafik shift | 390,41 / 364px | 111,20px | Overflow sekitar 26px; pertimbangkan prioritas kolom atau petunjuk geser. |

Keempat kolom pertama sticky berada pada x=13px dan scrollLeft 0 saat dibuka. Tidak ditemukan penyebab pemotongan kiri bersama yang memerlukan perubahan tambahan pada tabel-tabel ini. Data dan susunan kolom dibiarkan. Bukti: [ukuran lengkap](other-viewers-audit.json) dan gambar pada tabel screenshot di bawah.

**Verifikasi dan batas hasil**

- Typecheck akhir: lulus, exit 0 — [log](final-typecheck.log).
- Build akhir: lulus, exit 0 — [log](final-build.log), [exit](build-exit.txt). Vinext masih memberi pemberitahuan klasifikasi route statis yang memang ada pada build.
- Lint dijalankan pada setiap tahap A, B, C, D–E, F, dan akhir. Baseline maupun akhir tetap 179 error dan 26 warning; perbandingan temuan menunjukkan nol tambahan. Jadi lint proyek belum bersih — [audit sumber](source-audit.json), [hasil akhir](final-lint.json), [baseline](baseline-lint.json).
- Pixel diff: 40 panel desktop pada 1024, 1366, 1440, 1920, 2560px, meliputi Today, Memo, Volume, Rekap compact, Kategori compact, Severity compact, Durasi, Trafik. Seluruhnya 0% perbedaan persis, ukuran dan posisi sama; Monitoring dikecualikan karena perubahan B. [Hasil](desktop-pixels.json).
- Delapan ukuran mobile: 320×568, 360×740, 375×667, 390×844, 412×915, 430×932, 768×1024, 844×390. Sembilan kasus Dashboard termasuk desktop 1920 lulus: urutan, memo, jumlah tampil, baris OK/NOK setinggi sama, penyimpanan utuh, dan overflow halaman nol. [Hasil](mobile-test.json).
- Select: keyboard/typeahead/group navigation, Home/End/Page, pencarian panjang, multi-select, custom PIC, Tab/Escape, klik luar, sheet bersarang dan 20 siklus cepat lulus. Panel Viewer juga diuji React.StrictMode 20 siklus. Tidak ada console error atau hydration warning baru pada kolektor uji. [Select](select-tests.json), [StrictMode](strict-mode.json), [galeri](after.json).
- Posisi dan tinggi delapan panel mobile sama persis antara skeleton dan data. Pengukuran cold load merekam CLS total 0,000188612, termasuk 0,000177387 saat splash dan 0,000011225 setelah splash pada area teks topbar. Tidak ada perpindahan geometri panel; hasil ini tetap bukan CLS total 0. Font web menggunakan display=swap yang sudah ada. [Data mentah](loading-quality.json).
- Pemeriksaan ARIA, keyboard, mouse, sentuh Chromium, reduced-motion, dan visualViewport dilakukan otomatis. NVDA/VoiceOver serta keyboard virtual di perangkat fisik belum diuji manual; emulasi visualViewport bukan pengujian perangkat sesungguhnya.
- Paket, lockfile, konfigurasi lint, konfigurasi Vite asli, serta kedua plugin build yang terbuka di IDE tidak diubah. Hanya utilitas Tailwind yang ditambahkan; tanpa file CSS baru dan tanpa important baru. Inline style baru hanya diameter donut dinamis. Seluruh perubahan dibandingkan dengan snapshot awal pekerjaan ini agar modifikasi pengguna sebelumnya tidak tertimpa. [Daftar sumber](source-audit.json).

**Teks yang ditambahkan atau disesuaikan**

- Filter: “Semua Shifter (&lt;jumlah&gt;)”, “&lt;nama singkat&gt; +&lt;jumlah&gt;”; title tetap berisi nilai lengkap.
- Aksesibilitas Monitoring: “Checklist monitoring shift”, “&lt;judul&gt;, &lt;status&gt;”.
- Distribusi: “Total tiket”, “Terbanyak”, “Kategori”, “Rata-rata / tipe”, “Tiket · Persen”, “Rasio severity”, “Severity”, “Tiket”, “Persen”, “Total”, “Tidak ada data”; label/title segmen “&lt;nama&gt;: &lt;nilai&gt; tiket, &lt;persen&gt;%”; label tengah “&lt;nama&gt; · &lt;persen&gt;%”; “Legenda distribusi”, “Distribusi tiket; pilih segmen untuk sorotan”, “Rincian severity”, “Bar rasio severity”. Beberapa label tersebut digunakan kembali dari tampilan sebelumnya.
- Memo: “Belum ada catatan”, “Tulis”, “Selengkapnya”; label aksi “Buka memo dan catatan shift lengkap” / “Tulis memo dan catatan shift”.
- Pagination mobile: “Tampilkan”, angka pilihan tanpa “/hal.”, “Semua”.
- Rekap: “Rekap per User”, “Staf”, “Hari ini”, “Bulan”, “Tahun”, “Nama”, “Cari staf…”, “Cuti”, “Menampilkan &lt;hasil&gt; dari &lt;jumlah&gt;”, “Bulan ini”, “Tahun ini”, “Sistem hari ini”, “Detail”, “Total”, “Tidak ditemukan”, “Hapus pencarian”. Label ARIA mencakup “Cari nama atau peran staf”, “Urutan staf”, “Urutkan &lt;metrik&gt;, menaik/menurun”, “&lt;nama&gt;, &lt;metrik&gt; &lt;nilai&gt;, perluas/ringkas”, “Detail &lt;nama&gt;”, “Total keseluruhan”.

**Screenshot sebelum dan sesudah**

Gambar memakai data dan waktu uji yang sama. Perbandingan “sebelum” berasal dari snapshot sebelum A–F, termasuk lima ukuran ponsel tambahan yang dirender pada server referensi terpisah. Server referensi telah dihentikan; dev server utama tetap berjalan.

| Viewport | Dashboard sebelum | Dashboard sesudah | Rekap sebelum | Rekap sesudah |
| --- | --- | --- | --- | --- |
| 320×568 | [gambar](before/dashboard-320.png) | [gambar](after/dashboard-320.png) | [gambar](before/user-recap-320.png) | [gambar](recap/default-320.png) |
| 360×740 | [gambar](before/dashboard-360.png) | [gambar](after/dashboard-360.png) | [gambar](before/user-recap-360.png) | [gambar](recap/default-360.png) |
| 375×667 | [gambar](before/dashboard-375.png) | [gambar](after/dashboard-375.png) | [gambar](before/user-recap-375.png) | [gambar](recap/default-375.png) |
| 390×844 | [gambar](before/dashboard-390.png) | [gambar](after/dashboard-390.png) | [gambar](before/user-recap-390.png) | [gambar](recap/default-390.png) |
| 412×915 | [gambar](before/dashboard-412.png) | [gambar](after/dashboard-412.png) | [gambar](before/user-recap-412.png) | [gambar](recap/default-412.png) |
| 430×932 | [gambar](before/dashboard-430.png) | [gambar](after/dashboard-430.png) | [gambar](before/user-recap-430.png) | [gambar](recap/default-430.png) |
| 768×1024 | [gambar](before/dashboard-768.png) | [gambar](after/dashboard-768.png) | [gambar](before/user-recap-768.png) | [gambar](recap/default-768.png) |
| 844×390 | [gambar](before/dashboard-844.png) | [gambar](after/dashboard-844.png) | [gambar](before/user-recap-844.png) | [gambar](recap/default-844.png) |
| 1024×768 | [gambar](before/dashboard-1024.png) | [gambar](after/dashboard-1024.png) | [gambar](before/user-recap-1024.png) | [gambar](after/user-recap-1024.png) |
| 1366×768 | [gambar](before/dashboard-1366.png) | [gambar](after/dashboard-1366.png) | [gambar](before/user-recap-1366.png) | [gambar](after/user-recap-1366.png) |
| 1440×900 | [gambar](before/dashboard-1440.png) | [gambar](after/dashboard-1440.png) | [gambar](before/user-recap-1440.png) | [gambar](after/user-recap-1440.png) |
| 1920×1080 | [gambar](before/dashboard-1920.png) | [gambar](after/dashboard-1920.png) | [gambar](before/user-recap-1920.png) | [gambar](after/user-recap-1920.png) |
| 2560×1440 | [gambar](before/dashboard-2560.png) | [gambar](after/dashboard-2560.png) | [gambar](before/user-recap-2560.png) | [gambar](after/user-recap-2560.png) |

| Viewport | Kategori sebelum | Kategori sesudah | Severity sebelum | Severity sesudah |
| --- | --- | --- | --- | --- |
| 2560×1440 | [gambar](before/category-distribution-2560.png) | [gambar](distributions/category-2560.png) | [gambar](before/severity-distribution-2560.png) | [gambar](distributions/severity-2560.png) |
| 1920×1080 | [gambar](before/category-distribution-1920.png) | [gambar](distributions/category-1920.png) | [gambar](before/severity-distribution-1920.png) | [gambar](distributions/severity-1920.png) |
| 1440×900 | [gambar](before/category-distribution-1440.png) | [gambar](distributions/category-1440.png) | [gambar](before/severity-distribution-1440.png) | [gambar](distributions/severity-1440.png) |
| 1366×768 | [gambar](before/category-distribution-1366.png) | [gambar](distributions/category-1366.png) | [gambar](before/severity-distribution-1366.png) | [gambar](distributions/severity-1366.png) |
| 1024×768 | [gambar](before/category-distribution-1024.png) | [gambar](distributions/category-1024.png) | [gambar](before/severity-distribution-1024.png) | [gambar](distributions/severity-1024.png) |
| 768×1024 | [gambar](before/category-distribution-768.png) | [gambar](distributions/category-768.png) | [gambar](before/severity-distribution-768.png) | [gambar](distributions/severity-768.png) |
| 390×844 | [gambar](before/category-distribution-390.png) | [gambar](distributions/category-390.png) | [gambar](before/severity-distribution-390.png) | [gambar](distributions/severity-390.png) |
| 844×390 | [gambar](before/category-distribution-844.png) | [gambar](distributions/category-844.png) | [gambar](before/severity-distribution-844.png) | [gambar](distributions/severity-844.png) |

| Filter | Sebelum | Sesudah default | Sesudah aktif | Sesudah terbuka |
| --- | --- | --- | --- | --- |
| 1920 | [gambar](before/filters-1920.png) | [gambar](controls/filters-default-1920.png) | [gambar](controls/filters-active-1920.png) | [gambar](controls/filters-open-1920.png) |
| 1440 | [gambar](before/filters-1440.png) | [gambar](controls/filters-default-1440.png) | [gambar](controls/filters-active-1440.png) | [gambar](controls/filters-open-1440.png) |
| 1024 | [gambar](before/filters-1024.png) | [gambar](controls/filters-default-1024.png) | [gambar](controls/filters-active-1024.png) | [gambar](controls/filters-open-1024.png) |
| 390, sheet | [gambar](before/filters-390.png) | [gambar](controls/filters-default-390.png) | [gambar](controls/filters-active-390.png) | [gambar](controls/filters-open-390.png) |

Kasus tambahan: [Memo singkat](scenarios/memo-short-390.png), [Memo panjang](scenarios/memo-long-390.png), [Memo kosong](scenarios/memo-empty-390.png), [disabled desktop](scenarios/disabled-1920.png), [disabled mobile](scenarios/disabled-390.png), [Rekap mengembang](scenarios/recap-expanded-390.png), [pencarian Tahan](scenarios/recap-search-390.png), [Volume Tabel](viewer-audit/ticket-volume-table-390.png), [MoM Tabel](viewer-audit/ticket-mom-table-390.png), [Durasi Tabel](viewer-audit/resolution-trend-table-390.png), [Trafik Tabel](viewer-audit/shift-traffic-table-390.png).

**File implementasi yang berubah pada pekerjaan ini**

Daftar ini dibandingkan dengan snapshot awal round 4, bukan seluruh git diff yang juga berisi pekerjaan pengguna sebelumnya. Helper pengukuran berada di .codex-tmp/r4-* dan artefak QA berada di folder laporan ini.

<!-- implementation-files -->

| File | Perubahan |
| --- | --- |
| [frontend/app/components/dashboard/MemoPreview.tsx](../../frontend/app/components/dashboard/MemoPreview.tsx) | Pratinjau 176px, daftar bullet, pengukuran clipping dan kondisi kosong. |
| [frontend/app/components/dashboard/panel-viewer/CategoryDistributionView.tsx](../../frontend/app/components/dashboard/panel-viewer/CategoryDistributionView.tsx) | Grid viewer, statistik, daftar kategori yang mengisi tinggi dan sorotan. |
| [frontend/app/components/dashboard/panel-viewer/DistributionDonut.tsx](../../frontend/app/components/dashboard/panel-viewer/DistributionDonut.tsx) | Baru: donut terukur, legenda, stat dan interaksi bersama khusus viewer. |
| [frontend/app/components/dashboard/panel-viewer/PanelViewer.tsx](../../frontend/app/components/dashboard/panel-viewer/PanelViewer.tsx) | Wadah min-w-0, header mobile, fokus dan dukungan modal Detail bersarang. |
| [frontend/app/components/dashboard/panel-viewer/SeverityDistributionView.tsx](../../frontend/app/components/dashboard/panel-viewer/SeverityDistributionView.tsx) | Grid viewer, kartu 2×2, rasio dan tabel severity. |
| [frontend/app/components/dashboard/panel-viewer/UserRecapMobile.tsx](../../frontend/app/components/dashboard/panel-viewer/UserRecapMobile.tsx) | Baru: daftar staf mobile, ekspansi, footer dan deteksi keyboard. |
| [frontend/app/components/dashboard/panel-viewer/UserRecapView.tsx](../../frontend/app/components/dashboard/panel-viewer/UserRecapView.tsx) | Cabang mobile memakai data/sort yang sama; tabel desktop dipertahankan. |
| [frontend/app/components/handover/HandoverHistoryControls.tsx](../../frontend/app/components/handover/HandoverHistoryControls.tsx) | Migrasi ikon filter luar ke prop icon. |
| [frontend/app/components/handover/HandoverWizard.tsx](../../frontend/app/components/handover/HandoverWizard.tsx) | Migrasi ikon filter luar ke prop icon. |
| [frontend/app/components/layout/ClientSwitcher.tsx](../../frontend/app/components/layout/ClientSwitcher.tsx) | Ruang kode klien, ikon dan chevron di mobile. |
| [frontend/app/components/reports/ReportPdfPreview.tsx](../../frontend/app/components/reports/ReportPdfPreview.tsx) | Migrasi ikon filter luar ke prop icon. |
| [frontend/app/components/tickets/TicketReportView.tsx](../../frontend/app/components/tickets/TicketReportView.tsx) | Ikon filter, ringkasan Shifter, NOK UI/ARIA, urutan mobile dan pager. |
| [frontend/app/components/ui/DatePicker.tsx](../../frontend/app/components/ui/DatePicker.tsx) | Struktur flex kalender–nilai–chevron dan geometri kontrol bersama. |
| [frontend/app/components/ui/select-styles.ts](../../frontend/app/components/ui/select-styles.ts) | Ukuran, font, padding, warna, focus dan state bersama. |
| [frontend/app/components/ui/Select.tsx](../../frontend/app/components/ui/Select.tsx) | Struktur single/multi-select serta normalisasi override geometri pemanggil. |
| [frontend/app/components/ui/skeleton/DashboardSkeleton.tsx](../../frontend/app/components/ui/skeleton/DashboardSkeleton.tsx) | Urutan dan ukuran placeholder Memo/Monitoring mobile. |
| [frontend/app/components/views/NotificationsView.tsx](../../frontend/app/components/views/NotificationsView.tsx) | Migrasi ikon filter luar ke prop icon. |
| [frontend/app/components/views/ReportsView.tsx](../../frontend/app/components/views/ReportsView.tsx) | Migrasi ikon; hapus override important DatePicker khusus Reports. |
| [frontend/app/components/views/TeamRosterView.tsx](../../frontend/app/components/views/TeamRosterView.tsx) | Migrasi ikon filter luar ke prop icon. |
| [frontend/app/components/views/TicketsView.tsx](../../frontend/app/components/views/TicketsView.tsx) | Migrasi ikon filter luar ke prop icon. |
| [frontend/app/hooks/useMobileLayout.ts](../../frontend/app/hooks/useMobileLayout.ts) | Breakpoint narrow touch khusus pemilihan tampilan Rekap. |

Tambahan verifikasi keluar viewer: 16 kombinasi mobile/desktop, kategori/Rekap, Escape/kembali/tutup/browser Back lulus. Pada halaman yang memiliki overflow dokumen, roda dan PageDown bekerja; delapan kasus mobile juga lulus gestur sentuh. Halaman Tiket desktop yang dituju oleh Back muat dalam viewport, sehingga pergerakan scroll dokumen tidak berlaku pada dua kasus itu. Overflow html/body pulih, inert 0, aria-hidden pada app-root tidak tertinggal. Browser Back mengikuti perilaku URL replace yang sudah ada dan kembali ke halaman atau filter sebelumnya, bukan menambah riwayat panel baru. [Hasil](exit-tests.json).
