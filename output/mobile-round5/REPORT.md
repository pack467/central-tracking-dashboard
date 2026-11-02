Desain ulang panel operasional mobile — 27 Oktober 2026

Memo & Catatan Shift, Tiket Hari Ini, dan header List Monitoring Shift sudah diperbarui untuk lebar di bawah 1024px. Memo tetap paling atas. Desktop, sumber data, perhitungan, filter, URL, dan penyimpanan memo dipertahankan. Tidak ada commit.

Cakupan pekerjaan hanya frontend. Tidak ada file backend yang diubah, perintah backend yang dijalankan, atau migrasi database. Rencana Master Data tidak dieksekusi.

**Diagnosis sebelum perubahan**

Pada 390px, Tiket Hari Ini menampilkan lima kartu terpisah, masing-masing 100px, dengan jarak 8px. Ada latar, border, dan rel kiri pada setiap tiket di dalam panel. Judul berukuran 14px dengan leading 16px; metadata 11px. Severity berada di kanan atas, status di kanan bawah, project berdekatan dengan ID, sementara kategori dan nama berbagi ruang yang sempit. Baris tiket berupa div tanpa handler klik: hanya tampilan. Perilaku ini dipertahankan.

Memo berukuran 287px dengan pratinjau tetap 176px. Area teksnya 120px, font 14px/24px. Blok gelap berasal dari overlay fade selebar area teks, setinggi 20px, yang memang memiliki linear-gradient. Warna akhir slate-950 dengan alpha 0,9 jauh lebih gelap daripada kotak berlatar slate-950 alpha 0,4. Jadi masalahnya bukan gradasi yang hilang, melainkan warna gradasi yang tidak menyatu dengan kotak. “Selengkapnya” hanya berupa span 16px di luar area teks. Aksen vertikal amber 3px adalah border kiri; bullet native belum memiliki ukuran bulat 6px yang tegas.

Header Tiket/Memo/Monitoring masing-masing 53/77/73px, ikon 15/14/14px tanpa ubin. Padding ponsel terukur 12px 14px. Aturan legacy tanpa layer pada .report-panel-heading dan .today-ticket-meta mengalahkan utilitas responsif untuk padding/gap. Selector header masih digunakan panel lain, sehingga CSS tersebut tidak dihapus. Tiga header dalam cakupan kini memakai penanda data dan utilitas sendiri. [Pengukuran diagnosis](diagnosis.json), [snapshot awal](before.json).

**Keputusan desain dan implementasi**

- Tiket menjadi daftar datar, tanpa rel kiri, latar kartu per tiket, atau border kotak sendiri. Pemisah hanya di bawah baris dan hilang pada baris terakhir yang terlihat. Severity ditandai badge dengan titik 6px; rel penuh tidak diperlukan karena badge berada di awal setiap baris.
- Susunan tiga baris: severity + status dan ID di kanan; judul dua baris 15px/20,25px; lalu project, kategori, avatar 22px dan nama. Padding 14px vertikal/16px horizontal, gap antarlapis 8px, badge 22px dengan teks 11px semibold, metadata 12px. Nama dibatasi 45% lebar isi baris. Kategori disembunyikan di bawah 360px; ID/nama/kategori memakai ellipsis dan title, judul memakai clamp dua baris dan title.
- Empat tiket tampil saat ringkas. “Lihat semua (33)” memakai animasi tinggi/padding/opacity 200ms pada baris yang sama, tanpa salinan daftar. Mode penuh tetap menampilkan seluruh antrean seperti sebelumnya; pagination kembali terlihat saat diringkas. Urutan, ukuran halaman 10/15/25/Semua, nilai URL, dan aksi pagination tidak berubah.
- Tidak ada aksi ketuk baru pada tiket. Ketuk baris tetap tidak membuka detail atau mengubah URL. Tombol ekspansi/pagination dan kartu Memo mempertahankan interaksi masing-masing.
- Memo memakai kotak slate #0f172a alpha 0,6, border slate-700 alpha 0,5, radius 12px, padding 14px, aksen kiri amber hanya saat berisi, teks 14px/22,4px, serta bullet bulat 6px dengan indent 16px dan gap 8px. Wadah pratinjau dibatasi empat line-height (89,6px), bukan setiap poin.
- Fade 24px hanya muncul ketika scrollHeight lebih besar daripada clientHeight. Warna akhirnya dihitung dari campuran dua warna panel yang sudah ada agar sama dengan latar kotak; tidak ada strip gelap solid. “Selengkapnya” berada di footer dalam kotak dengan area tinggi 44px dan chevron. Seluruh kotak tetap satu tombol untuk membuka View, sehingga tidak ada tombol bersarang. Memo singkat tidak menyisakan ruang footer kosong. Memo kosong memakai border putus-putus, ikon, “Belum ada catatan”, dan “Tulis” 44px.
- Pengukuran awal Memo dilakukan melalui callback ref saat commit, lalu diperbarui oleh ResizeObserver, rAF, dan kesiapan font. Ini menjaga ukuran saat skeleton berganti menjadi isi, termasuk satu kalimat panjang tanpa spasi. Nilai mentah memo tidak dinormalisasi di penyimpanan; pembersihan awalan bullet tetap hanya untuk tampilan.
- Header ketiga panel memakai tinggi 77px, padding 16px, ubin ikon 32px/radius 10px, ikon 16px, judul 15px semibold, dan garis pemisah halus. Panel memakai radius 16px, border #334155 alpha 0,6 dan jarak 12px. View memakai target 44px agar memenuhi batas verifikasi sentuh, dengan ikon 16px; angka sekitar 40px pada rancangan diperlakukan sebagai perkiraan. Isi Monitoring dan tinggi baris 46px dipertahankan, hanya header/padding panel yang diseragamkan.
- Satu row component menjadi kolom desktop dan susunan tiga baris mobile melalui utilitas responsif. Memo hanya merender pratinjau mobile atau textarea desktop sesuai ukuran layar. Tidak ada fetch tambahan. Key tiket, data, callback, serta perilaku modal tetap dipakai; setiap baris memperoleh role listitem dan aria-label berisi judul, severity, status. Judul ketiga panel kini h2.

Anda memilih prioritas kontras minimal 4,5:1. ID #64748b hanya menghasilkan 3,07:1 di panel #1e293b, sehingga ID mobile memakai #94a3b8. Kode DM/USIEM/MB dan teks badge dicerahkan; hue tetap dipilih dari peta PROJECT_COLORS/OPS_PRIORITY_PILL_STYLES/OPS_STATUS_PILL_STYLES yang sama. Warna titik proyek tetap asli. Uji semua kombinasi menghasilkan kontras teks minimum **4,93:1**; tidak ada teks baru di bawah 11px. Tidak ada warna proyek/severity/status baru yang dipetakan ke data.

**Hasil ukur sebelum/sesudah**

Angka berikut sama pada seluruh delapan viewport mobile yang diminta, menggunakan data uji 33 tiket yang sama.

| Elemen | Sebelum | Sesudah |
| --- | ---: | ---: |
| Tiket awal yang terlihat | 5 | 4 |
| Tinggi setiap tiket | 100px | 129,5px |
| Tinggi empat tiket termasuk jarak/pemisah | 424px | 518px |
| Tinggi daftar awal seluruhnya | 532px untuk 5 tiket | 518px untuk 4 tiket |
| Tinggi panel Tiket Hari Ini | 728px | 726px |
| Judul tiket | 14px / 16px | 15px / 20,25px |
| Metadata tiket | 11px | 12px |
| Tinggi badge | 20px | 22px |
| Avatar | 16px | 22px |
| Tinggi panel Memo, isi default | 287px | 282,59px |
| Tinggi kotak Memo, isi default | 176px | 171,59px |
| Batas area teks Memo | 120px | 89,6px |
| Leading Memo | 24px | 22,4px |
| Tinggi aksi Selengkapnya | 16px | 44px |
| Tinggi panel Monitoring | 458,5px | 466,5px |
| Header Tiket / Memo / Monitoring | 53 / 77 / 73px | 77 / 77 / 77px |
| Ikon header Tiket / Memo / Monitoring | 15 / 14 / 14px | 16 / 16 / 16px dalam ubin 32px |

Memo menyesuaikan isi agar tidak ada bidang kosong yang dipaksakan: kotak kosong 74px; satu poin singkat 52,39px; enam poin panjang atau kalimat sangat panjang 171,59px. Dengan header dan padding, panel satu poin sekitar 163px dan tetap melampaui minimum sekitar 140px. Pada kasus nyata yang diuji, tinggi saat loading dan setelah data muncul sama persis. [Ukuran dan audit header](metrics.json), [empat kasus penyimpanan](memo-integration.json).

**Verifikasi**

- Delapan viewport sentuh: 320×568, 360×740, 375×667, 390×844, 412×915, 430×932, 768×1024, 844×390. Semua lulus tanpa overflow horizontal halaman, overlap badge–ID atau project–metadata. View, Selengkapnya, ekspansi dan kontrol pagination memenuhi target minimal 44px.
- 32 kombinasi severity/status diuji pada setiap viewport (256 pemeriksaan baris), memakai judul lebih dari tiga baris, judul tanpa spasi, ID panjang, nama panjang, kategori panjang dan seluruh warna proyek. Ellipsis/clamp, dua badge 22px/11px/600, serta kontras diperiksa. Empat kondisi Memo diuji pada setiap viewport (32 pemeriksaan): kosong, satu poin, enam poin panjang, dan kalimat tanpa spasi. Fixture sintetis ini dipasang pada komponen asli dalam React.StrictMode; bukan perubahan data aplikasi. [Hasil data ekstrem](extreme-tests.json).
- Delapan pengujian integrasi Dashboard memeriksa empat baris awal, urutan halaman kedua, kembali ke halaman awal, expand 33/ringkas 4, pilihan jumlah, tap baris pasif, reduced-motion dan modal Memo. Animasi memiliki frame dengan tinggi antara keadaan ringkas dan penuh. CLS ekspansi menurut PerformanceObserver adalah 0 pada seluruh viewport. [Hasil interaksi](interaction-tests.json).
- Nol tiket diuji lewat mode mock kosong yang sudah ada: “Belum ada tiket hari ini”, area isi 388,5px, setara tiga baris. Tidak ada perubahan sumber/fungsi pengambilan data. [Screenshot](scenarios/empty-tickets-390.png).
- Empat kasus Memo sebenarnya diuji dengan localStorage terisolasi. Isi mentah tetap identik setelah render, ketuk kartu, tombol View, Tab dalam modal, tutup dan Escape. Setelah modal ditutup, roda mouse/PageDown pada delapan kasus serta gestur sentuh pada empat kasus penyimpanan bekerja. Overflow html/body pulih, inert 0 dan app-root tidak tertinggal aria-hidden. [Interaksi](interaction-tests.json), [penyimpanan dan sentuh](memo-integration.json).
- Skeleton meniru dua badge, dua garis judul, satu baris meta dan empat tiket. Memo menggunakan ukuran isi yang sama saat loading. Pada slow load, posisi dan tinggi delapan panel sama persis sebelum/sesudah data; CLS setelah splash 0. Pengukuran awal dokumen mencatat 0,000177387 saat splash, sehingga CLS seluruh cold load tidak diklaim nol. [Skeleton](loading-390.png), [data loading](loading-quality.json).
- Kolektor galeri, interaksi, data ekstrem dan penyimpanan tidak mencatat console error atau hydration warning baru pada hasil akhir. ARIA/keyboard dan sentuh diperiksa otomatis di Chromium; NVDA/VoiceOver dan perangkat fisik belum diuji manual.
- Typecheck exit 0, build exit 0. Lint exit 1: proyek tetap memiliki 179 error bawaan dan 26 warning, sama dengan baseline 179/26, tanpa temuan baru. Dua komponen MemoPreview/TodayTicketRow juga diperiksa tersendiri tanpa temuan. [Typecheck](typecheck.log), [build](build.log), [exit](check-exits.json), [audit sumber dan lint](source-audit.json).
- Package, lockfile, konfigurasi lint dan Vite tidak berubah. Empat file implementasi berubah; tidak ada CSS baru, important baru, dependency baru, atau inline style baru. Inline warna proyek lama diganti lookup utilitas literal yang tetap mengikuti peta warna Dashboard. CSS legacy tetap dipakai oleh panel di luar cakupan dan tidak dihapus.

**Desktop**

Perbandingan memakai screenshot Dashboard penuh, data dan waktu tetap yang sama. Posisi serta ukuran panel tetap identik. Hasil pada ukuran wajib:

| Viewport | Pixel diff persis | Sebelum | Sesudah |
| --- | ---: | --- | --- |
| 1024×768 | 0,22% | [gambar](before/dashboard-1024.png) | [gambar](after/dashboard-1024.png) |
| 1280×800 | 0,00% | [gambar](before/dashboard-1280.png) | [gambar](after/dashboard-1280.png) |
| 1440×900 | 0,00% | [gambar](before/dashboard-1440.png) | [gambar](after/dashboard-1440.png) |
| 1920×1080 | 0,00% | [gambar](before/dashboard-1920.png) | [gambar](after/dashboard-1920.png) |

Ambang yang diminta adalah <0,5% untuk screenshot Dashboard penuh. Pada 1024px tangkapan akhir menunggu tombol mengambang selesai terpasang; selisih tiga panel dalam cakupan masing-masing sekitar 0,00095% / 0% / 0%. Dua grafik di luar cakupan masih memiliki selisih raster pada tangkapan 1024px yang tercatat di data mentah; komponen grafiknya tidak diubah. Tiga ukuran wajib 1280/1440/1920 juga dibandingkan per panel dan semuanya 0%. [Data pixel diff](desktop-pixels.json).

**Panel mobile lain yang belum satu pola header**

| Panel | Temuan 390px | Saran untuk pekerjaan terpisah |
| --- | --- | --- |
| Filter | Bar ringkas sekitar 74px, ikon dan tombol Ubah; belum memakai ubin warna 32px seperti panel atas. | Samakan ikon dan jarak bila pola header baru diperluas, sambil mempertahankan akses sheet. |
| Volume Tiket | Header 73px, padding 12px 14px, tanpa ubin ikon yang sama. | Gunakan ubin sky 32px dan ritme 16px; pertahankan kontrol grafik/tabel. |
| Rekap compact | Header 69px, ikon 14px, padding 12px 14px. | Samakan ubin/judul/aksi View; jaga hitungan staf dan daftar ringkas. |
| Distribusi | Header 73px, padding 12px 14px, kontrol tab dan View masih memakai pola lama. | Selaraskan ubin dan padding tanpa mengubah pemilihan Kategori/Severity. |
| Tren durasi | Header 73px, padding 12px 14px, belum memakai ubin yang sama. | Terapkan ritme header baru tanpa menambah tinggi area grafik. |
| Trafik shift | Header 73px, ikon 16px tanpa ubin, padding 12px 14px. | Pertahankan ikon 16px, tambahkan ubin dan sejajarkan aksi. |

Panel-panel ini hanya diaudit dan tidak didesain ulang. [Pengukuran header](after.json).

**Screenshot sebelum/sesudah**

Gambar panel sesudah menyembunyikan shell fixed hanya selama pemotretan crop agar topbar/bottom nav tidak menutupi isi. Screenshot Dashboard penuh tetap merekam shell asli. Waktu uji dibekukan ke 26 Oktober 2026 20:17 WIB pada kedua sisi untuk perbandingan; data tidak diedit.

| Viewport | Memo sebelum | Memo sesudah | Tiket sebelum | Tiket sesudah | Dashboard sebelum | Dashboard sesudah |
| --- | --- | --- | --- | --- | --- | --- |
| 320×568 | [gambar](before/memo-320.png) | [gambar](after/memo-320.png) | [gambar](before/today-320.png) | [gambar](after/today-320.png) | [gambar](before/dashboard-320.png) | [gambar](after/dashboard-320.png) |
| 360×740 | [gambar](before/memo-360.png) | [gambar](after/memo-360.png) | [gambar](before/today-360.png) | [gambar](after/today-360.png) | [gambar](before/dashboard-360.png) | [gambar](after/dashboard-360.png) |
| 375×667 | [gambar](before/memo-375.png) | [gambar](after/memo-375.png) | [gambar](before/today-375.png) | [gambar](after/today-375.png) | [gambar](before/dashboard-375.png) | [gambar](after/dashboard-375.png) |
| 390×844 | [gambar](before/memo-390.png) | [gambar](after/memo-390.png) | [gambar](before/today-390.png) | [gambar](after/today-390.png) | [gambar](before/dashboard-390.png) | [gambar](after/dashboard-390.png) |
| 412×915 | [gambar](before/memo-412.png) | [gambar](after/memo-412.png) | [gambar](before/today-412.png) | [gambar](after/today-412.png) | [gambar](before/dashboard-412.png) | [gambar](after/dashboard-412.png) |
| 430×932 | [gambar](before/memo-430.png) | [gambar](after/memo-430.png) | [gambar](before/today-430.png) | [gambar](after/today-430.png) | [gambar](before/dashboard-430.png) | [gambar](after/dashboard-430.png) |
| 768×1024 | [gambar](before/memo-768.png) | [gambar](after/memo-768.png) | [gambar](before/today-768.png) | [gambar](after/today-768.png) | [gambar](before/dashboard-768.png) | [gambar](after/dashboard-768.png) |
| 844×390 | [gambar](before/memo-844.png) | [gambar](after/memo-844.png) | [gambar](before/today-844.png) | [gambar](after/today-844.png) | [gambar](before/dashboard-844.png) | [gambar](after/dashboard-844.png) |

Monitoring sebelum/sesudah: 320px [sebelum](before/monitoring-320.png) / [sesudah](after/monitoring-320.png); 360px [sebelum](before/monitoring-360.png) / [sesudah](after/monitoring-360.png); 375px [sebelum](before/monitoring-375.png) / [sesudah](after/monitoring-375.png); 390px [sebelum](before/monitoring-390.png) / [sesudah](after/monitoring-390.png); 412px [sebelum](before/monitoring-412.png) / [sesudah](after/monitoring-412.png); 430px [sebelum](before/monitoring-430.png) / [sesudah](after/monitoring-430.png); 768px [sebelum](before/monitoring-768.png) / [sesudah](after/monitoring-768.png); 844px [sebelum](before/monitoring-844.png) / [sesudah](after/monitoring-844.png).

Kasus ekstrem 390px: [kombinasi badge dan nilai panjang](scenarios/extreme-badges-390.png), [Memo kosong](scenarios/memo-empty-390.png), [Memo satu poin](scenarios/memo-one-390.png), [Memo enam poin](scenarios/memo-six-390.png), [Memo tanpa spasi](scenarios/memo-no-spaces-390.png).

**File yang diubah**

| File | Perubahan |
| --- | --- |
| [TicketReportView.tsx](../../frontend/app/components/tickets/TicketReportView.tsx) | Tiga header mobile, daftar/pager, reuse warna badge, cabang Memo tunggal dan skeleton. |
| [TodayTicketRow.tsx](../../frontend/app/components/dashboard/TodayTicketRow.tsx) | Baru: satu DOM untuk row desktop dan daftar datar tiga baris mobile, clamp/ellipsis/ARIA. |
| [MemoPreview.tsx](../../frontend/app/components/dashboard/MemoPreview.tsx) | Kotak adaptif, bullet, clamp wadah, pengukuran clipping, fade dan footer 44px. |
| [DashboardSkeleton.tsx](../../frontend/app/components/ui/skeleton/DashboardSkeleton.tsx) | Anatomi empat tiket, header seragam dan ukuran Memo/Monitoring yang sama. |

Teks baru: “Belum ada tiket hari ini”; label daftar “Tiket hari ini”; pola aria-label baris “judul, severity, status”. “Lihat semua (jumlah)”, “Ringkas”, “Selengkapnya”, “Belum ada catatan”, “Tulis”, judul panel dan nama opsi jumlah menggunakan teks yang sudah ada. Tidak ada tambahan “Tersimpan”, “Salin”, “Poin Catatan”, “Reset”, atau “butir catatan” pada panel Memo.

Helper verifikasi berada di .codex-tmp/r5-* dan artefak dalam folder laporan ini. Perbandingan sumber memakai snapshot awal round 5 agar perubahan pengguna dari pekerjaan sebelumnya tetap terjaga. Dev server localhost:3000 tetap berjalan.
