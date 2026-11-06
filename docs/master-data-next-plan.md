# Plan Lanjutan Halaman Master Data

> **Dicabut sebagian (28 Oktober 2026).** Bagian 2–6 dan 10 dokumen ini digantikan oleh [Tinjauan Cakupan Halaman Master Data](master-data-scope-review.md). Fitur "Perlu ditinjau", "Tinjau referensi", cadangan JSON, tampilan tersimpan, edit massal, riwayat gabungan, dan penggabungan record dibatalkan; kodenya untuk "Perlu ditinjau", pemetaan, dan cadangan disembunyikan di balik `MASTER_DATA_P0_ENABLED` (lihat [kontrak API](master-data-api-contract.md#fitur-p0-yang-disembunyikan)). Tahap 1 dan 2 tinjauan itu (Personel, Peran, hapus aman) sudah dikerjakan.

> **Peta modul frontend (29 Oktober 2026).** Penyimpanan dipecah dari satu file besar menjadi `services/master-store.ts` (state dan penyimpanan), `master-transaction.ts`, `master-delete-rules.ts`, `master-catalog-store.ts`, `master-people-store.ts`, `master-roles-store.ts`, dan `master-review-store.ts` (P0, disembunyikan); `master-data-repository.ts` tinggal fasad. Komponen bersama ada di `components/master-data/`: `form-ui`/`form-hooks` (form), `dialog-ui` (dialog konfirmasi), `detail-ui` (header detail), `menu-ui` (menu aksi), `master-ui` (kelas dan avatar). Aturan: kode baru memakai komponen ini dan tidak menyalin kerangkanya; perubahan pada file Master Data harus lolos `scripts/snap.cjs compare`. Rinciannya di [master-data-refactor-plan.md](master-data-refactor-plan.md).

Tanggal: 27 Oktober 2026  
Status: **Rencana saja — belum dieksekusi.**  
Cakupan pengerjaan yang diusulkan: **frontend, mock data, dan dokumentasi. Backend tetap tidak disentuh.**

Prioritas berikutnya adalah memperjelas kelengkapan dan penggunaan data, kemudian menambah konfigurasi yang dipakai pekerjaan operasional. Organisasi, Proyek, Sistem, Kategori, dan Severity sudah tersedia; fondasi tersebut tidak perlu dibuat ulang.

Dokumen ini melanjutkan [plan awal](master-data-plan.md), berdasarkan pemeriksaan source frontend dan [laporan implementasi v2](../output/master-data-round1/REPORT.md). [Kontrak API](master-data-api-contract.md) menjadi catatan kompatibilitas, bukan instruksi mengerjakan backend.

## 1. Posisi saat ini

| Bagian | Kondisi sekarang | Arah lanjutan |
| --- | --- | --- |
| Organisasi, Proyek, Sistem | Daftar, detail, form, relasi, arsip/pulihkan tersedia | Perjelas kelengkapan, penggunaan, dan status induk |
| Kategori dan Severity | Terhubung ke form/filter tiket; key/kode tetap | Pertahankan identitas dan rapikan kemudahan pengelolaannya |
| Riwayat | Tersedia pada detail record | Nama field/nilai lebih mudah dibaca dan dapat difilter |
| Dampak arsip | Menghitung dataset simulasi lengkap | Tampilkan cakupan relasi yang diketahui dan yang belum terpetakan |
| Penyimpanan | Mock lokal dengan migrasi v1/v2 dan fallback sesi | Tambahkan penjelasan lokasi data dan cadangan yang dapat diunduh |
| Operasional | Masih nonaktif, berlabel Segera | Aktifkan bertahap setelah modulnya mempunyai alur lengkap |
| Referensi lama | Resolver ID/key/alias sudah tersedia | Sediakan peninjauan manual untuk kasus yang belum jelas |

Yang perlu dipahami sebelum menambah fitur:

- Sebagian tiket/checkpoint lama belum mempunyai systemId. Angka dampak sistem nol tidak selalu berarti sistem belum pernah digunakan.
- Label operasional seperti APH dapat muncul tanpa proyek master yang sesuai. Nama yang mirip belum cukup untuk menetapkan hubungan.
- Definisi Organisasi dengan jenis Tenant/Klien masih merupakan keputusan sementara.
- Data lokal belum menjadi data bersama lintas perangkat. Status Tersimpan perlu tetap menjelaskan konteks ini.

## 2. Urutan prioritas

| Prioritas | Tambahan | Alasan | Hasil yang dituju |
| --- | --- | --- | --- |
| P0 | Pemeriksaan kelengkapan dan pemetaan referensi lama | Mencegah hubungan yang salah atau dianggap lengkap padahal belum | Pengelola mengetahui record yang perlu ditinjau |
| P0 | Rincian penggunaan, cakupan dampak, dan status induk | Membantu menilai arsip/pemulihan | Keputusan berdasarkan informasi yang jelas |
| P0 | Penanda data lokal dan cadangan JSON | Data masih berada di browser | Pengguna dapat menyimpan salinan data master |
| P1 | Template Monitoring | Menghubungkan master layanan dengan pemeriksaan rutin | Jadwal pemeriksaan dapat dikonfigurasi dari satu sumber |
| P1 | Kontak dan alur eskalasi | Mengurangi pengulangan PIC/kontak di beberapa halaman | Kontak dapat dipakai bersama oleh layanan dan Runbooks |
| P2 | Jam Layanan dan Kebijakan SLA | Target membutuhkan aturan waktu dan lingkup yang jelas | Target konsisten, dengan versi dan tanggal berlaku |
| P3 | Import/export CSV dan tampilan tersimpan | Mempercepat pengelolaan ketika data sudah banyak | Pengelola tidak perlu mengisi semuanya satu per satu |
| P3 | Edit massal terbatas dan riwayat gabungan | Mempercepat pekerjaan berulang | Perubahan tetap dapat ditinjau sebelum disimpan |
| Opsional | Definisi shift, dependensi sistem, inventaris tambahan | Bergantung kebutuhan nyata | Master tetap ringkas |

**Paket pengerjaan yang direkomendasikan lebih dahulu: seluruh P0.** Setelah itu, kerjakan Template Monitoring dan Kontak/Eskalasi. SLA menyusul setelah aturan layanan disepakati.

## 3. P0 — Pemeriksaan kelengkapan data

Tambahkan akses **Perlu ditinjau** di dekat ringkasan atau sebagai filter. Tidak perlu membuat dashboard grafik baru.

| Pemeriksaan | Penanda | Tindakan |
| --- | --- | --- |
| PIC belum ditetapkan | Belum ada PIC | Buka form untuk memilih PIC atau tetap biarkan kosong |
| PIC lama masih berupa teks | PIC lama | Tinjau apakah pengguna internal atau kontak eksternal |
| Referensi proyek belum cocok | Belum terpetakan | Buka peninjauan pemetaan |
| Satu referensi cocok ke beberapa calon | Ambigu | Minta pilihan pengelola; tidak memilih otomatis |
| Anak aktif, induk nonaktif/arsip | Induk nonaktif | Buka detail induk dan jelaskan pembatasan transaksi baru |
| Sistem belum memiliki referensi operasional eksplisit | Cakupan belum lengkap | Tampilkan batas hitungan penggunaan |
| Field wajib/relasi tidak valid | Perlu diperbaiki | Arahkan ke record dan field terkait |

PIC kosong merupakan informasi kelengkapan, bukan otomatis kesalahan. Pengguna tetap boleh menyimpan data yang memang belum mempunyai PIC.

Input baru yang diperlukan hanya filter dan keputusan peninjauan. Jumlah masalah, jumlah referensi, serta status kelengkapan dihitung otomatis.

Desktop: daftar ringkas dengan kolom Jenis, Record, Temuan, Pemakaian, dan Tindakan. Mobile: kartu berisi nama, satu temuan utama, jumlah referensi, dan tombol Tinjau. Klik temuan membuka detail terkait tanpa mengganti organisasi aktif di topbar.

## 4. P0 — Peninjauan pemetaan referensi lama

Tambahkan alur **Tinjau referensi**, terutama untuk proyek dan sistem yang belum memiliki hubungan ID lengkap.

| Data/input | Kebutuhan | Bentuk UI |
| --- | --- | --- |
| Organisasi sumber | Wajib diketahui sebelum menetapkan pemetaan | Konteks otomatis dari record sumber |
| Jenis sumber | Otomatis: tiket, checkpoint, atau handover | Label |
| Nilai lama dan contoh pemakaian | Otomatis | Teks asli dan beberapa contoh |
| Target proyek | Wajib jika keputusan Menghubungkan | Select dengan pencarian, dibatasi organisasi |
| Target sistem | Opsional; diisi hanya bila memang diketahui | Select berdasarkan proyek |
| Keputusan | Wajib | Hubungkan, Tetap sebagai label operasional, Tunda |
| Alasan/catatan | Wajib untuk keputusan yang ambigu atau pengecualian | Textarea pendek |
| Pengelola dan waktu keputusan | Otomatis | Informasi riwayat |

Alur: pilih temuan → baca contoh → pilih keputusan/target → lihat dampak → konfirmasi → catat riwayat.

Aturannya:

- Pemetaan dibatasi organisasi dan tidak mengubah ID master.
- Pemetaan ke sistem membutuhkan bukti relasi; seluruh tiket proyek tidak otomatis dianggap milik satu sistem.
- Nilai transaksi lama tetap tersimpan. Pemetaan menjadi referensi tambahan yang dapat ditinjau kembali.
- Perubahan pemetaan menampilkan daftar penggunaan yang terpengaruh.
- Sistem tidak membuat proyek baru atau menggabungkan record hanya karena namanya mirip.
- Label seperti NOC boleh tetap menjadi label operasional jika tidak merepresentasikan proyek.

Desktop memakai dua panel: referensi lama dan calon target. Mobile memakai langkah satu kolom: Sumber → Target → Preview. Contoh tiket cukup diringkas; daftar operasional lengkap dibuka melalui tautan terfilter.

## 5. P0 — Rincian penggunaan dan dampak yang lebih jelas

Perluas bagian Relasi dan dialog arsip yang sudah ada.

Yang ditampilkan:

- Jumlah tiket/checkpoint terkait, termasuk yang aktif.
- Contoh record dan tautan Lihat semua ke halaman operasional dengan filter yang sesuai.
- Pemisahan relasi melalui ID, pemetaan legacy yang sudah ditinjau, dan referensi yang belum jelas.
- Penjelasan jika angka sistem belum mencakup seluruh histori.
- Status administrasi record dan keadaan induknya secara terpisah.

Contoh label:

```text
Status record: Aktif
Induk: Diarsipkan
Pilihan pekerjaan baru: Tidak tersedia

Penggunaan sistem: 3 tiket terhubung
Sebagian referensi lama belum dipetakan
```

Hindari menampilkan 0 dengan makna “tidak pernah dipakai” ketika cakupannya belum lengkap. Jika persentase kelengkapan belum dapat dihitung secara benar, gunakan jumlah referensi dan penanda Belum lengkap.

Desktop: Ringkasan, Relasi/Penggunaan, dan Riwayat tetap menggunakan drawer yang ada. Mobile: tiga bagian yang sama dalam detail layar penuh, dengan daftar contoh pendek dan tombol Lihat semua.

Kebijakan pemindahan proyek yang sudah dipakai tetap membutuhkan alur tersendiri. Perencanaan ini tidak membuka dropdown pemindahan bebas.

## 6. P0 — Kejelasan penyimpanan dan cadangan

Saat mock aktif, tambahkan konteks kecil **Lokal · Tersimpan 10:35**. Status Hanya sesi ini tetap dipakai ketika storage tidak tersedia. Informasi ini tidak perlu menjadi kartu statistik besar.

Tambahkan menu pengelola **Unduh cadangan** dan **Pulihkan cadangan**.

| Input/informasi | Kebutuhan |
| --- | --- |
| Nama file | Dibuat otomatis; boleh disesuaikan |
| Isi cadangan | Data Master Data, ID, relasi, status, versi, dan informasi riwayat yang relevan |
| File pemulihan | JSON dengan versi/skema yang dikenali |
| Preview pemulihan | Jumlah record, organisasi yang tercakup, perubahan dan konflik |
| Konfirmasi | Wajib sebelum mengganti data lokal |

Cadangan hanya mengambil data master, bukan seluruh localStorage. Password, token login, dan kredensial tidak termasuk. Pemulihan memvalidasi semua relasi terlebih dahulu dan mempertahankan data sekarang jika file gagal diproses.

Cadangan JSON mengembalikan struktur data; export CSV pada tahap berikutnya ditujukan untuk daftar yang dapat dibaca/diolah pengguna. Keduanya mempunyai tujuan berbeda.

## 7. P1 — Template Monitoring

Ini merupakan modul operasional berikutnya yang paling relevan untuk ditambahkan.

| Field | Kebutuhan | Input |
| --- | --- | --- |
| Proyek | Wajib | Select dengan pencarian |
| Organisasi | Otomatis dari proyek | Hanya ditampilkan |
| Sistem | Opsional; pilih jika pemeriksaan memang spesifik sistem | Select berdasarkan proyek |
| Nama pemeriksaan | Wajib | Teks singkat |
| Langkah pemeriksaan | Wajib | Textarea terstruktur sederhana |
| Kriteria normal/OK | Wajib | Textarea pendek |
| Penanggung jawab default | Disarankan | Pengguna/tim dari sumber yang sama dengan Team Roster |
| Hari pemeriksaan | Wajib | Pilihan hari |
| Jam pemeriksaan | Wajib, dapat lebih dari satu | Time picker dan chip jam |
| Zona waktu | Wajib | Pilihan zona waktu; ikuti konteks operasional |
| Berlaku mulai | Wajib | Date picker |
| Berlaku sampai | Wajib untuk pemeriksaan sementara | Date picker |
| Referensi runbook/dashboard | Opsional | Pilih dokumen atau URL |
| Status | Default Draft | Draft, Aktif, Arsip |

Daftar menampilkan Nama, Proyek/Sistem, Jadwal, PIC, Status, dan Aksi. Detail menampilkan instruksi, kriteria OK, jadwal dan versi.

Desktop: form dua kolom atau halaman khusus jika instruksi panjang; jadwal ditampilkan sebagai hari dan chip waktu. Mobile: satu kolom dengan bagian Identitas, Pemeriksaan, Jadwal, dan Tambahan; footer Simpan tetap terlihat.

Validasi dan integrasi:

- Pilihan proyek/sistem harus aktif dan memiliki induk yang valid.
- Jam ganda, periode terbalik dan jadwal tanpa hari ditolak.
- Preview memperlihatkan beberapa waktu pemeriksaan berikutnya sebelum aktivasi.
- Pengubahan template berlaku untuk pemeriksaan berikutnya; hasil pemeriksaan lama tetap memakai identitas/instruksi versi saat itu.
- Halaman Monitoring memakai referensi template, proyek dan sistem melalui ID.
- Hasil OK/NOK, bukti, dan catatan pelaksanaan tetap di Monitoring.

Untuk tahap frontend, jadwal dan preview memakai mock yang dapat diuji. Menyimpan template tidak boleh menyatakan bahwa penjadwal server sudah berjalan.

## 8. P1 — Kontak dan alur eskalasi

Gunakan sumber kontak bersama dengan Runbooks. Data pengguna internal tetap berasal dari Team Roster/identitas pengguna; tidak dibuat salinan akun baru.

### Kontak

| Field | Kebutuhan | Input |
| --- | --- | --- |
| Jenis kontak | Wajib | Internal atau Eksternal |
| Pengguna | Wajib untuk internal | Select pengguna |
| Nama kontak | Wajib untuk eksternal | Teks |
| Organisasi | Disarankan untuk eksternal | Select organisasi |
| Fungsi/tanggung jawab | Wajib | Teks singkat, misalnya L2 atau vendor jaringan |
| Email/telepon | Minimal satu kanal untuk kontak operasional aktif | Diikuti dari pengguna atau diisi untuk kontak eksternal |
| Proyek/sistem yang dilayani | Disarankan | Pilihan relasi |
| Jam dapat dihubungi | Opsional pada tahap awal | Pilih jam layanan |
| Status | Default Aktif | Aktif/Nonaktif/Arsip |

Draft kontak boleh disimpan sebelum kanal lengkap. Penanda kontak belum siap lebih baik daripada mewajibkan nomor palsu. Jika kebijakan organisasi mengizinkan pengubahan data pengguna internal, perubahan tetap dilakukan melalui pengelolaan pengguna.

### Alur eskalasi

Input: nama alur, lingkup proyek/sistem, severity pemicu, kontak level 1/2/3 sesuai kebutuhan, jeda antarlevel dalam menit, jam berlaku, dan status.

Desktop menampilkan urutan level vertikal dengan ringkasan kontak dan waktunya. Mobile memakai kartu per level. Aksi awal yang berguna: Lihat kontak, Salin nomor, dan Buka Runbook.

Kriteria selesai: satu pengubahan kontak tercermin pada pemilih PIC/Runbooks yang memakai referensi sama; kontak arsip tetap terbaca pada histori dan tidak ditawarkan untuk konfigurasi baru. Pengiriman pesan otomatis memerlukan rancangan dan otorisasi tersendiri.

## 9. P2 — Jam Layanan dan Kebijakan SLA

SLA dikerjakan setelah lingkup layanan dan aturan waktu ditetapkan. Jam Layanan perlu tersedia sebelum kebijakan berbasis jam kerja dapat diaktifkan.

### Jam Layanan

| Field | Kebutuhan |
| --- | --- |
| Nama dan zona waktu | Wajib |
| Mode 24×7 atau jam tertentu | Wajib |
| Hari layanan dan rentang jam | Wajib untuk jam tertentu |
| Dukungan lintas tengah malam | Perlu |
| Tanggal pengecualian/libur | Opsional; input tanggal dan keterangan |
| Masa berlaku dan status | Perlu |

Desktop: grid hari dan jam. Mobile: kartu setiap hari dengan kontrol tambah rentang jam. Tampilkan preview kapan layanan aktif pada zona waktu yang dipilih.

### Kebijakan SLA

| Field | Kebutuhan | Input |
| --- | --- | --- |
| Nama kebijakan | Wajib | Teks |
| Lingkup | Wajib | Organisasi/proyek yang jelas; default dan pengecualian ditetapkan eksplisit |
| Jam layanan | Wajib | Pilih kalender/jam layanan |
| Target respons | Wajib untuk empat severity | Menit |
| Target penyelesaian | Wajib untuk empat severity | Menit |
| Aturan mulai, selesai, dan jeda | Wajib disepakati | Pilihan dari alur tiket yang sudah ada |
| Berlaku mulai | Wajib | Tanggal/waktu |
| Berlaku sampai | Opsional | Tanggal/waktu |
| Versi dan status | Otomatis/default Draft | Draft, Aktif, Arsip |

Desktop: matriks empat severity dengan kolom Respons dan Penyelesaian. Mobile: empat kartu severity. Warna/kode severity tetap mengikuti master yang sudah ada.

Perilaku penting:

- Kebijakan yang tumpang tindih pada lingkup/periode sama harus ditinjau sebelum aktivasi.
- Tiket menyimpan referensi versi SLA yang berlaku, sehingga perubahan baru tidak menghitung ulang histori secara diam-diam.
- Preview menggunakan contoh waktu mulai, jam layanan dan target untuk memperlihatkan hasil perhitungan.
- Status Pending/RCA atau lainnya tidak otomatis menghentikan SLA tanpa keputusan bisnis.
- SLA aktif harus dipakai oleh tampilan/perhitungan tiket yang relevan. Jika baru sebatas prototipe, tampilkan sebagai Draft/Simulasi.

## 10. P3 — Produktivitas pengelola

| Fitur | Input utama | Desktop | Mobile | Batas awal |
| --- | --- | --- | --- | --- |
| Urutan daftar | Nama A–Z/Z–A, terakhir diubah | Select kecil di toolbar | Di sheet filter | Gunakan kemampuan sort adapter yang sudah ada |
| Tampilan tersimpan | Nama tampilan, kategori, pencarian/filter/urutan | Menu tampilan | Sheet pilihan | Simpan preferensi pribadi lokal dahulu |
| Export CSV | Jenis master, lingkup, kolom | Menu Export | Menu tambahan | Mengikuti filter dan izin; kolom kontak dipilih secara jelas |
| Import CSV | File, jenis master, pemetaan kolom | Halaman preview | Alur bertahap dengan ringkasan/error per baris | Organisasi/proyek/sistem/kategori dahulu |
| Edit massal | Pilihan record, PIC atau status baru | Checkbox dan toolbar aksi | Mode Pilih dengan footer aksi | Tidak mencakup pemindahan induk atau penggabungan record |
| Riwayat gabungan | Entitas, organisasi, pelaku, tanggal | Daftar terfilter | Kartu perubahan | Tetap jelas bahwa riwayat mock berasal dari penyimpanan lokal |

Import: unggah → pilih kolom → validasi → preview tambah/perubahan → konfirmasi → hasil. Perubahan record existing membutuhkan ID atau aturan kode dalam lingkup yang ditetapkan; nama saja tidak cukup. Kesalahan tidak boleh diam-diam melewati baris.

Edit massal: preview seluruh dampak dan aturan induk/organisasi aktif terakhir sebelum simpan. Untuk mock, rencanakan perubahan sebagai satu operasi utuh agar kegagalan tidak meninggalkan sebagian data berubah.

Pengubahan urutan kategori yang melibatkan beberapa record juga perlu satu operasi utuh; jangan bergantung pada dua penyimpanan berurutan yang dapat gagal di tengah.

## 11. Penyempurnaan master yang sudah ada

| Area | Tambahan yang berguna | Yang tetap dipertahankan |
| --- | --- | --- |
| Organisasi | Penanda PIC belum lengkap, status induk/relasi, akses penggunaan | Form utama tetap ringkas; logo opsional |
| Proyek | Referensi runbook, cakupan pemetaan, penanda konfigurasi monitoring/SLA | Kode dan prefix tiket tetap dibedakan |
| Sistem | Label PIC efektif “Ikut PIC proyek”, daftar penggunaan yang jelas | Criticality terpisah dari severity dan kondisi berjalan |
| Kategori | Preview nama pada dropdown dan grafik; urutan yang aman | Key stabil dan pemakaian turunan |
| Severity | Preview label di filter/dropdown | Empat kode/level dan palet baca saja |
| Riwayat | Label Nama, PIC, Status menggantikan nama field teknis; ID ditampilkan sebagai kode/nama bila diketahui | Nilai audit asli tetap dapat dibaca; perubahan lama tidak ditulis ulang |
| Form | Pesan hubungan yang berubah, pemulihan isi jika gagal, pembukaan field opsional yang bermasalah | Validasi dekat field dan perlindungan perubahan belum disimpan |

Untuk referensi audit yang tidak lagi dapat ditemukan, tampilkan ID dengan penanda Tidak ditemukan. Jika memakai nama referensi terkini, bedakan dari nama yang tersimpan pada kejadian lama agar riwayat tidak menyesatkan.

## 12. Struktur menu dan tampilan setelah bertambah

```text
Master Data
├── Organisasi & Layanan
│   ├── Organisasi
│   ├── Proyek
│   └── Sistem
├── Referensi Tiket
│   ├── Kategori
│   ├── Severity
│   └── Kebijakan SLA       [setelah siap]
└── Operasional
    ├── Template Monitoring [tahap pertama]
    ├── Kontak & Eskalasi   [tahap pertama]
    └── Jam Layanan         [sebelum aktivasi SLA]
```

Perlu ditinjau, Riwayat gabungan, dan Import/Export menjadi akses alat pengelola, sehingga tidak menambah sederet tab master. Definisi shift hanya dimasukkan bila kebutuhan pada bagian berikut disetujui.

Operasional tetap berlabel Segera sampai setidaknya satu modulnya mempunyai daftar, form, detail, validasi, penyimpanan mock dan integrasi konsumen yang lengkap. Subkategori yang belum siap tetap nonaktif dengan label yang jelas.

Desktop ≥1024px:

- Pertahankan kelompok dan subkategori saat ini, tiga angka ringkas, status simpan kecil, serta tabel sekitar 5–6 kolom.
- Tambahkan akses Perlu ditinjau dan menu alat pengelola, bukan banyak kartu besar.
- Detail sederhana tetap drawer; konfigurasi jadwal/SLA kompleks menggunakan halaman atau editor yang cukup luas.
- Klik penggunaan/relasi mempertahankan konteks topbar dan membuka tujuan yang sudah terfilter.

Mobile <1024px:

- Pertahankan pemilih kategori berupa sheet berkelompok, pencarian terlihat, filter dalam sheet dan chip aktif.
- Gunakan kartu satu kolom; rincian tambahan dibuka ketika diperlukan.
- Form panjang dibagi ke beberapa bagian, bukan matriks desktop yang dipaksa bergulir horizontal.
- Target sentuh minimal 44px, teks minimal 11px, input teks 16px, serta footer yang menyesuaikan keyboard dan safe-area.
- Terapkan pemulihan fokus dan pelepasan kunci scroll pada semua jalur penutupan.

## 13. Hak akses yang diusulkan

| Aksi | Pengelola Master Data | Lead operasional | Operator/Viewer |
| --- | --- | --- | --- |
| Kelola lima master yang sudah ada | Sesuai izin saat ini | Baca | Baca |
| Putuskan pemetaan referensi | Kelola | Tinjau/usulkan jika diberi izin | Baca sesuai lingkup |
| Template Monitoring | Kelola | Tambah/ubah sesuai lingkup izin | Baca |
| Kontak/Eskalasi | Kelola | Tambah/ubah sesuai lingkup izin | Baca sesuai kebutuhan |
| Jam Layanan dan SLA | Kelola dan aktivasi | Tinjau/usulkan | Baca |
| Import, pemulihan cadangan, edit massal | Izin khusus pengelola | Tidak secara default | Tidak |
| Export | Sesuai izin dan kolom yang diperbolehkan | Sesuai izin | Tidak secara default |

Peta di atas merupakan usulan frontend/mock, bukan pemberian izin produksi. Role, pengelolaan akun dan katalog permission bebas tetap berada di administrasi akses tersendiri.

## 14. Fitur opsional dan yang belum perlu

| Fitur | Keputusan |
| --- | --- |
| Definisi shift | Tambahkan hanya jika perlu konfigurasi jam/kode yang dipakai ulang. Penjadwalan staf tetap di Team Roster. |
| Dependensi antarsistem | Berguna jika analisis dampak layanan memang membutuhkannya; mulai dari daftar relasi, bukan diagram besar. |
| Hostname/IP/lokasi/aset | Tambahkan jika Master Data akan menjadi inventaris infrastruktur; bukan field wajib semua sistem. |
| Logo organisasi | Pelengkap tampilan, prioritas rendah. |
| Duplikasi template | Berguna setelah Template Monitoring stabil; hasil duplikasi Draft dengan ID baru. |
| Penggabungan record/pindah organisasi | Tunda sampai aturan histori, dampak dan konflik jelas. |
| Status tiket bebas dan severity tambahan | Belum perlu; memengaruhi alur, badge, grafik dan perhitungan. |
| Grafik besar/analytics baru | Tidak menjadi prioritas Master Data. |
| Hasil monitoring, isi tiket, jadwal harian staf | Tetap di halaman operasional masing-masing. |
| Password/token/kredensial | Tidak menjadi input Master Data. |
| Hapus permanen data yang sudah dipakai | Tidak menjadi aksi umum. |

## 15. Urutan pengerjaan dan kriteria selesai

| Tahap | Lingkup | Kriteria selesai |
| --- | --- | --- |
| A | Pemeriksaan kelengkapan, pemetaan dan cakupan dampak | Referensi tidak dikenal/ambigu terlihat; keputusan pemetaan tercatat; riwayat tidak berubah diam-diam |
| B | Penanda penyimpanan lokal dan cadangan | Lokasi penyimpanan dipahami; backup/restore tervalidasi tanpa merusak data saat gagal |
| C | Template Monitoring | Konfigurasi menghasilkan preview/jadwal mock yang benar, termasuk versi dan periode sementara |
| D | Kontak/Eskalasi | Satu sumber kontak dipakai layanan dan Runbooks; pengubahan kontak tercermin pada konsumen terkait |
| E | Jam Layanan kemudian SLA | Preview waktu/target benar; versi lama tetap dipakai tiket lama |
| F | Import/export, tampilan tersimpan, edit massal, riwayat gabungan | Preview dan izin lengkap; perubahan massal tidak berhenti pada kondisi setengah tersimpan |

Pada setiap tahap frontend: periksa tipe, lint pada perubahan, build dan alur browser; verifikasi desktop/mobile, keyboard, kontras dan kunci scroll. Gunakan baseline untuk menjaga halaman lain dan perhitungan seed. Catatan lint/CLS/pixel pada laporan v2 perlu ditangani atau dilaporkan secara terpisah, sehingga penambahan fitur tidak dianggap otomatis menyelesaikannya.

Keputusan yang diperlukan sebelum modul terkait diaktifkan:

1. Apakah Tenant/Klien tetap satu entitas dengan jenis, dan siapa pemilik layanan?
2. Siapa yang berwenang menetapkan pemetaan referensi lama?
3. Apakah satu pemeriksaan monitoring dapat berlaku untuk beberapa sistem, atau satu sistem per template?
4. Apakah PIC default ditetapkan ke pengguna tertentu atau ke tim/shift?
5. SLA dihitung 24×7 atau berdasarkan jam layanan; kapan timer dimulai, dijeda dan dihentikan?
6. Apakah definisi shift baru memang dibutuhkan di Master Data, atau cukup sumber yang sudah dipakai Team Roster?

Pembuatan dokumen ini tidak mengaktifkan modul, mengubah data, atau menjalankan implementasi. Tahap yang dapat dilanjutkan setelah rencana dipilih tetap dibatasi frontend/mock dan dokumentasi; pekerjaan server memerlukan instruksi tersendiri.
