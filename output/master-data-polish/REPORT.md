# Master Data visual polish

Tanggal: 2026-10-28  
Scope: visual/layout only untuk `/master-data` (frontend). Backend, data, route, permission, dan storage tidak diubah. Tidak ada commit.

## 1. Diagnosis (sebelum perubahan)

Diukur dengan Chrome + Playwright pada dev server `localhost:3000`.

| Temuan | Bukti |
| --- | --- |
| Terlalu banyak lapisan sebelum data | Di 1440x900, baris pertama mulai di `y=554` (466 px dari awal area konten yang mulai di `y=88`). Hanya 5 baris penuh terlihat. Di 1024x768 tinggi baris 107 px dan hanya 3 baris penuh. |
| Baris terlalu tinggi / tidak konsisten | Organisasi/Proyek/Sistem 80 px; Kategori 49 px; Severity 43 px. |
| Kolom tidak proporsional | Di 1440x900: identitas 326 px, lalu empat kolom @161 px dan Aksi 154 px. Di 1024 semua kolom menyusut sampai 97 px, sehingga badge dan nama saling mendesak. |
| Kolom sia-sia | Kategori memiliki kolom Deskripsi yang seluruh isinya `—`. |
| Aksi tabel berisik | Tiga aksi teks (`Detail`, `Ubah`, `...`) berulang di setiap baris, tanpa affordance ikon. |
| Ringkasan lemah | Tiga angka berupa teks polos; chip penyimpanan terpisah di kanan dan memakai titik waktu (`09.12`). |
| Modal | Lebar 720 px, field tidak berkelompok, `Status administrasi` sendirian di kolom kiri, helper Kode menambah tinggi baris. |
| Drawer | Ringkasan datar. Pada Kategori konten berakhir di `y=643` sementara panel berakhir di `y=835` (192 px kosong); Severity 134 px kosong. |
| Palette Criticality | Sebelumnya High = amber, Medium = sky, Low = slate; tidak selaras dengan palette severity Dashboard (Critical merah, High oranye, Medium amber, Low teal). |
| CSS legacy | Tidak ditemukan CSS khusus Master Data di `app/globals.css`/`app/styles/*`; tidak ada orphan rule yang perlu dihapus. Semua styling sudah Tailwind. |

`Perlu ditinjau`, menu `Alat` (backup/restore), dan chip status penyimpanan sudah ada. Ketiganya dipertahankan dan diselaraskan dengan tampilan baru; fitur baru tidak dibuat.

## 2. Hasil setelah perubahan

| Ukuran | Sebelum | Sesudah |
| --- | --- | --- |
| Baris pertama, 1440x900 | `y=554` / 466 px dari konten | `y=422` / **334 px** dari konten |
| Baris penuh terlihat, 1440x900 | 5 (Organisasi/Proyek/Sistem) | **7** pada semua sub-kategori (Severity 4 dari 4 data) |
| Baris penuh terlihat, 1920x1080 | — | **10** (Proyek/Sistem); Organisasi 8 dari 8 data |
| Tinggi baris | 80 / 49 / 43 px | **64 px** semua tabel |
| Toolbar | baris filter terpisah, tinggi total ~160 px | **66 px**, satu baris; search/filter/tombol 40 px |
| Header | tiga blok terpisah | satu band 104 px dengan tiga kartu 158x68 px |
| Kolom Kategori | ada kolom Deskripsi berisi `—` | kolom dihapus; deskripsi jadi baris kedua nama |
| Drawer Kategori (Ringkasan) | 192 px kosong | konten 723 px pada panel 687 px (scroll, tidak ada blok kosong) |
| Drawer Relasi Kategori/Severity | 123 px konten, sisa kosong | 3 kartu pemakaian + empty-state terarah, tinggi 647/647 px |
| Criticality | amber/sky/slate | merah/oranye/amber/teal, selaras `SEVERITY_COLORS` Dashboard |
| Horizontal overflow | 0 | **0** di 1920, 1440, 1280, 1024, 768, 390, dan 844x390 |
| Kontras teks terendah | beberapa `slate-500` 3.07:1 | **5.56:1** |
| Kontras badge terendah | — | **9.18:1** |
| Font terkecil | ada 10 px / 10.5 px | **11 px** |
| Touch target Master Data (mobile) | ada 28–40 px | **>= 44 px** |

## 3. Keputusan desain

### Header, ringkasan, navigasi
- Satu header band dengan gradient sky `0.06 -> transparan`, tile Database 44 px, judul 24 px, chip organisasi, dan pill `Perlu ditinjau`.
- Tiga kartu ringkasan 158x68 px (sky/violet/emerald untuk Organisasi/Proyek/Sistem; amber/merah/sky untuk Kategori/Severity/Tiket). Kartu adalah shortcut ke sub-kategori dengan `aria-label`, hover lift, dan focus ring.
- Chip penyimpanan: dot status + `Lokal - Tersimpan HH:mm` (titik waktu diganti titik dua, tooltip menjelaskan penyimpanan lokal). Satu instance di mobile, satu di desktop; tidak ada duplikasi DOM yang terlihat.
- Navigasi satu baris: segmented group berikon, divider, lalu pill sub-kategori dengan count. Operasional dimmed + badge `Segera` + `aria-disabled`; tab bisa di-scroll horizontal tanpa scrollbar terlihat.
- Breadcrumb 11 px di desktop, disembunyikan di mobile untuk menghemat tinggi.

### Toolbar dan tabel
- Toolbar sticky di bawah top bar (`#0f172a`/95 + border), satu baris pada >=1280 px; di 1024 px dan mobile filter masuk sheet. Semua kontrol 40 px di desktop, 44 px di mobile.
- Search dengan ikon, tombol clear, dan label aksesibel. Filter memakai prefix di dalam trigger (`Status: Semua`, `Organisasi: ...`, `Tinjauan: ...`) dan tint sky saat aktif. Hasil filter menampilkan `n <entity>` + `Reset`; mobile juga menampilkan chip filter yang bisa dilepas.
- Tabel `table-fixed` dengan lebar eksplisit per sub-kategori; sticky thead tepat di bawah toolbar (`top:126px` sementara toolbar berakhir di 126 px); hover baris `#243044`/50; baris 64 px; seluruh baris clickable + fokus + Enter.
- Aksi baris menjadi tiga ikon (eye/pencil/ellipsis) dengan tooltip + `aria-label`; muncul saat hover/focus-within di desktop dan selalu terlihat pada pointer kasar/mobile. Menu memakai role menu dan keyboard arrow/Home/End/Escape.
- Pagination dipindah ke footer kartu (`1-8 dari 8`, ukuran 10/25/50, prev/next). Tidak ada kolom yang hanya berisi `—`.
- Marker review di baris: maksimal satu marker sampai 1280–1535 px, dua marker >=1536 px, dan tidak ditampilkan di <=1023 px agar tinggi baris tetap 64 px. Detail record tetap menampilkan semua marker.

### Warna dan identitas
- Avatar inisial 36 px (24 px untuk PIC) memakai 8 tone deterministik dari kode/nama; tile proyek memakai warna organisasi; tile sistem memakai tone emerald.
- Badge memakai background gelap opaque + border jelas:
  - Status: Aktif emerald, Nonaktif slate, Arsip rose.
  - Jenis: Tenant violet, Klien/Mitra sky (dengan ikon).
  - Environment: Production emerald, Staging amber, DRC purple.
  - Criticality: Critical red, High orange, Medium amber, Low teal.
- Dot kategori memakai `categoryChartColor(key, index)` yang sama dengan chart Dashboard; kategori baru memakai hash deterministik yang sudah ada.
- Pemakaian memakai angka mono tabular + bar tipis; Urutan memakai tombol naik/turun yang hanya muncul saat hover/focus, tombol ujung disabled diredupkan.
- Severity memakai badge besar, nama tampil, empat level dot, bar pemakaian, dan aksi Ubah.

### Form modal
- Lebar 760 px (mobile full-screen), header 36 px tile + judul + close 40 px, body scroll, footer sticky.
- Field dikelompokkan menjadi `Identitas`, `Klasifikasi`, dan `Tambahan` (collapsible; otomatis terbuka bila sudah berisi atau ada error).
- Grid dua kolom seimbang; field status memakai lebar penuh agar tidak ada kolom kanan kosong. Helper Kode tampil inline di baris label sehingga tidak menggeser tinggi baris.
- Environment, Criticality, Status memakai radiogroup segmented berwarna (bukan native select), dengan keyboard arrow/Home/End.
- Asterisk wajib kecil berwarna sky; legend `* Wajib diisi` di kiri footer; `Batal` dan `Simpan` di kanan. `Simpan` disabled sampai field wajib lengkap dan menampilkan `Menyimpan…` saat proses. Error field tampil dekat field dengan ikon; fokus pindah ke field invalid pertama di DOM.
- Dialog arsip/pulihkan memakai tile ikon, ringkasan dampak 3 kolom, daftar compact, checkbox konfirmasi, dan tombol bahaya merah.

### Drawer detail
- Lebar 560 px. Header 48 px tile, nama 18 px, chip kode mono, badge status/tipe/criticality, tombol `Ubah`, menu, dan close 40 px.
- Tab `Ringkasan | Relasi n | Riwayat n` dengan underline sky dan roving tabindex.
- Ringkasan memakai kartu `Identitas`, `Klasifikasi`, `Penanggung jawab`, `Deskripsi`, `Pemakaian` (Kategori/Severity), dan `Info teknis` (terbuka default, ID dipotong tengah + copy, waktu relatif + tooltip absolut). Kartu identitas/klasifikasi memakai lebar penuh dan grid internal agar tidak ada sisi kosong.
- Relasi memakai icon row + count + `Lihat daftar`; Kategori/Severity memakai kartu pemakaian + empty-state terarah (tidak ada ruang kosong besar). Riwayat berupa timeline dengan avatar inisial aktor, waktu relatif, detail perubahan, dan penanda `Awal riwayat` di ujung bawah; empty state juga mengisi panel.
- Enter transition 180 ms (slide/fade); `prefers-reduced-motion` menonaktifkan transition property. Scroll lock/focus return diuji pada 20 siklus buka-tutup.

### Mobile
- Header: tile + judul + storage chip; chip organisasi disembunyikan di <640 px agar tetap ringkas. Tiga kartu statistik dalam satu baris scroll horizontal.
- Toolbar: search penuh + sheet filter + tombol Tambah; filter chips 44 px.
- Baris tabel menjadi kartu dengan avatar/tile, nama, kode, konteks, badge status, count, dan tombol tiga titik 44 px; tap baris membuka drawer.
- Form full-screen dengan section dan segmented chip yang wrap, footer sticky dengan safe-area, input 16 px, semua touch target Master Data >=44 px.
- Pada layar pendek 844x390, kartu statistik disembunyikan dan toolbar menjadi satu baris agar data tetap terlihat; tidak ada horizontal scroll.

## 4. File yang diubah

- `frontend/app/components/views/MasterDataView.tsx` — header band, stat cards, storage chip, navigation counts, toolbar composition, states, pagination footer.
- `frontend/app/components/master-data/master-ui.tsx` — button/input primitives, badge maps, severity badge, avatars, entity tiles, usage bar, review marker, PIC/context helpers.
- `frontend/app/components/master-data/MasterNavigation.tsx` — one-row grouped navigation, counts, mobile sheet.
- `frontend/app/components/master-data/MasterFilters.tsx` — one-row toolbar, prefix filters, search clear, active chips, mobile sheet, result/reset.
- `frontend/app/components/master-data/MasterList.tsx` — explicit columns, 64 px rows, avatars/tiles/badges, icon actions, category usage/order, severity level dots, mobile cards, card footer.
- `frontend/app/components/master-data/MasterForm.tsx` — grouped form sections, segmented controls, inline code hint, collapsible Tambahan, disabled save, footer legend, error focus.
- `frontend/app/components/master-data/MasterDetail.tsx` — rich header, tabs, summary cards, usage/relations, timeline/empty states, copy actions, info teknis.
- `frontend/app/components/master-data/MasterStatusDialog.tsx` — warning/impact dialog styling, red danger button, compact impact summary.
- `frontend/app/components/ui/Modal.tsx` — 760 px master form width, enter transitions, reduced-motion handling, visible-element autofocus filter.
- `frontend/app/components/ui/skeleton/MasterDataSkeleton.tsx` — skeleton shapes/height match new header, toolbar, table, and mobile cards.

Tidak ada file CSS baru, tidak ada `!important`, tidak ada dependency baru. `MasterTools.tsx`, `MasterReviewView.tsx`, dan `MasterMappingWorkspace.tsx` tidak diubah; `MasterTools` otomatis memakai primitive tombol baru.

## 5. Teks UI baru/perubahan (Indonesia)

Header/nav/toolbar: `Lokal - Tersimpan HH:mm`, `Organisasi aktif`, `Proyek aktif`, `Sistem aktif`, `Kategori aktif`, `Tiket terhubung`, `Perlu ditinjau`, `Status:`, `Jenis:`, `Organisasi:`, `Proyek:`, `Tinjauan:`, `Filter`, `Tampilkan hasil`, `Reset`, `Hapus pencarian`, `Tidak ada hasil`, `Belum ada data`, `Coba lagi`, `Baris`, `Daftar belum dapat dimuat.`, `Halaman sebelumnya`, `Halaman berikutnya`.

Tabel/drawer: `Belum ditetapkan`, `Pemetaan lengkap`, `Belum ada deskripsi`, `Tambah`, `Pemakaian`, `Tingkat`, `Awal riwayat`, `Tidak ada relasi struktural`, `Kategori/Severity ini dipakai lewat tiket, bukan proyek atau sistem.`, `Riwayat perubahan akan muncul di sini setelah data disunting.`, `Dihitung dari tiket terkait.`, `mengubah n field`, `Nilai asli`, `Nama kini:`, `Info teknis`, `Dibuat`, `Diubah`, `Salin kode`, `Salin ID`, `Identitas`, `Klasifikasi`, `Penanggung jawab`, `Deskripsi`, `Lingkup layanan`.

Form/arsip: `Kembali`, `Tutup form`, `Tambahan`, `Opsional`, `Wajib diisi`, `Menyimpan…`, `Status administrasi`, `PIC utama`, `Lead / PIC teknis`, `Klien/Mitra terkait`, `PIC sistem`, `Referensi dashboard/runbook`, `Nama resmi`, `Nama singkat`, `Nama kontak`, `Email kontak`, `Telepon kontak`, `Dikonfirmasi`, `Dikunci: proyek sudah dipakai.`, `Pilih organisasi terlebih dahulu.`, `Otomatis dari nama`, `Maksimal 24 karakter`, `Arsipkan data`, `Pulihkan data`, `Ya, arsipkan`, `Contoh penggunaan`, `Saya memahami dampak arsip ini.`.

Label lama yang dipertahankan: `Master Data`, `Organisasi & Layanan`, `Referensi Tiket`, `Operasional`, `Segera`, `Perlu ditinjau`, `Detail`, `Ubah`, `Arsipkan`, `Pulihkan`, `Batal`, `Simpan`, `Coba lagi`.

## 6. Verifikasi

- `npm run typecheck` — pass.
- `npx eslint` pada 10 file yang diubah — pass. Repo-wide lint masih memiliki 169 error lama di file di luar scope (hooks/auth/unrelated tests); tidak menambah error baru.
- `npm run build` — pass.
- Perilaku diuji: pencarian + clear, filter status/jenis/organisasi/tinjauan, reset, empty/no-result, pagination (`1-25 dari 47`, size 25), deep link `?detail=`, tab drawer, sheet filter mobile, add Organisasi (valid), duplicate code error, reorder kategori, arsip + pulihkan, edit system/project, focus first-invalid.
- 20 siklus buka/tutup drawer: `body/html overflow` kembali `visible`, `[inert]` = 0, tidak ada dialog tersisa, halaman bisa di-scroll.
- Focus kembali ke trigger setelah form/drawer ditutup.
- `prefers-reduced-motion: reduce`: `transition-property: none`.
- Console: 0 error baru. Satu warning lama: `<link rel=preload> must have a valid as value`.
- CLS 1440x900 = 0.0031; 390x844 = 0.0002 (di bawah threshold 0.01; tidak ada shift blok setelah data muncul).
- Kontras teks terendah 5.56:1; badge terendah 9.18:1; ikon minimal 5.7:1. Font minimum 11 px. Touch target Master Data minimum 44 px. Horizontal overflow 0 di semua ukuran uji.
- Perubahan hanya di komponen Master Data + `Modal` (filter autofocus elemen tersembunyi). Tidak ada route atau komponen visual halaman lain yang diubah.

## 7. Screenshot

- Setelah: `output/master-data-polish/after/` — 111 PNG.
  - List 5 sub-kategori di 1920x1080, 1440x900, 1280x800, 1024x768, 768x1024, 390x844, 844x390.
  - Drawer Ringkasan/Relasi/Riwayat untuk 5 entitas di 1440x900, 1024x768, 390x844.
  - Form add/edit tiap entitas, form error, dialog arsip, no-results, loading, di desktop dan mobile.
- Sebelum: `output/master-data-polish/before/` — 61 PNG (capture baseline) + `overview-1440x900.png` dan `overview-390x844.png` dari UI lama.
- Metrik kontrak: `output/master-data-polish/final-contract-checks.json`.

Catatan: enter transition drawer/form 180 ms diterapkan; penutupan tetap sinkron agar scroll lock dan focus return tidak tertunda.
