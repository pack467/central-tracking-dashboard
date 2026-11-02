import {readFileSync,writeFileSync,existsSync} from 'node:fs';import {basename} from 'node:path';
const root='output/mobile-round3',read=name=>JSON.parse(readFileSync(`${root}/${name}`,'utf8')),before=read('baseline.json'),after=read('screens-audit.json'),source=read('source-audit.json'),inventory=read('select-inventory.json'),pixels=read('desktop-pixels.json'),verify=read('verification-audit.json'),behavior=read('behavior.json'),select=read('select-tests.json'),extra=read('extra-tests.json'),loading=read('loading-quality.json'),dense=read('dense-test.json'),sop=read('sop-form-tests.json');
const fileLink=f=>`[${f.replace('frontend/','') }](../../${f})`,counts=new Map();for(const control of inventory){const group=counts.get(control.file)??[];group.push(control.line);counts.set(control.file,group)}
const widths=[1920,1440,1024,768,390],routes=['dashboard','tickets','monitoring','shift-log','reports','team-roster','master-data','runbooks'],nativeFiles=[...counts.keys()];
const beforeAfter=routes.map(route=>`| ${route} | ${widths.map(w=>`[sebelum](before/${route}-${w}.png) · [sesudah](after/${route}-${w}.png) · [opsi](after/${route}-${w}/open-selected.png)`).join(' | ')} |`).join('\n');
const geometry=after.rows.filter(r=>r.route==='/dashboard').map(r=>{const old=before.rows.find(b=>b.viewport===r.width&&b.route===r.route);return `| ${r.width}${r.width===844?' × 390':''} | ${old.height} | ${r.data.height} | ${r.data.width-r.width}px |`}).join('\n');
const nativeTable=[...counts].map(([file,lines])=>`| ${fileLink(file)} | ${lines.length} | ${lines.join(', ')} |`).join('\n');
const rest=source.changed.filter(f=>!nativeFiles.includes(f.file)).map(f=>`- ${fileLink(f.file)}${f.new?' — baru':''}`).join('\n');
const changed=source.changed.map(f=>f.file).concat('frontend/eslint.config.mjs');
const md=`# Laporan putaran 3 — dropdown dan dashboard mobile

55 select native di 22 file sudah memakai satu engine Select/MultiSelect. Tidak ada select native atau datalist tersisa pada sumber aplikasi maupun DOM yang diuji. Tiket Hari Ini, Memo, Volume, dan Rekap sudah mengikuti rancangan mobile. Lima staf tetap tampil sesuai jawaban pengguna.

**Hasil pemeriksaan akhir**

| Pemeriksaan | Hasil |
| --- | --- |
| Typecheck | Lulus, npm.cmd run typecheck |
| Build tahap A dan B–D | Lulus; [log akhir](final-build.log) |
| Lint seluruh proyek | ${source.lint.errors} error / ${source.lint.warnings} warning lama; baseline ${source.lint.baselineErrors} error. Tidak ada temuan baru setelah normalisasi nomor baris; [audit](source-audit.json), [hasil lengkap](final-lint.json) |
| Sumber native | 55 → 0; termasuk folder app, components, examples |
| Screenshot final | ${after.rows.length} halaman/viewport, 0 console error, 0 overflow horizontal |
| State dropdown | ${verify.rows.filter(r=>r.route).length} halaman dan ${verify.rows.filter(r=>r.form).length} form pada lima ukuran, ${verify.errors.length} error; [audit](verification-audit.json) |
| Runbooks form dokumen | ${sop.rows.length} ukuran, ${sop.errors.length} console error; [audit](sop-form-tests.json) |
| Disabled + modal + empty chart | ${extra.rows.length} ukuran, ${extra.errors.length} console error; [audit](extra-tests.json) |
| Desktop pixel diff | Maksimum ${Math.max(...pixels.map(r=>r.exactPct)).toFixed(3)}%, di luar kontrol filter; semua 24 perbandingan < 0,5%; [hasil](desktop-pixels.json) |
| Keyboard dan fokus | ${select.results.filter(r=>r.pass).length}/${select.results.length} kelompok lulus; [hasil](select-tests.json) |
| StrictMode dan perilaku mobile | ${behavior.results.filter(r=>r.pass).length}/${behavior.results.length} kelompok lulus; [hasil](behavior.json) |

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
${geometry}

Ukuran desktop tetap sama. Perbandingan pixel memakai masker pada trigger/dropdown, segmented filter, dan kontrol filter terkait; konten kartu, tabel, heading, dan grafik tetap masuk perbandingan. Referensi Shift Log memakai screenshot sebelum edit pada server utama agar data handover sama. [Masker](desktop-masks.json), [hasil per halaman](desktop-pixels.json).

**Detail rancangan dan batas kepadatan**

- Tiket memakai satu DOM dengan grid responsif: proyek/ID/severity, judul 14px, kategori/avatar 16px/PIC/status. Judul, ID, proyek, dan PIC memiliki nilai penuh melalui title. Tombol Lihat semua sekunder memiliki panah dan tinggi 44px. Callback pagination dan perilaku baris dipertahankan.
- Memo merender ul/li dari baris memo, dengan marker amber dan jarak 6px. Normalisasi bullet hanya untuk tampilan. Fade dan Selengkapnya muncul jika isi terpotong. Seluruh pratinjau membuka MemoModal yang sama. Kasus kosong, pendek, panjang, serta kesamaan raw localStorage sudah diuji.
- Volume mempertahankan skala jujur, hanya menampilkan total puncak/terakhir, menipiskan label X, dan menjepit tooltip ke dalam kartu. Tap/drag menampilkan tanggal, total, dan tiga rincian proyek; detail tanggal lama tetap tersedia. Empty state memiliki ikon, Tidak ada data, dan Reset filter bila ada filter aktif.
- Data 20 titik muat pada semua ukuran yang diuji. Batang minimum 10px diprioritaskan: celah sekitar 0,74px pada 320px, 2,84px pada 360px, dan 3px mulai 375px. Syarat batang 10px + celah 3px + 31 titik memang membutuhkan lebar plot lebih besar daripada ponsel kecil. Rentang yang tidak muat atau >31 titik memakai slot minimum 14px dan membuka di dekat puncak. [Uji 40 tanggal](dense-test.json): plot ${dense.total}px / viewport ${dense.client}px, puncak terlihat pada posisi awal, overflow halaman 0. Fixture hanya hidup pada browser uji.
- Rekap memakai avatar 32px, nama 14px, jabatan 11px, KPI Hari/Bulan/Tahun 11px dan angka 15px. Hari nol abu-abu, Bulan hijau, Tahun ungu. Chip proyek hanya tampil bila ada isi, dengan gulir horizontal. Seluruh baris membuka detail; chevron 40px dan label Detail nama tersedia.
- Pengecualian target sentuh mengikuti rancangan yang diminta: View/chevron 40px, legenda 32px, dan batang individual 10–14px di dalam plot sentuh 220px. Badge, avatar, dan chip informasi bukan tombol. Opsi select 48px; tombol utama/pagination dan input pencarian minimal 44px.
- Seluruh tinggi panel sama antara skeleton dan data selesai pada uji slow loading. CLS pergantian panel = 0. CLS halaman terukur ${loading.quality.dashboardCls.toFixed(8)} setelah splash, berasal dari teks topbar, bukan pergeseran panel; [rincian](loading-quality.json). Reduced motion teruji tanpa animasi sheet/dropdown.

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

Kontras teks normal minimum ${Math.min(...source.colors.map(c=>c.contrast)).toFixed(2)}:1; [perhitungan](source-audit.json). Animasi buka 120ms dan chevron 150ms mematuhi reduced motion. Panel desktop di-portal, mengikuti scroll/resize, flip ke atas, dan clamp tepi. Pengukuran tinggi flip memasukkan padding dan border panel. Pencarian tersedia untuk >8 opsi.

Keyboard Enter/Space/panah, Home/End, PageUp/PageDown, type-ahead termasuk spasi, Esc, Tab/Shift+Tab diuji. Jalur pilih, Esc, klik luar, Tab, pindah route, serta 20 siklus cepat melepas panel/fokus/scroll dengan benar. Sheet daftar bertingkat dengan sheet filter dan modal Master Data, kembali ke kontrol asal, dan tidak menyisakan inert. StrictMode menjalankan 20 siklus tersendiri termasuk opsi/trigger disabled.

State biru lain yang diselaraskan: tab Volume/MoM Dashboard, badge tab aktif Runbooks, dan badge jumlah filter aktif Tickets. Dimensi badge/tab lama dipertahankan. CSS select native di base.css, overlays.css, utilities.css dihapus setelah inventaris memastikan tidak ada pemakainya. DatePicker, menu aksi, dan kalender mempertahankan komponen sesuai jenis interaksinya.

**Inventaris native yang diganti**

Semua 55 kontrol sebelumnya controlled melalui value/onChange. Opsi, nilai, callback, id, required, disabled, dan grup asal dipertahankan. Nomor baris berikut adalah posisi baseline agar dapat dicocokkan dengan [inventaris lengkap berisi atribut dan opsi](select-inventory.json).

| File | Jumlah | Baris baseline |
| --- | ---: | --- |
${nativeTable}

Dropdown kustom yang disatukan: Shifter Dashboard, Shifter Shift Log, dua filter proyek/sistem MonitoringSchedule, pemilih klien, PIC multi pada tiket, ProjectSelect dengan nilai bebas, serta pemilik tiket dengan nilai bebas. Dua datalist diganti oleh mode searchable/custom yang sama. Field tipe dokumen Runbooks kini terhubung eksplisit dengan labelnya. ESLint mengenali Select/MultiSelect sebagai kontrol form aksesibel.

**Temuan data Tahan — hanya dilaporkan**

Filter Tahan tetap menghasilkan 0 dari 88 tiket. Roster memuat baseMonth 38 dan baseYear 245 di [TicketReportView.tsx](../../frontend/app/components/tickets/TicketReportView.tsx). Saat staffTickets kosong, monthCount memakai baseMonth; yearCount memakai baseYear + todayCount. Karena todayCount 0, kartu menampilkan 38/245. Ini perbedaan basis angka fixture rekap dengan tiket hasil filter. Pencocokan nama, kalkulasi, urutan staf, dan filter tersebut tidak diubah.

Paritas kontrol lama/baru pada proyek APH → tambah Shift Pagi → tambah Open → tambah High menghasilkan 12 → 6 → 0 → 0 tiket dan query URL identik. [Bukti](filter-parity.json). [Uji Tahan](select-tests.json).

**Screenshot sebelum/sesudah**

Tiap tautan opsi mempunyai saudara focus.png, hover.png, active.png, keyboard.png dalam folder yang sama. Closed state berada di screenshot halaman sesudah. Disabled hanya berlaku pada kontrol yang memang dinonaktifkan oleh aplikasi; contohnya pemilih klien pada edit proyek, tidak dipaksakan pada filter halaman yang selalu aktif.

| Halaman | 1920 | 1440 | 1024 | 768 | 390 |
| --- | --- | --- | --- | --- | --- |
${beforeAfter}

| Form | 1920 | 1440 | 1024 | 768 | 390 |
| --- | --- | --- | --- | --- | --- |
${['client','project','system','ticket'].map(form=>`| ${form} | ${widths.map(w=>`[closed](after/form-${form}-${w}.png) · [opsi](after/form-${form}-${w}/open-selected.png)`).join(' | ')} |`).join('\n')}
| Runbooks dokumen | ${widths.map(w=>`[opsi](after/runbooks-form-${w}/open-selected.png)`).join(' | ')} |
| Edit proyek disabled | ${widths.map(w=>`[disabled](extra/project-disabled-${w}.png) · [modal+opsi](extra/project-edit-open-${w}.png)`).join(' | ')} |
| Volume kosong | ${widths.map(w=>`[empty](extra/empty-${w}.png)`).join(' | ')} |

Tambahan: [sheet filter bertingkat](stage1/nested-sheet-390.png), [40 tanggal](extra/dense-40-390.png), [skeleton](loading-390.png). Screenshot Dashboard 320/360/375/412/430/844/1280 terdapat di before dan after dengan nama dashboard-LEBAR.png.

**File tambahan yang berubah di luar inventaris native**

${rest}
- [eslint.config.mjs](../../frontend/eslint.config.mjs) — pemetaan komponen form untuk jsx-a11y.

Total ${changed.length} file sumber/config berubah pada putaran ini; [daftar mesin](source-audit.json). Tidak ada dependency atau file CSS baru. Perubahan sebelumnya milik pengguna dipertahankan. Tidak ada commit.

**Teks tampilan baru**

Selengkapnya; Belum ada catatan; Tulis; Hari/Bulan/Tahun; Tidak ada data; Reset filter; ringkasan Total … · Puncak … dan rentang tanggal; Cari pilihan…; Tidak ada pilihan yang cocok.; Tambahkan “…” untuk nilai bebas. Label aksesibel baru mencakup buka/tulis memo lengkap, Detail nama staf, dan instruksi ketuk/geser pada grafik. Nilai opsi dan teks bisnis lama dipertahankan.
`;
writeFileSync(`${root}/REPORT.md`,md);writeFileSync(`${root}/changed-files.json`,JSON.stringify(changed,null,2));console.log('Report written',md.length,'characters');
