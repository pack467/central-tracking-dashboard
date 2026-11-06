# Laporan perbaikan mobile — Central Tracking Dashboard

23 Oktober 2026 · verifikasi lokal Chrome headless · Asia/Jakarta

Dashboard 390×844: **5,982px → 3,845px, turun 35.72%**. Backend tidak diubah. Tidak ada commit, dependency baru, file CSS baru, atau publikasi.

[Sebelum, layar pertama](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-top.png>) · [Sesudah, layar pertama](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-top.png>) · [Grafik durasi](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-chart.png>) · [Sheet filter](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/filter-sheet.png>)

## Diagnosis sebelum perubahan

Diukur sebelum mengedit aplikasi, pada 390×844, touch, DPR 3. Nilai di bawah memakai data selesai dimuat, bukan skeleton.

| Komponen | Temuan terukur | Penyebab | Perbaikan |
|---|---|---|---|
| Halaman | 5.982px; scrollWidth/clientWidth 390/390 | Daftar dan filter terbuka, panel bertinggi minimum desktop | Daftar ringkas; filter sheet; distribusi bertab |
| Tiket Hari Ini | 1.191,5px, 10 tiket per halaman | Baris bertumpuk; kontrol pagination berlapis | 5 baris, ekspansi semua 33 tiket, pagination satu baris; 592,5px |
| Memo | 248px | Editor penuh selalu terlihat | Preview 3 baris; View membuka editor penuh; 169px |
| Monitoring | 400px | Daftar panjang, footer bertumpuk | 4 baris awal, ekspansi 13 item, target OK 40px; 348px |
| Volume | SVG 332×220, viewBox 1040×270 | Koordinat tetap diperkecil dengan preserveAspectRatio=none | Koordinat 1:1; batang 29px; target 40px; scroll ke tanggal terbaru |
| Resolusi | SVG 332×220, viewBox 1050×280, font DOM 8,5–10,5px | Teks ikut diskalakan; tinggi efektif sekitar 6,7–8,3px | SVG 340×220, viewBox 340×220, font 11px |
| Trafik | SVG 332×220, viewBox 860×280 | Plot tetap dan ruang anotasi desktop | SVG 340×220, viewBox 340×220, tick dikurangi; tooltip sentuh |
| Rekap staf | Panel 580px, 14 kartu dalam area scroll | Teks mikro 7,5–10px | 3 kartu awal, avatar 32px, mini KPI sejajar, ekspansi 14 staf |
| Distribusi | Kategori 476,75px + severity 497,5px | Dua panel vertikal dengan layout donut desktop | Dua tab/slide lebar penuh, donut di atas; severity grid 2×2 |
| Tipografi/target | 288 teks <11px; 48 elemen interaktif <40px | Ukuran mikro, tombol 24–36px | Dashboard ponsel/tablet: 0 teks <11px, 0 target utama <40px |

CSS lama berada di luar layer Tailwind. Contohnya `.page-view-enter { width:100% }`, aturan `.topbar`, header panel, dan pagination menimpa utilitas responsif. Hook kelas yang berbenturan diganti pada JSX dan gaya yang diperlukan dipertahankan lewat utilitas. Stylesheet lama bersama tidak dihapus karena masih digunakan komponen lain.

## Keputusan implementasi

- Navigasi: komponen BottomNav yang sudah ada tetapi belum terhubung dipakai untuk <768px, menggantikan akses drawer ponsel. Item diambil dari `app/lib/routes.ts`. Hamburger lama tetap tersedia pada 768–940px; sidebar desktop dipertahankan. Lainnya berisi Reports, Team Roster, Master Data, Runbooks, profil, serta handover.
- Dashboard ringkas berlaku <1024px. Pada 640–1023px, area tiket dan memo/monitoring memakai dua kolom. Filter tetap inline mulai 768px. Semua perubahan ukuran desktop >=1024px dipertahankan.
- Header ponsel 52px + safe-area: logo, kode klien, shift, HH:mm, refresh; transisi menjadi tombol ikon. Tanggal lengkap tersedia melalui title/aria dan Lainnya. Semua state transition diuji pada 320px.
- Padding ponsel <400px benar-benar 12px kiri/kanan; 400–639px 16px. Gap kartu 12px. Konten terakhir memiliki ruang bagi nav 56px, FAB 52px, dan safe-area. Area pagination menyisakan jalur 52px agar select tidak tertutup FAB.
- BottomSheet tunggal dipakai oleh filter, Lainnya, dan klien: portal, batas 88dvh, handle, footer, focus trap, Esc, backdrop, swipe, fokus kembali, serta penutupan saat Back. Lock scroll memakai `:has([data-sheet-open])`; memo dan detail staf memakai pola atribut yang sama.
- `useContainerDimensions` yang telah dipakai Panel Viewer dipakai kembali. Hook sekarang juga mengamati grafik yang baru dipasang setelah skeleton, memakai callback ref yang tetap mendukung `.current`. Tidak ada fetch tambahan.
- Grafik batang menggulir horizontal, membuka tanggal terbaru, dan legenda dapat menyembunyikan seri hanya pada kartu ringkas. Plot garis 220px, garis 2,5px, titik sekitar 3px radius, font 11px. Tap/drag menampilkan tooltip dengan touch-action: pan-y. MoM juga memakai koordinat 1:1.
- Distribusi Kategori dan Severity memakai carousel dengan tombol berlabel jelas, scroll snap, serta satu DOM untuk setiap panel. Donut kategori 150px, daftar bar satu baris; severity memakai empat kartu 2×2.
- Filter menggunakan kontrol dan setter yang sama. Terapkan menutup sheet; perubahan tetap diterapkan langsung sesuai perilaku desktop. Kalender inline dalam sheet, bukan popover. Chip aktif menampilkan nilai dan jumlah filter.
- Identitas ShellContext dipisah agar HMR tidak menggandakan provider. Animasi route memakai initial snapshot yang konsisten sehingga reduced motion tidak menimbulkan peringatan hydration.

## Verifikasi

- 16/16 skenario interaksi lulus; 0 console/page error pada pengujian interaksi.
- 20 siklus buka/tutup sheet biasa dan 20 siklus memo; Esc, tombol, backdrop, geser, Tab/Shift+Tab, Back, serta wheel/keyboard setelah penutupan lulus. Tidak ada inert atau overlay tertinggal.
- Probe React.StrictMode terpisah: 20 siklus, lulus=True; tidak ada portal ganda atau lock tertinggal. Runtime Vinext App Router proyek belum membungkus seluruh aplikasi dengan StrictMode secara otomatis.
- Navigasi delapan halaman, deep link Panel Viewer, item aktif termasuk Lainnya, pemilih klien, ekspansi tiket/monitoring/staf, detail staf, legenda, MoM, tooltip, dan memo lulus.
- Filter proyek APH menghasilkan “Menampilkan 12 dari 88 Tiket” di desktop dan 12 tiket di ponsel. Reset mengembalikan parameter sesuai perilaku sebelumnya. Kalender inline terukur tidak melewati lebar sheet.
- Emulasi inset top 44px/bottom 34px melalui variabel geometri: header 96px; konten terakhir berada di atas nav dan FAB. Variabel produksi memakai fallback env(safe-area-inset-*). Ini emulasi geometri, bukan pengujian perangkat iOS fisik.
- CLS konten Dashboard setelah splash: **0.000000**. Cold start termasuk font splash: 0.000177. Pergeseran kecil pada cold start masih berasal dari pergantian font splash; seluruh perpindahan besar skeleton telah dihilangkan.
- Scroll sintetis: 642ms; 0 long task tercatat. Penilaian jank pada perangkat fisik belum dilakukan.
- Typecheck dan build lulus memakai skrip proyek (vinext build). Lint penuh masih gagal: **203 error lama dan 26 warning**. Perbandingan berkas yang disentuh: 70 error sebelum, 65 sesudah; tidak ada error baru. Berkas hook dan sheet baru lulus lint terarah. Error lint di luar cakupan tidak diubah.

[Interaksi](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/interactions.json>) · [StrictMode](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/strict-mode.json>) · [Loading/scroll](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/loading-quality.json>) · [Lint comparison](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/lint-comparison.json>) · [Typecheck](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-typecheck.log>) · [Build](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-build.log>) · [Lint penuh](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-lint.log>)

### Desktop pixel comparison

Dashboard, Tickets, Monitoring, Shift Log, Reports, Team Roster, Master Data, Runbooks diperiksa pada 1280, 1440, 1920px. Ukuran screenshot sebelum/sesudah sama. Tabel memakai persen piksel yang berubah lebih dari 16/255 pada satu kanal untuk mengabaikan noise raster; kolom raw tetap disimpan dalam JSON.

| Halaman | 1280 | 1440 | 1920 |
|---|---:|---:|---:|
| dashboard | 0.02348% | 0.02212% | 0.01602% |
| tickets | 0.00000% | 0.00000% | 0.00000% |
| monitoring | 0.00000% | 0.00000% | 0.00000% |
| shift-log | 0.00000% | 0.00000% | 0.00000% |
| reports | 0.00000% | 0.00000% | 0.00000% |
| team-roster | 0.00000% | 0.00000% | 0.00047% |
| master-data | 0.00000% | 0.00000% | 0.00000% |
| runbooks | 0.00000% | 0.00000% | 0.00000% |

Raw Dashboard: 1280: 0.03316%, 1440: 0.03125%, 1920: 0.02263%.
Raw tanpa toleransi melewati 0,5% pada sampel Master Data 1280px: perubahan hanya 1–2 tingkat RGB pada raster kartu. Tidak ada perubahan geometri atau kode halaman Master Data. Jadi klaim <0,5% untuk seluruh halaman berlaku pada metrik bertoleransi di atas, bukan metrik raw nol toleransi.

[Seluruh nilai pixel comparison](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/pixels.json>)

## Audit halaman lain — hanya dilaporkan

| Halaman (390px) | Teks <11px | Target <40px | Temuan dan saran |
|---|---:|---:|---|
| /tickets | 129 | 11 | TicketsView/TicketTable: New Ticket 36px, tab daftar/escalation 37px, metadata 9–10px. Naikkan target ke 40–44px; ringkas kartu dan toolbar. |
| /monitoring | 72 | 12 | MonitoringView: tab status 24px, Guide 34px, metadata checkpoint kecil. Perbesar tab, sederhanakan label, pertahankan scroll lokal bila tabel melebar. |
| /shift-log | 96 | 31 | ShiftLogView: date/select 38px, 31 target kecil, halaman panjang. Ringkas filter dalam sheet/accordion; metadata minimal 11px. |
| /reports | 75 | 4 | ReportsView: tab 36px; label KPI dan ringkasan masih kecil. Naikkan target tab, gunakan legenda ringkas dan chart terukur saat pengerjaan terpisah. |
| /team-roster | 42 | 20 | TeamRosterView/RosterTable: Shift Swaps dan Tambah Anggota 36px, pencarian 38px, role/status kecil. Naikkan area sentuh; buat kartu staf lebih ringkas. |
| /master-data | 36 | 38 | MasterDataView: breadcrumb sekitar 17px tinggi, search/select 36px, metadata kecil. Perbesar area klik dan kontrol; padatkan kartu daftar. |
| /runbooks | 25 | 10 | RunbooksView: tab sekitar 31px, counter/metadata kecil. Gunakan tab 40–44px dengan scroll lokal dan teks sekunder 11px. |

Semua halaman audit memiliki scrollWidth = clientWidth = 390px. Tidak ditemukan overflow horizontal pada dokumen. Ruang nav/FAB berasal dari kerangka bersama; konten terakhir dapat digulir ke atas keduanya. Daftar isu di atas tidak diperbaiki pada komponen halaman. Scroll lokal pada tab/tabel dipertahankan. Audit ini mencakup tampilan awal, bukan seluruh alur CRUD.

## File yang diubah

- [frontend\app\(app)\template.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/(app)/template.tsx>)
- [frontend\app\components\dashboard\MemoModal.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/dashboard/MemoModal.tsx>)
- [frontend\app\components\layout\BottomNav.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/layout/BottomNav.tsx>)
- [frontend\app\components\layout\ClientSwitcher.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/layout/ClientSwitcher.tsx>)
- [frontend\app\components\layout\ShiftCoveragePanel.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/layout/ShiftCoveragePanel.tsx>)
- [frontend\app\components\layout\ShiftTransitionBadge.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/layout/ShiftTransitionBadge.tsx>)
- [frontend\app\components\layout\Topbar.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/layout/Topbar.tsx>)
- [frontend\app\components\routing\AppShell.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/routing/AppShell.tsx>)
- [frontend\app\components\tickets\TicketReportView.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/tickets/TicketReportView.tsx>)
- [frontend\app\components\ui\AppSplash.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/ui/AppSplash.tsx>)
- [frontend\app\components\ui\BottomSheet.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/ui/BottomSheet.tsx>)
- [frontend\app\components\ui\DatePicker.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/ui/DatePicker.tsx>)
- [frontend\app\components\ui\FloatingNewTicketButton.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/ui/FloatingNewTicketButton.tsx>)
- [frontend\app\components\ui\skeleton\DashboardSkeleton.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/ui/skeleton/DashboardSkeleton.tsx>)
- [frontend\app\components\ui\skeleton\PanelSkeletonWrapper.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/ui/skeleton/PanelSkeletonWrapper.tsx>)
- [frontend\app\components\ui\Toast.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/ui/Toast.tsx>)
- [frontend\app\context\ShellContext.ts](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/context/ShellContext.ts>)
- [frontend\app\hooks\useContainerDimensions.ts](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/hooks/useContainerDimensions.ts>)
- [frontend\app\hooks\useMobileLayout.ts](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/hooks/useMobileLayout.ts>)
- [frontend\app\layout.tsx](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/layout.tsx>)
- [frontend\app\lib\routes.ts](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/lib/routes.ts>)

Semua perubahan aplikasi berada di frontend. Script QA dan bukti ada di `.codex-tmp/` serta `output/mobile-redesign/`. Perubahan pengguna yang sudah ada dipertahankan.

## Teks mobile baru

Dashboard; Filter; Ubah; Reset; Terapkan; Lainnya; Pilih klien; Filter analitik; Lihat semua (n); Ringkas; Vol; MoM; Volume Tiket; Tiket MoM; Tren Durasi; Tren Trafik; Distribusi Kategori; Distribusi Severity; Kategori; Severity; 10/hal.; 15/hal.; 25/hal.; n tiket; n filter; kode klien; HH:mm. String panjang desktop tetap disimpan.

## Screenshot dan matriks viewport

Semua ukuran dalam CSS pixel; touch dan DPR 3 untuk lebar <=844px, DPR 1 untuk desktop.

| Viewport | Tinggi sebelum → sesudah | ScrollWidth/clientWidth | Sebelum | Sesudah |
|---|---:|---|---|---|
| 320×568 | 6322 → 3845px | 320/320 | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/dashboard-320.png>) | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-dashboard/dashboard-320.png>) |
| 360×740 | 6300 → 3845px | 360/360 | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/dashboard-360.png>) | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-dashboard/dashboard-360.png>) |
| 375×667 | 6027 → 3845px | 375/375 | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/dashboard-375.png>) | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-dashboard/dashboard-375.png>) |
| 390×844 | 5982 → 3845px | 390/390 | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/dashboard-390.png>) | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-dashboard/dashboard-390.png>) |
| 412×915 | 5961 → 3845px | 412/412 | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/dashboard-412.png>) | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-dashboard/dashboard-412.png>) |
| 430×932 | 5930 → 3845px | 430/430 | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/dashboard-430.png>) | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-dashboard/dashboard-430.png>) |
| 768×1024 | 4985 → 3317px | 768/768 | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/dashboard-768.png>) | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-dashboard/dashboard-768.png>) |
| 844×390 | 4985 → 3317px | 844/844 | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/dashboard-844.png>) | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-dashboard/dashboard-844.png>) |
| 1024×768 | 4591 → 4591px | 1024/1024 | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/dashboard-1024.png>) | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-dashboard/dashboard-1024.png>) |
| 1280×800 | 3258 → 3258px | 1280/1280 | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/dashboard-1280.png>) | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-dashboard/dashboard-1280.png>) |
| 1440×900 | 3073 → 3073px | 1440/1440 | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/dashboard-1440.png>) | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-dashboard/dashboard-1440.png>) |
| 1920×1080 | 3183 → 3183px | 1920/1920 | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/dashboard-1920.png>) | [PNG](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-dashboard/dashboard-1920.png>) |

Screenshot halaman lain:

### 390px

- tickets: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/tickets-390.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-mobile/tickets-390.png>)
- monitoring: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/monitoring-390.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-mobile/monitoring-390.png>)
- shift-log: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-shiftlog/shift-log-390.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-mobile/shift-log-390.png>)
- reports: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/reports-390.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-mobile/reports-390.png>)
- team-roster: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/team-roster-390.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-mobile/team-roster-390.png>)
- master-data: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/master-data-390.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-mobile/master-data-390.png>)
- runbooks: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/runbooks-390.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-mobile/runbooks-390.png>)

### 1280px

- tickets: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/tickets-1280.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/tickets-1280.png>)
- monitoring: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/monitoring-1280.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/monitoring-1280.png>)
- shift-log: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-shiftlog/shift-log-1280.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/shift-log-1280.png>)
- reports: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/reports-1280.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/reports-1280.png>)
- team-roster: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/team-roster-1280.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/team-roster-1280.png>)
- master-data: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-masterdata-stable/master-data-1280.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-masterdata-stable/master-data-1280.png>)
- runbooks: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/runbooks-1280.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/runbooks-1280.png>)

### 1440px

- tickets: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/tickets-1440.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/tickets-1440.png>)
- monitoring: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/monitoring-1440.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/monitoring-1440.png>)
- shift-log: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-shiftlog/shift-log-1440.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/shift-log-1440.png>)
- reports: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/reports-1440.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/reports-1440.png>)
- team-roster: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/team-roster-1440.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/team-roster-1440.png>)
- master-data: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-masterdata-stable/master-data-1440.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-masterdata-stable/master-data-1440.png>)
- runbooks: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/runbooks-1440.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/runbooks-1440.png>)

### 1920px

- tickets: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/tickets-1920.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/tickets-1920.png>)
- monitoring: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/monitoring-1920.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/monitoring-1920.png>)
- shift-log: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-shiftlog/shift-log-1920.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/shift-log-1920.png>)
- reports: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/reports-1920.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/reports-1920.png>)
- team-roster: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/team-roster-1920.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/team-roster-1920.png>)
- master-data: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-masterdata-stable/master-data-1920.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-masterdata-stable/master-data-1920.png>)
- runbooks: [sebelum](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/before-stable/runbooks-1920.png>) · [sesudah](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/after-final/runbooks-1920.png>)

Tahapan:

- [Tahap 1 — kerangka](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/stage1/dashboard-390.png>)
- [Tahap 2 — Dashboard](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/stage2/dashboard-390.png>)
- [Tahap 3 — audit DOM lengkap](<F:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/output/mobile-redesign/final-mobile/audit.json>)

Batas verifikasi yang tersisa: lint proyek belum bersih; cold-start font splash tidak persis CLS 0; pixel raw Master Data memiliki noise 1–2 RGB; perangkat fisik belum diuji.

Salinan aplikasi QA sementara di output/mobile-redesign/baseline-app masih ada: pemeriksaan persetujuan otomatis menolak penghapusan junction dependensi (blocked by policy). Server QA port 3102 sudah dihentikan dan salinan .env.local sudah dikosongkan. Konfigurasi lokal frontend asli tetap dipertahankan.
