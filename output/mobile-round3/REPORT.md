# Laporan putaran 3 — dropdown dan dashboard mobile

55 select native di 22 file sudah memakai satu engine Select/MultiSelect. Tidak ada select native atau datalist tersisa pada sumber aplikasi maupun DOM yang diuji. Tiket Hari Ini, Memo, Volume, dan Rekap sudah mengikuti rancangan mobile. Lima staf tetap tampil sesuai jawaban pengguna.

**Hasil pemeriksaan akhir**

| Pemeriksaan | Hasil |
| --- | --- |
| Typecheck | Lulus, npm.cmd run typecheck |
| Build tahap A dan B–D | Lulus; [log akhir](final-build.log) |
| Lint seluruh proyek | 179 error / 26 warning lama; baseline 203 error. Tidak ada temuan baru setelah normalisasi nomor baris; [audit](source-audit.json), [hasil lengkap](final-lint.json) |
| Sumber native | 55 → 0; termasuk folder app, components, examples |
| Screenshot final | 47 halaman/viewport, 0 console error, 0 overflow horizontal |
| State dropdown | 40 halaman dan 20 form pada lima ukuran, 0 error; [audit](verification-audit.json) |
| Runbooks form dokumen | 5 ukuran, 0 console error; [audit](sop-form-tests.json) |
| Disabled + modal + empty chart | 5 ukuran, 0 console error; [audit](extra-tests.json) |
| Desktop pixel diff | Maksimum 0.319%, di luar kontrol filter; semua 24 perbandingan < 0,5%; [hasil](desktop-pixels.json) |
| Keyboard dan fokus | 5/6 kelompok lulus; [hasil](select-tests.json) |
| StrictMode dan perilaku mobile | 6/6 kelompok lulus; [hasil](behavior.json) |

Perintah npm dijalankan dari folder frontend/. Pengukuran menggunakan Chrome/Playwright dengan jam tetap 26 Oktober 2026, 20:17 WIB agar data dan screenshot sebelum/sesudah setara. Pengujian ARIA mencakup role, selected, expanded, controls, active descendant, disabled, dan urutan fokus. Tidak dilakukan uji suara manual dengan NVDA/VoiceOver.

**Diagnosis dan ukuran mobile**

Popup select native dirender browser/OS, sehingga sorot biru sistem tidak bisa diseragamkan dengan CSS halaman. Fokus global 2px ikut membuat kontrol terasa berbeda dari Shifter. Kini pemilihan single maupun multi memakai panel dan state yang sama.

Pada 390px, grafik sebelumnya memiliki viewport 300px, SVG 1.052px, dan scroll awal 752px. Puncak 44 tiket pada 08-31 tertinggal di luar layar kiri. SVG sekarang 300px, scroll awal 0, tinggi 220px, sumbu Y tetap 36px, padding kiri/kanan plot 8px, dan ruang bawah 36px. Skala default tetap 0–49. Batang terkecil 1 tiket setinggi 3,43px tetap terlihat.

| Elemen pada 390px | Sebelum | Sesudah | Perubahan |
| --- | ---: | ---: | --- |
| Baris Tiket Hari Ini | 84px | 100px | Padding 12px, rel severity 3px, judul dua baris, meta dan badge 20px |
| Panel Tiket Hari Ini | 660px | 728px | Lima baris dan kontrol paging satu baris |
| Panel Memo | 181px | 207px | Pratinjau 108px, daftar bullet, petunjuk aksi |
| Plot Volume | 252px | 220px | Seluruh 20 tanggal muat |
| Panel Volume | 418px | 406px | Ringkasan, legenda 32px, tooltip sentuh |
| Satu staf | 140px | 60px | **Turun 57,1%** |
| Jumlah staf awal | 3 | 5 | Sesuai jawaban pengguna |
| Panel Rekap | 591px | 451px | **Turun 23,7%** keseluruhan |
| Tinggi Dashboard | 4.378px | 4.320px | Turun 58px |

Target 40% diterapkan pada tiap staf sesuai klarifikasi pengguna: “Tetap 5 baris; ringkas tiap staf >40%”. Pengurangan total panel dilaporkan terpisah karena jumlah staf awal berubah dari tiga menjadi lima.

| Lebar viewport | Tinggi halaman sebelum | Tinggi sesudah | Overflow horizontal |
| --- | ---: | ---: | ---: |
| 320 | 4411 | 4353 | 0px |
| 360 | 4378 | 4320 | 0px |
| 375 | 4378 | 4320 | 0px |
| 390 | 4378 | 4320 | 0px |
| 412 | 4378 | 4320 | 0px |
| 430 | 4378 | 4320 | 0px |
| 768 | 4362 | 4304 | 0px |
| 844 × 390 | 4474 | 4416 | 0px |
| 1024 | 4591 | 4591 | 0px |
| 1280 | 3258 | 3258 | 0px |
| 1440 | 3073 | 3073 | 0px |
| 1920 | 3183 | 3183 | 0px |

Ukuran desktop tetap sama. Perbandingan pixel memakai masker pada trigger/dropdown, segmented filter, dan kontrol filter terkait; konten kartu, tabel, heading, dan grafik tetap masuk perbandingan. Referensi Shift Log memakai screenshot sebelum edit pada server utama agar data handover sama. [Masker](desktop-masks.json), [hasil per halaman](desktop-pixels.json).

**Detail rancangan dan batas kepadatan**

- Tiket memakai satu DOM dengan grid responsif: proyek/ID/severity, judul 14px, kategori/avatar 16px/PIC/status. Judul, ID, proyek, dan PIC memiliki nilai penuh melalui title. Tombol Lihat semua sekunder memiliki panah dan tinggi 44px. Callback pagination dan perilaku baris dipertahankan.
- Memo merender ul/li dari baris memo, dengan marker amber dan jarak 6px. Normalisasi bullet hanya untuk tampilan. Fade dan Selengkapnya muncul jika isi terpotong. Seluruh pratinjau membuka MemoModal yang sama. Kasus kosong, pendek, panjang, serta kesamaan raw localStorage sudah diuji.
- Volume mempertahankan skala jujur, hanya menampilkan total puncak/terakhir, menipiskan label X, dan menjepit tooltip ke dalam kartu. Tap/drag menampilkan tanggal, total, dan tiga rincian proyek; detail tanggal lama tetap tersedia. Empty state memiliki ikon, Tidak ada data, dan Reset filter bila ada filter aktif.
- Data 20 titik muat pada semua ukuran yang diuji. Batang minimum 10px diprioritaskan: celah sekitar 0,74px pada 320px, 2,84px pada 360px, dan 3px mulai 375px. Syarat batang 10px + celah 3px + 31 titik memang membutuhkan lebar plot lebih besar daripada ponsel kecil. Rentang yang tidak muat atau >31 titik memakai slot minimum 14px dan membuka di dekat puncak. [Uji 40 tanggal](dense-test.json): plot 576px / viewport 300px, puncak terlihat pada posisi awal, overflow halaman 0. Fixture hanya hidup pada browser uji.
- Rekap memakai avatar 32px, nama 14px, jabatan 11px, KPI Hari/Bulan/Tahun 11px dan angka 15px. Hari nol abu-abu, Bulan hijau, Tahun ungu. Chip proyek hanya tampil bila ada isi, dengan gulir horizontal. Seluruh baris membuka detail; chevron 40px dan label Detail nama tersedia.
- Pengecualian target sentuh mengikuti rancangan yang diminta: View/chevron 40px, legenda 32px, dan batang individual 10–14px di dalam plot sentuh 220px. Badge, avatar, dan chip informasi bukan tombol. Opsi select 48px; tombol utama/pagination dan input pencarian minimal 44px.
- Seluruh tinggi panel sama antara skeleton dan data selesai pada uji slow loading. CLS pergantian panel = 0. CLS halaman terukur 0.00001122 setelah splash, berasal dari teks topbar, bukan pergeseran panel; [rincian](loading-quality.json). Reduced motion teruji tanpa animasi sheet/dropdown.

**Select bersama**

Sumber token adalah [select-styles.ts](../../frontend/app/components/ui/select-styles.ts). Engine terdapat di [Select.tsx](../../frontend/app/components/ui/Select.tsx), dengan BottomSheet yang sudah ada untuk lebar <768px atau pointer coarse. API mendukung value/onChange/onValueChange/options/children option, label, placeholder, disabled, name, required, form/compact, icon/meta/group, multi, dan input nilai bebas.

| State | Token |
| --- | --- |
| Trigger | #0f172a; border #334155; radius 8px |
| Aktif | sky alpha 0,10; border sky alpha 0,40; teks #38bdf8 |
| Fokus | border sky alpha 0,70; ring 3px sky alpha 0,15 |
| Panel | #1e293b; border #334155; radius 10px; padding 4px; max-height 320px |
| Opsi hover/keyboard | #243044; keyboard ring inset 1px sky alpha 0,35 |
| Terpilih | sky alpha 0,14; teks #f8fafc; centang/checkbox sky |
| Opsi disabled | opacity 0,4 |

Kontras teks normal minimum 5.71:1; [perhitungan](source-audit.json). Animasi buka 120ms dan chevron 150ms mematuhi reduced motion. Panel desktop di-portal, mengikuti scroll/resize, flip ke atas, dan clamp tepi. Pengukuran tinggi flip memasukkan padding dan border panel. Pencarian tersedia untuk >8 opsi.

Keyboard Enter/Space/panah, Home/End, PageUp/PageDown, type-ahead termasuk spasi, Esc, Tab/Shift+Tab diuji. Jalur pilih, Esc, klik luar, Tab, pindah route, serta 20 siklus cepat melepas panel/fokus/scroll dengan benar. Sheet daftar bertingkat dengan sheet filter dan modal Master Data, kembali ke kontrol asal, dan tidak menyisakan inert. StrictMode menjalankan 20 siklus tersendiri termasuk opsi/trigger disabled.

State biru lain yang diselaraskan: tab Volume/MoM Dashboard, badge tab aktif Runbooks, dan badge jumlah filter aktif Tickets. Dimensi badge/tab lama dipertahankan. CSS select native di base.css, overlays.css, utilities.css dihapus setelah inventaris memastikan tidak ada pemakainya. DatePicker, menu aksi, dan kalender mempertahankan komponen sesuai jenis interaksinya.

**Inventaris native yang diganti**

Semua 55 kontrol sebelumnya controlled melalui value/onChange. Opsi, nilai, callback, id, required, disabled, dan grup asal dipertahankan. Nomor baris berikut adalah posisi baseline agar dapat dicocokkan dengan [inventaris lengkap berisi atribut dan opsi](select-inventory.json).

| File | Jumlah | Baris baseline |
| --- | ---: | --- |
| [app/components/handover/HandoverHistoryControls.tsx](../../frontend/app/components/handover/HandoverHistoryControls.tsx) | 1 | 372 |
| [app/components/handover/HandoverWizard.tsx](../../frontend/app/components/handover/HandoverWizard.tsx) | 3 | 605, 805, 828 |
| [app/components/master-data/ClientFormModal.tsx](../../frontend/app/components/master-data/ClientFormModal.tsx) | 1 | 270 |
| [app/components/master-data/ClientListTab.tsx](../../frontend/app/components/master-data/ClientListTab.tsx) | 1 | 144 |
| [app/components/master-data/ProjectFormModal.tsx](../../frontend/app/components/master-data/ProjectFormModal.tsx) | 2 | 227, 254 |
| [app/components/master-data/ProjectListTab.tsx](../../frontend/app/components/master-data/ProjectListTab.tsx) | 2 | 104, 139 |
| [app/components/master-data/SystemFormModal.tsx](../../frontend/app/components/master-data/SystemFormModal.tsx) | 5 | 211, 230, 286, 304, 325 |
| [app/components/master-data/SystemListTab.tsx](../../frontend/app/components/master-data/SystemListTab.tsx) | 4 | 125, 143, 177, 191 |
| [app/components/reports/ReportPdfPreview.tsx](../../frontend/app/components/reports/ReportPdfPreview.tsx) | 1 | 136 |
| [app/components/runbooks/SopSection.tsx](../../frontend/app/components/runbooks/SopSection.tsx) | 1 | 320 |
| [app/components/team/MemberCreateModal.tsx](../../frontend/app/components/team/MemberCreateModal.tsx) | 3 | 137, 160, 193 |
| [app/components/team/RosterCalendarView.tsx](../../frontend/app/components/team/RosterCalendarView.tsx) | 1 | 444 |
| [app/components/team/RosterTable.tsx](../../frontend/app/components/team/RosterTable.tsx) | 1 | 403 |
| [app/components/team/ShiftSwapModal.tsx](../../frontend/app/components/team/ShiftSwapModal.tsx) | 3 | 144, 159, 187 |
| [app/components/tickets/TicketCreateModal.tsx](../../frontend/app/components/tickets/TicketCreateModal.tsx) | 4 | 296, 311, 326, 350 |
| [app/components/tickets/TicketEditModal.tsx](../../frontend/app/components/tickets/TicketEditModal.tsx) | 4 | 143, 157, 171, 201 |
| [app/components/tickets/TicketReportView.tsx](../../frontend/app/components/tickets/TicketReportView.tsx) | 5 | 1768, 2090, 2111, 2142, 2173 |
| [app/components/ui/PaginationBar.tsx](../../frontend/app/components/ui/PaginationBar.tsx) | 1 | 47 |
| [app/components/views/NotificationsView.tsx](../../frontend/app/components/views/NotificationsView.tsx) | 2 | 521, 542 |
| [app/components/views/ReportsView.tsx](../../frontend/app/components/views/ReportsView.tsx) | 1 | 312 |
| [app/components/views/TeamRosterView.tsx](../../frontend/app/components/views/TeamRosterView.tsx) | 3 | 229, 252, 273 |
| [app/components/views/TicketsView.tsx](../../frontend/app/components/views/TicketsView.tsx) | 6 | 343, 613, 631, 653, 671, 692 |

Dropdown kustom yang disatukan: Shifter Dashboard, Shifter Shift Log, dua filter proyek/sistem MonitoringSchedule, pemilih klien, PIC multi pada tiket, ProjectSelect dengan nilai bebas, serta pemilik tiket dengan nilai bebas. Dua datalist diganti oleh mode searchable/custom yang sama. Field tipe dokumen Runbooks kini terhubung eksplisit dengan labelnya. ESLint mengenali Select/MultiSelect sebagai kontrol form aksesibel.

**Temuan data Tahan — hanya dilaporkan**

Filter Tahan tetap menghasilkan 0 dari 88 tiket. Roster memuat baseMonth 38 dan baseYear 245 di [TicketReportView.tsx](../../frontend/app/components/tickets/TicketReportView.tsx). Saat staffTickets kosong, monthCount memakai baseMonth; yearCount memakai baseYear + todayCount. Karena todayCount 0, kartu menampilkan 38/245. Ini perbedaan basis angka fixture rekap dengan tiket hasil filter. Pencocokan nama, kalkulasi, urutan staf, dan filter tersebut tidak diubah.

Paritas kontrol lama/baru pada proyek APH → tambah Shift Pagi → tambah Open → tambah High menghasilkan 12 → 6 → 0 → 0 tiket dan query URL identik. [Bukti](filter-parity.json). [Uji Tahan](select-tests.json).

**Screenshot sebelum/sesudah**

Tiap tautan opsi mempunyai saudara focus.png, hover.png, active.png, keyboard.png dalam folder yang sama. Closed state berada di screenshot halaman sesudah. Disabled hanya berlaku pada kontrol yang memang dinonaktifkan oleh aplikasi; contohnya pemilih klien pada edit proyek, tidak dipaksakan pada filter halaman yang selalu aktif.

| Halaman | 1920 | 1440 | 1024 | 768 | 390 |
| --- | --- | --- | --- | --- | --- |
| dashboard | [sebelum](before/dashboard-1920.png) · [sesudah](after/dashboard-1920.png) · [opsi](after/dashboard-1920/open-selected.png) | [sebelum](before/dashboard-1440.png) · [sesudah](after/dashboard-1440.png) · [opsi](after/dashboard-1440/open-selected.png) | [sebelum](before/dashboard-1024.png) · [sesudah](after/dashboard-1024.png) · [opsi](after/dashboard-1024/open-selected.png) | [sebelum](before/dashboard-768.png) · [sesudah](after/dashboard-768.png) · [opsi](after/dashboard-768/open-selected.png) | [sebelum](before/dashboard-390.png) · [sesudah](after/dashboard-390.png) · [opsi](after/dashboard-390/open-selected.png) |
| tickets | [sebelum](before/tickets-1920.png) · [sesudah](after/tickets-1920.png) · [opsi](after/tickets-1920/open-selected.png) | [sebelum](before/tickets-1440.png) · [sesudah](after/tickets-1440.png) · [opsi](after/tickets-1440/open-selected.png) | [sebelum](before/tickets-1024.png) · [sesudah](after/tickets-1024.png) · [opsi](after/tickets-1024/open-selected.png) | [sebelum](before/tickets-768.png) · [sesudah](after/tickets-768.png) · [opsi](after/tickets-768/open-selected.png) | [sebelum](before/tickets-390.png) · [sesudah](after/tickets-390.png) · [opsi](after/tickets-390/open-selected.png) |
| monitoring | [sebelum](before/monitoring-1920.png) · [sesudah](after/monitoring-1920.png) · [opsi](after/monitoring-1920/open-selected.png) | [sebelum](before/monitoring-1440.png) · [sesudah](after/monitoring-1440.png) · [opsi](after/monitoring-1440/open-selected.png) | [sebelum](before/monitoring-1024.png) · [sesudah](after/monitoring-1024.png) · [opsi](after/monitoring-1024/open-selected.png) | [sebelum](before/monitoring-768.png) · [sesudah](after/monitoring-768.png) · [opsi](after/monitoring-768/open-selected.png) | [sebelum](before/monitoring-390.png) · [sesudah](after/monitoring-390.png) · [opsi](after/monitoring-390/open-selected.png) |
| shift-log | [sebelum](before/shift-log-1920.png) · [sesudah](after/shift-log-1920.png) · [opsi](after/shift-log-1920/open-selected.png) | [sebelum](before/shift-log-1440.png) · [sesudah](after/shift-log-1440.png) · [opsi](after/shift-log-1440/open-selected.png) | [sebelum](before/shift-log-1024.png) · [sesudah](after/shift-log-1024.png) · [opsi](after/shift-log-1024/open-selected.png) | [sebelum](before/shift-log-768.png) · [sesudah](after/shift-log-768.png) · [opsi](after/shift-log-768/open-selected.png) | [sebelum](before/shift-log-390.png) · [sesudah](after/shift-log-390.png) · [opsi](after/shift-log-390/open-selected.png) |
| reports | [sebelum](before/reports-1920.png) · [sesudah](after/reports-1920.png) · [opsi](after/reports-1920/open-selected.png) | [sebelum](before/reports-1440.png) · [sesudah](after/reports-1440.png) · [opsi](after/reports-1440/open-selected.png) | [sebelum](before/reports-1024.png) · [sesudah](after/reports-1024.png) · [opsi](after/reports-1024/open-selected.png) | [sebelum](before/reports-768.png) · [sesudah](after/reports-768.png) · [opsi](after/reports-768/open-selected.png) | [sebelum](before/reports-390.png) · [sesudah](after/reports-390.png) · [opsi](after/reports-390/open-selected.png) |
| team-roster | [sebelum](before/team-roster-1920.png) · [sesudah](after/team-roster-1920.png) · [opsi](after/team-roster-1920/open-selected.png) | [sebelum](before/team-roster-1440.png) · [sesudah](after/team-roster-1440.png) · [opsi](after/team-roster-1440/open-selected.png) | [sebelum](before/team-roster-1024.png) · [sesudah](after/team-roster-1024.png) · [opsi](after/team-roster-1024/open-selected.png) | [sebelum](before/team-roster-768.png) · [sesudah](after/team-roster-768.png) · [opsi](after/team-roster-768/open-selected.png) | [sebelum](before/team-roster-390.png) · [sesudah](after/team-roster-390.png) · [opsi](after/team-roster-390/open-selected.png) |
| master-data | [sebelum](before/master-data-1920.png) · [sesudah](after/master-data-1920.png) · [opsi](after/master-data-1920/open-selected.png) | [sebelum](before/master-data-1440.png) · [sesudah](after/master-data-1440.png) · [opsi](after/master-data-1440/open-selected.png) | [sebelum](before/master-data-1024.png) · [sesudah](after/master-data-1024.png) · [opsi](after/master-data-1024/open-selected.png) | [sebelum](before/master-data-768.png) · [sesudah](after/master-data-768.png) · [opsi](after/master-data-768/open-selected.png) | [sebelum](before/master-data-390.png) · [sesudah](after/master-data-390.png) · [opsi](after/master-data-390/open-selected.png) |
| runbooks | [sebelum](before/runbooks-1920.png) · [sesudah](after/runbooks-1920.png) · [opsi](after/runbooks-1920/open-selected.png) | [sebelum](before/runbooks-1440.png) · [sesudah](after/runbooks-1440.png) · [opsi](after/runbooks-1440/open-selected.png) | [sebelum](before/runbooks-1024.png) · [sesudah](after/runbooks-1024.png) · [opsi](after/runbooks-1024/open-selected.png) | [sebelum](before/runbooks-768.png) · [sesudah](after/runbooks-768.png) · [opsi](after/runbooks-768/open-selected.png) | [sebelum](before/runbooks-390.png) · [sesudah](after/runbooks-390.png) · [opsi](after/runbooks-390/open-selected.png) |

| Form | 1920 | 1440 | 1024 | 768 | 390 |
| --- | --- | --- | --- | --- | --- |
| client | [closed](after/form-client-1920.png) · [opsi](after/form-client-1920/open-selected.png) | [closed](after/form-client-1440.png) · [opsi](after/form-client-1440/open-selected.png) | [closed](after/form-client-1024.png) · [opsi](after/form-client-1024/open-selected.png) | [closed](after/form-client-768.png) · [opsi](after/form-client-768/open-selected.png) | [closed](after/form-client-390.png) · [opsi](after/form-client-390/open-selected.png) |
| project | [closed](after/form-project-1920.png) · [opsi](after/form-project-1920/open-selected.png) | [closed](after/form-project-1440.png) · [opsi](after/form-project-1440/open-selected.png) | [closed](after/form-project-1024.png) · [opsi](after/form-project-1024/open-selected.png) | [closed](after/form-project-768.png) · [opsi](after/form-project-768/open-selected.png) | [closed](after/form-project-390.png) · [opsi](after/form-project-390/open-selected.png) |
| system | [closed](after/form-system-1920.png) · [opsi](after/form-system-1920/open-selected.png) | [closed](after/form-system-1440.png) · [opsi](after/form-system-1440/open-selected.png) | [closed](after/form-system-1024.png) · [opsi](after/form-system-1024/open-selected.png) | [closed](after/form-system-768.png) · [opsi](after/form-system-768/open-selected.png) | [closed](after/form-system-390.png) · [opsi](after/form-system-390/open-selected.png) |
| ticket | [closed](after/form-ticket-1920.png) · [opsi](after/form-ticket-1920/open-selected.png) | [closed](after/form-ticket-1440.png) · [opsi](after/form-ticket-1440/open-selected.png) | [closed](after/form-ticket-1024.png) · [opsi](after/form-ticket-1024/open-selected.png) | [closed](after/form-ticket-768.png) · [opsi](after/form-ticket-768/open-selected.png) | [closed](after/form-ticket-390.png) · [opsi](after/form-ticket-390/open-selected.png) |
| Runbooks dokumen | [opsi](after/runbooks-form-1920/open-selected.png) | [opsi](after/runbooks-form-1440/open-selected.png) | [opsi](after/runbooks-form-1024/open-selected.png) | [opsi](after/runbooks-form-768/open-selected.png) | [opsi](after/runbooks-form-390/open-selected.png) |
| Edit proyek disabled | [disabled](extra/project-disabled-1920.png) · [modal+opsi](extra/project-edit-open-1920.png) | [disabled](extra/project-disabled-1440.png) · [modal+opsi](extra/project-edit-open-1440.png) | [disabled](extra/project-disabled-1024.png) · [modal+opsi](extra/project-edit-open-1024.png) | [disabled](extra/project-disabled-768.png) · [modal+opsi](extra/project-edit-open-768.png) | [disabled](extra/project-disabled-390.png) · [modal+opsi](extra/project-edit-open-390.png) |
| Volume kosong | [empty](extra/empty-1920.png) | [empty](extra/empty-1440.png) | [empty](extra/empty-1024.png) | [empty](extra/empty-768.png) | [empty](extra/empty-390.png) |

Tambahan: [sheet filter bertingkat](stage1/nested-sheet-390.png), [40 tanggal](extra/dense-40-390.png), [skeleton](loading-390.png). Screenshot Dashboard 320/360/375/412/430/844/1280 terdapat di before dan after dengan nama dashboard-LEBAR.png.

**File tambahan yang berubah di luar inventaris native**

- [app/components/dashboard/MemoPreview.tsx](../../frontend/app/components/dashboard/MemoPreview.tsx) — baru
- [app/components/dashboard/MonitoringSchedule.tsx](../../frontend/app/components/dashboard/MonitoringSchedule.tsx)
- [app/components/handover/ProjectSelect.tsx](../../frontend/app/components/handover/ProjectSelect.tsx)
- [app/components/layout/ClientSwitcher.tsx](../../frontend/app/components/layout/ClientSwitcher.tsx)
- [app/components/tickets/OwnerTagInput.tsx](../../frontend/app/components/tickets/OwnerTagInput.tsx)
- [app/components/ui/BottomSheet.tsx](../../frontend/app/components/ui/BottomSheet.tsx)
- [app/components/ui/select-styles.ts](../../frontend/app/components/ui/select-styles.ts) — baru
- [app/components/ui/Select.tsx](../../frontend/app/components/ui/Select.tsx) — baru
- [app/components/ui/skeleton/DashboardSkeleton.tsx](../../frontend/app/components/ui/skeleton/DashboardSkeleton.tsx)
- [app/components/views/RunbooksView.tsx](../../frontend/app/components/views/RunbooksView.tsx)
- [app/styles/tailwind/base.css](../../frontend/app/styles/tailwind/base.css)
- [app/styles/tailwind/overlays.css](../../frontend/app/styles/tailwind/overlays.css)
- [app/styles/tailwind/utilities.css](../../frontend/app/styles/tailwind/utilities.css)
- [eslint.config.mjs](../../frontend/eslint.config.mjs) — pemetaan komponen form untuk jsx-a11y.

Total 36 file sumber/config berubah pada putaran ini; [daftar mesin](source-audit.json). Tidak ada dependency atau file CSS baru. Perubahan sebelumnya milik pengguna dipertahankan. Tidak ada commit.

**Teks tampilan baru**

Selengkapnya; Belum ada catatan; Tulis; Hari/Bulan/Tahun; Tidak ada data; Reset filter; ringkasan Total … · Puncak … dan rentang tanggal; Cari pilihan…; Tidak ada pilihan yang cocok.; Tambahkan “…” untuk nilai bebas. Label aksesibel baru mencakup buka/tulis memo lengkap, Detail nama staf, dan instruksi ketuk/geser pada grafik. Nilai opsi dan teks bisnis lama dipertahankan.
