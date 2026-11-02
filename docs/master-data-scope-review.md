# Tinjauan Cakupan Halaman Master Data: Perlu, Belum Ada, dan Tidak Perlu

Tanggal: 28 Oktober 2026
Status: **Tahap 1 (Personel dan Peran) dan tahap 2 (hapus aman dan penyempurnaan) sudah dikerjakan pada 28 Oktober 2026**; bagian lain tetap rencana. Fitur P0 yang dibatalkan disembunyikan di balik `MASTER_DATA_P0_ENABLED` (kode tidak dihapus). Backend tidak disentuh dan tidak dibaca.
Menggantikan urutan prioritas di [Plan Lanjutan](master-data-next-plan.md) (bagian 2 sampai 6 dan 10). Dokumen itu tetap menjadi rujukan detail untuk modul yang dipertahankan (Template Monitoring, Kontak & Eskalasi, Jam Layanan, SLA).

## 1. Kesimpulan singkat

Master Data saat ini mengelola **data struktur layanan** (Organisasi, Proyek, Sistem) dan **referensi tiket** (Kategori, Severity). Yang belum ada adalah **data operasional yang dikerjakan setiap hari**: personel, peran, jadwal pemeriksaan monitoring, dan kontak eskalasi. Data itu sekarang tertanam di kode atau tersebar di halaman lain.

Arah rencana ini:

1. **Coret** fitur "pengawas data" yang membuat pekerjaan tambahan tanpa nilai langsung: *Perlu ditinjau*, *Tinjau referensi* (pemetaan manual), penanda kelengkapan, cadangan JSON, dan fitur produktivitas yang belum dibutuhkan.
2. **Tambah** hal yang benar-benar dipakai tim: **Personel (tambah, ubah, nonaktifkan, hapus aman)**, **Peran**, **Template Monitoring**, **Kontak & Eskalasi**.
3. **Tunda** Jam Layanan dan SLA sampai aturan bisnisnya disepakati.

## 2. Kondisi sekarang (hasil pemeriksaan source)

| Area | Kondisi | Catatan |
| --- | --- | --- |
| Organisasi, Proyek, Sistem | Daftar, detail, form, arsip/pulihkan, dampak, riwayat sudah ada | Cukup. Tidak dibangun ulang |
| Kategori, Severity | Sudah ada dan terhubung ke form/filter tiket | Cukup |
| Personel / Anggota Tim | Tambah dan ubah ada di **Team Roster** (`MemberCreateModal`), disimpan di `ctd.roster.members`. **Tidak ada hapus/nonaktifkan.** | Bukan bagian Master Data |
| Pemilih PIC | `OwnerTagInput` memakai `seedRosterMembers` (data awal), **bukan** daftar yang sudah diubah di Team Roster | Anggota baru tidak muncul sebagai pilihan PIC. Ini celah nyata |
| PIC pada tiket | Disimpan sebagai **teks nama** (`owner`, `owners`), bukan ID | Nama yang diganti memutus hubungan |
| Peran personel | Daftar tetap di kode (`RosterRole`: Operator NOC, Shift Lead, Incident Coordinator, L2 Specialist, Infrastructure Engineer), juga di filter Team Roster | Tidak bisa ditambah tanpa mengubah kode |
| Jadwal pemeriksaan Monitoring | Tertanam di `clientData.ts` (`CLIENT_SCHEDULES`) | Tidak bisa diatur dari aplikasi |
| Definisi shift | Tertanam di `lib/shifts.ts` (Subuh, Pagi, Malam) | Dipakai logika transisi shift; berisiko bila dibuat bebas |
| Kontak eskalasi | Ada di halaman Runbooks sebagai konten, bukan data master | Terpisah dari PIC proyek/sistem |
| Template tugas Handover | `initialHandoverTasks` (`standard-1` sampai `standard-10`) tertanam di `data.ts`: judul, proyek, detail, prioritas | Checklist serah terima tidak bisa diatur dari aplikasi |
| Tujuan eskalasi pada tiket | `escalatedTo` berupa teks bebas ("Dimas Suryo (L3 Lead)", "Reza Rahardian (L2)") | Setelah Personel dan Kontak & Eskalasi ada, dipilih dari sana dan disimpan dengan ID |
| Kategori akar masalah | `rootCauseCategory` teks bebas, 14 nilai berbeda di seed | Lihat 3.2 nomor 7 |
| Target SLA | Aturan default 60/120 menit disalin di beberapa file; `slaTargetMinutes` per tiket sebagai pengecualian | Lihat 3.2 nomor 8 |
| Konfigurasi laporan mingguan | `weekly-report-config.ts` menyimpan **salinan sendiri** daftar proyek (`master_projects`), warna proyek, alias proyek, pemetaan severity, dan hari awal minggu | Daftar proyek ganda: proyek baru di Master Data tidak otomatis ada di laporan |
| Kontak eskalasi | `seedEscalationContacts` (Runbooks) sudah berbentuk data: proyek, level L1/L2/L3/Vendor, nama, peran, kanal. Proyek disimpan sebagai teks | Sudah ada bentuknya; tinggal dipindah ke Master Data dan dihubungkan lewat ID proyek |
| Kredensial, SOP, tautan cepat | Seed di `runbooksData.ts` | Konten Runbooks, bukan data master (lihat 3.1) |
| Status dan tipe tiket | `TicketStatus` dan `TicketType` tetap di `types.ts` | Mempengaruhi alur, badge, dan grafik; bukan master (lihat 3.1) |
| Penyimpanan | Lokal di browser; header sudah menampilkan "Tersimpan HH:mm" dan "Hanya sesi ini" | Penanda sudah cukup |

## 3. Keputusan per fitur

Legenda: **Perlu** = kerjakan. **Nanti** = berguna, tetapi tunggu syarat. **Tidak perlu** = coret dari rencana.

### 3.1 Tidak perlu (coret dari rencana)

**Koreksi (28 Oktober 2026, sore):** sebagian fitur di bawah ternyata **sudah ada di working tree** (belum di-commit), dibuat oleh sesi pengerjaan paket P0 lain, bukan oleh dokumen ini. Ditemukan: `MasterReviewView.tsx` (Perlu ditinjau), `MasterMappingWorkspace.tsx` (Tinjau referensi), `MasterTools.tsx` dan `lib/master-backup.ts` (cadangan JSON), `lib/master-review.ts`, `lib/master-audit.ts`, `lib/master-data-links.ts`, dan `tests/master-data-p0.test.mjs`. Izin baru juga sudah ada di `permissions.ts`. Isi dan kualitas kode itu **belum saya periksa**.

Artinya "tidak perlu" di sini berarti **tidak dilanjutkan dan tidak dipakai**. Untuk bagian yang sudah dikodekan, ada dua pilihan yang harus Anda putuskan (bagian 6, pertanyaan 1): **dibuang** dari working tree, atau **disimpan tersembunyi** (tidak tampil di menu) sampai backend siap. Keputusan ini tidak boleh dijalankan otomatis karena ada pekerjaan yang belum di-commit.

| Fitur dari rencana lama | Keputusan | Alasan |
| --- | --- | --- |
| **Perlu ditinjau** (halaman, tombol berlencana, filter, 7 jenis temuan) | **Tidak perlu** | Duplikasi dari yang sudah ada. Status, PIC, dan relasi sudah terlihat di daftar dan detail. "PIC belum ada" bukan masalah (PIC kosong memang boleh). Temuan yang berarti (induk nonaktif, relasi rusak) sudah dicegah oleh validasi saat simpan. Menambah halaman khusus hanya menambah satu tempat lagi untuk dipantau |
| **Tinjau referensi** (ruang kerja pemetaan referensi lama, keputusan Hubungkan/Label/Tunda, model `LegacyReference` dan `MappingDecision`) | **Tidak perlu** | Hanya ada 11 referensi tidak cocok di data seed (label "APH" dan "Handover"), dan keduanya memang label operasional, bukan proyek. Masalah sebenarnya (tiket lama menyimpan teks, bukan ID) diselesaikan dengan migrasi data di server, bukan dengan antarmuka peninjauan manual di data simulasi. Fitur ini juga menambah izin, koleksi storage, jenis riwayat, dan pratinjau dampak yang rumit |
| Penanda kelengkapan di daftar ("Belum ada PIC", "PIC lama", "n referensi belum dipetakan") | **Tidak perlu** | Ikut gugur bersama dua fitur di atas. Penanda "Induk nonaktif" sudah tersirat dari status induk |
| Rincian pemisahan "Lewat ID / Pemetaan ditinjau / Belum jelas" | **Tidak perlu** | Bergantung pada pemetaan. Cukup pertahankan catatan yang sudah ada: angka dampak sistem nol tidak membuktikan sistem belum dipakai |
| **Unduh/Pulihkan cadangan JSON** | **Tidak perlu** | Data masih simulasi lokal. Saat backend ada, cadangan menjadi tugas server. Mekanisme pulihkan memerlukan validasi rumit dan berisiko merusak data |
| Tampilan tersimpan | **Tidak perlu** | Belum ada kebutuhan. Data masih sedikit |
| Edit massal | **Tidak perlu** (untuk sekarang) | Jumlah data kecil; risiko perubahan besar tanpa dasar kebutuhan |
| Riwayat gabungan | **Tidak perlu** | Riwayat per record sudah cukup |
| Penggabungan record, pemindahan proyek antar organisasi | **Tidak perlu** | Dampak ke histori besar. Field organisasi tetap terkunci bila sudah dipakai |
| Dashboard/grafik baru di Master Data | **Tidak perlu** | Bukan tujuan halaman ini |
| **Kredensial** (password, token, akses VPN/SSH/API) | **Tidak boleh** masuk Master Data | Rahasia. Tetap di Runbooks/penyimpanan rahasia terpisah; Master Data tidak menyimpan atau menampilkannya |
| Status dan tipe tiket sebagai master bebas | **Tidak perlu** | Memengaruhi alur kerja, badge, grafik, dan perhitungan. Tipe tiket sudah dikelola lewat Kategori. Status tetap tetap |
| SOP, tautan cepat | **Tidak perlu** | Konten Runbooks, bukan referensi bersama |
| Kategori notifikasi (Ticket, Monitoring, Serah Terima, Temuan, SLA) | **Tidak perlu** | Terikat ke kode yang menghasilkan notifikasi; menambah kategori tanpa pembuatnya tidak berguna |
| Penandatangan laporan | **Tidak perlu** sebagai master | Diisi per laporan di `ReportSignatoryFields`. Nama dapat dipilih dari Personel bila nanti perlu |
| Tier organisasi (Enterprise, Standard, dan seterusnya) | **Tidak perlu** | Hanya bawaan data lama, tidak dipakai logika apa pun yang ditemukan |

Yang **tetap dipertahankan** dari tahap sebelumnya karena murah dan sudah berguna: penanda status simpan di header, pesan form yang jelas, dan riwayat yang mudah dibaca (lihat 3.3).

### 3.2 Perlu ditambah (inti rencana ini)

| # | Fitur | Mengapa perlu | Ringkasan |
| --- | --- | --- | --- |
| 1 | **Personel (anggota tim)**: tambah, ubah, nonaktifkan, hapus aman | Personel adalah data paling sering berubah. Sekarang tambah/ubah ada di Team Roster, hapus tidak ada, dan pemilih PIC memakai data awal | Master Data menjadi **satu sumber** identitas personel. Lihat bagian 4 |
| 2 | **Peran / jabatan personel** | Peran tertanam di kode dan di filter | Daftar peran yang dapat ditambah/diubah/dinonaktifkan; dipakai form personel dan filter Team Roster |
| 3 | **Hapus aman untuk record salah input** | Pengguna ingin bisa menghapus data yang keliru dibuat | Hapus permanen hanya bila record **belum dipakai sama sekali** (tanpa relasi, tanpa tiket/checkpoint, tanpa riwayat selain pembuatan). Selain itu, hanya arsip/nonaktif. Berlaku untuk Organisasi, Proyek, Sistem, Kategori, Personel |
| 4 | **Template Monitoring** | Jadwal pemeriksaan sekarang tertanam di kode; tim tidak bisa mengubahnya | Detail di [Plan Lanjutan, bagian 7](master-data-next-plan.md). Proyek, sistem opsional, langkah, kriteria OK, PIC default, hari dan jam, periode, status |
| 5 | **Kontak & Eskalasi** | PIC dan kontak eskalasi tersebar di Runbooks dan field teks | Detail di [Plan Lanjutan, bagian 8](master-data-next-plan.md). Kontak internal (dari Personel) dan eksternal, serta alur level 1 sampai 3. **Titik awal:** pindahkan `seedEscalationContacts` dan hubungkan ke Proyek lewat ID, bukan teks |
| 6 | **Template Handover** | Checklist serah terima (`standard-1` dan seterusnya) tertanam di kode; tim tidak bisa menambah, mengubah, atau menonaktifkan tugas standar | Daftar tugas standar per proyek: judul, detail, prioritas, urutan, status. Handover harian tetap menyalin dari template; hasil lama tidak berubah |
| 7 | **Kategori Akar Masalah** | Field `rootCauseCategory` pada tiket berupa **teks bebas**. Seed saja memuat 14 nilai berbeda (misalnya "Memory Saturation", "Physical Link Flap"), dipakai di laporan. Ejaan berbeda memecah hitungan | Daftar kategori yang dipilih saat menutup tiket. Nilai lama tidak ditulis ulang; yang tidak dikenal tampil sebagai teks asli |
| 8 | **Target SLA default per severity** (versi minimal dari SLA) | Aturan "60 menit untuk Critical/High, 120 menit lainnya" **disalin di beberapa tempat** (`TicketReportView.tsx` dan `types.ts`, sedikitnya empat lokasi). Mengubah target berarti mengubah banyak file | Satu tabel target respons/penyelesaian per severity, dibaca semua tempat itu. Tanpa jam layanan dan tanpa kebijakan per proyek dulu. Versi penuh tetap ada di bagian "Nanti" |
| 9 | **Warna dan alias Proyek** (menggantikan salinan di konfigurasi laporan) | `weekly-report-config.ts` punya daftar proyek, warna, dan alias sendiri. Proyek baru tidak muncul di laporan dan warna tidak seragam | Tambah field **Warna** dan **Alias** pada Proyek. Laporan membaca dari Master Data. Pemetaan severity dan hari awal minggu tetap di konfigurasi laporan |

### 3.3 Penyempurnaan kecil (murah, dikerjakan bersama tahap lain)

| Fitur | Isi |
| --- | --- |
| Riwayat mudah dibaca | Label "Nama", "Status", "PIC" menggantikan nama field teknis; ID ditampilkan sebagai kode dan nama; entri lama tidak ditulis ulang |
| Pesan form | Beri tahu bila hubungan berubah; buka bagian "Tambahan" bila field bermasalah ada di dalamnya |
| Urutan kategori | Pindah urutan sebagai **satu operasi** (sekarang dua penyimpanan berurutan, bisa setengah berhasil) |
| Urutan daftar | Pilihan urutan A-Z/Z-A dan terakhir diubah di toolbar |
| Label penyimpanan | Tambahkan kata "Lokal" pada penanda simpan (contoh "Lokal · Tersimpan 10:35"), tanpa kartu baru |

### 3.4 Nanti (tunggu syarat)

| Fitur | Syarat sebelum dikerjakan |
| --- | --- |
| **Jam Layanan** | Kebutuhan SLA nyata dan zona waktu disepakati |
| **Kebijakan SLA** | Aturan mulai, jeda, dan henti timer disepakati bisnis; jam layanan tersedia |
| **Definisi shift** | Perlu bukti kebutuhan mengubah jam shift. Logika transisi shift di `lib/shifts.ts` bergantung pada tiga shift tetap, jadi tahap awal cukup **tampilan baca saja** |
| **Import/Export CSV** | Data sudah cukup banyak untuk mengisi satu per satu terasa lambat |
| **Hari libur / kalender operasional** | Dikerjakan bersama Jam Layanan; belum ada pemakai sekarang |
| **Alat monitoring** (ActiveMQ, Grafana, Graylog dan sejenisnya) | Saat ini kosakata filter Monitoring, bukan entitas. Jadikan master hanya bila Template Monitoring memerlukannya sebagai pilihan; jangan disamakan dengan Sistem tanpa keputusan bisnis |
| **Kategori Runbooks** (kategori SOP, tautan, kredensial) | Prioritas rendah; hanya jika tim sering menambah kategori |
| Dependensi antarsistem, hostname/IP/aset | Hanya jika Master Data menjadi inventaris infrastruktur |
| Logo organisasi, duplikasi template | Prioritas rendah |

## 4. Rancangan Personel (prioritas pertama)

### 4.1 Batas tanggung jawab

| Sumber | Tanggung jawab |
| --- | --- |
| **Master Data, Personel** | Identitas dan peran: nama, ID pegawai, email, telepon, peran, tanggal bergabung, status (Aktif/Nonaktif/Arsip) |
| **Team Roster** | Jadwal shift, status kehadiran harian, tukar shift, statistik. Membaca daftar personel dari Master Data, tidak lagi menyimpan identitas sendiri |
| **Akun login** | Di luar Master Data. Password, token, dan kredensial **tidak** disimpan atau ditampilkan |
| **Hak akses** | Peran akses (Pengelola, Lead, Operator, Viewer) tetap diatur di administrasi akses, terpisah dari peran operasional (Operator NOC, dan seterusnya) |

### 4.2 Field

| Field | Wajib | Input | Catatan |
| --- | --- | --- | --- |
| Nama lengkap | Ya | Teks | |
| ID pegawai | Ya | Teks | Unik |
| Email | Ya | Teks | Format valid, unik |
| Telepon | Tidak | Teks | |
| Peran operasional | Ya | Select dari master Peran | |
| Shift default | Tidak | Select | Hanya acuan awal; jadwal tetap di Team Roster |
| Tanggal bergabung | Ya | Date picker | |
| Status | Ya | Aktif / Nonaktif / Arsip | Default Aktif |
| Catatan | Tidak | Textarea pendek | |

### 4.3 Aksi

| Aksi | Aturan |
| --- | --- |
| Tambah | Form satu kolom di mobile, dua kolom di desktop. ID stabil dibuat otomatis |
| Ubah | Nama boleh diganti tanpa memutus hubungan karena hubungan memakai ID |
| Nonaktifkan / Arsipkan | Personel tidak ditawarkan untuk penugasan baru (PIC, shift, tiket). Riwayat lama tetap terbaca. Dialog menampilkan dampak: jumlah proyek/sistem yang memakainya sebagai PIC, tiket aktif atas namanya, jadwal mendatang |
| Pulihkan | Mengaktifkan kembali |
| **Hapus** | Hanya bila personel **belum pernah dipakai** (bukan PIC, tidak ada tiket, tidak ada jadwal, tidak ada riwayat selain pembuatan). Konfirmasi eksplisit dengan mengetik nama. Bila sudah dipakai, tombol Hapus tidak tersedia dan alasan singkat ditampilkan ("Sudah dipakai di 3 tiket. Gunakan Arsipkan.") |
| Cegah kehilangan | Tidak boleh menonaktifkan/menghapus satu-satunya Pengelola atau satu-satunya Shift Lead yang aktif |

### 4.4 Integrasi yang harus ikut berubah

| Konsumen | Perubahan |
| --- | --- |
| Team Roster | Membaca daftar dari Master Data. Form tambah/ubah anggota diganti tautan ke Master Data atau menampilkan data yang sama |
| `OwnerTagInput` (PIC tiket) | Memakai daftar personel aktif dari Master Data, bukan `seedRosterMembers` |
| PIC Organisasi/Proyek/Sistem | Pilihan personel dari sumber yang sama |
| Tiket, Handover | Nilai lama (teks nama) **tidak ditulis ulang**. Record baru dapat membawa ID personel. Tampilan memakai nama terkini bila ID dikenal, teks lama bila tidak |
| Profil pengguna | Tetap membaca identitas sendiri; tidak berubah |

### 4.5 Daftar dan tampilan

- Menu: tambah subkategori **Personel** dan **Peran** pada kelompok baru **Tim & Operasional**. Kelompok "Operasional" yang sekarang berlabel Segera diisi bertahap, bukan diganti nama.
- Desktop: tabel Nama, Peran, Email/Telepon, Status, Aksi. Detail di drawer (Ringkasan, Penggunaan, Riwayat).
- Mobile: kartu satu kolom; filter di sheet; form dan detail layar penuh; target sentuh minimal 44px; teks minimal 11px.
- Izin: hanya Pengelola yang menambah/mengubah/menghapus. Lead dan lainnya membaca. Pemeriksaan produksi tetap di server.

## 5. Urutan pengerjaan yang disarankan

| Tahap | Isi | Hasil |
| --- | --- | --- |
| 1 | Personel + Peran (tambah, ubah, nonaktifkan, hapus aman) dan satu sumber untuk Team Roster dan pemilih PIC | Anggota baru langsung tersedia sebagai PIC; tidak ada lagi dua daftar |
| 2 | Hapus aman untuk Organisasi, Proyek, Sistem, Kategori; penyempurnaan kecil (3.3) | Data salah input dapat dibersihkan tanpa merusak histori |
| 3 | Template Monitoring | Jadwal pemeriksaan dapat diatur dari aplikasi |
| 4 | Kontak & Eskalasi (mulai dari `seedEscalationContacts`) | Satu sumber kontak untuk PIC dan Runbooks |
| 5 | Template Handover, lalu Warna/Alias Proyek untuk laporan | Checklist dapat diatur; laporan tidak lagi punya daftar proyek sendiri |
| 6 | Kategori Akar Masalah dan Target SLA default per severity | Laporan konsisten; target SLA satu sumber |
| 7 | Jam Layanan, lalu Kebijakan SLA penuh | Setelah aturan bisnis disepakati |

Setiap tahap hanya mencakup frontend, mock adapter, dan dokumentasi. Data seed yang tampil, perhitungan, dan halaman lain tidak berubah. Verifikasi per tahap: typecheck, lint pada file yang diubah, build, uji alur browser (desktop dan mobile), keyboard, kontras, dan pelepasan kunci scroll.

## 6. Keputusan yang diperlukan dari Anda

1. **Setuju mencoret** Perlu ditinjau, Tinjau referensi, dan cadangan JSON? Karena kodenya sudah ada di working tree (lihat koreksi di 3.1): **dibuang**, atau **disembunyikan** dulu?
2. **Personel**: apakah Master Data menjadi sumber tunggal, dan Team Roster hanya mengatur jadwal? (Disarankan ya.)
3. **Hapus**: setuju aturan "hapus permanen hanya bila belum pernah dipakai, selain itu arsip"?
4. **Peran operasional**: boleh bebas ditambah, atau tetap lima peran sekarang dengan nama yang bisa diubah? Peran baru memengaruhi filter dan statistik Team Roster.
5. **PIC default Template Monitoring**: ke pengguna tertentu atau ke peran/shift?
6. **Kontak eksternal** (vendor): disimpan di Master Data atau cukup sebagai konten Runbooks?
7. **Definisi shift**: cukup tampilan baca saja untuk sekarang?
8. **Template Handover**: satu daftar standar per proyek, atau satu daftar umum untuk semua proyek?
9. **Warna dan alias Proyek**: laporan mingguan boleh berubah mengikuti Master Data, atau daftar proyek laporan tetap dipisah?
