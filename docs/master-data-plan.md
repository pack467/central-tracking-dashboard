**Plan Pengembangan Halaman Master Data**

Master Data dikembangkan sebagai pusat data referensi operasional, dengan form utama yang ringkas dan detail tambahan saat dibutuhkan.

Rencana ini berdasarkan pemeriksaan [halaman Master Data saat ini](../frontend/app/components/views/MasterDataView.tsx), [model frontend](../frontend/app/types/master-data.ts), dan [skema backend](../backend/prisma/schema.prisma).

**1. Rapikan hubungan data terlebih dahulu**

Ada perbedaan yang perlu diselesaikan sebelum menambah banyak form:

| Temuan sekarang | Rencana |
| --- | --- |
| Frontend menggabungkan istilah Klien/Organisasi | Tetapkan arti Tenant/Organisasi dan Klien/Mitra secara terpisah. |
| Proyek frontend berada di bawah klien; backend berada di bawah Tenant | Samakan relasi dan nama field antara frontend–backend. |
| Sistem tersedia di frontend, tetapi model backendnya belum ditemukan pada pemeriksaan ini | Tentukan apakah Sistem menjadi data tersendiri, lalu siapkan penyimpanannya. |
| Frontend mengharapkan endpoint `/master/*`, tetapi controllernya belum ditemukan pada pemeriksaan ini | Lengkapi API sebelum menganggap data sudah tersimpan di server. |
| Beberapa hubungan memakai nama atau slug | Gunakan ID server yang tetap; nama dan kode menjadi atribut yang dapat ditampilkan. |
| Kartu “Tersimpan” mengambil waktu halaman dibuka | Tampilkan waktu penyimpanan/sinkronisasi yang sebenarnya. |

Contoh data backend saat ini: Telkomsel masuk Tenant, Tritronik masuk Client, dan Single Mediation berada di bawah Tenant. Arti bisnis kedua jenis organisasi ini perlu dipastikan, bukan langsung digabung.

Hubungan awal yang direkomendasikan:

```text
Organisasi/Tenant
└── Proyek/Layanan
    └── Sistem/Sub-layanan

Klien/Mitra → dikaitkan sesuai hubungan bisnis yang disepakati
PIC/Kontak  → dipakai bersama oleh organisasi, proyek, dan eskalasi
```

**2. Kelompok menu yang perlu disediakan**

Hindari membuat semua jenis master menjadi sederet tab panjang. Gunakan tiga kelompok.

| Kelompok | Isi | Prioritas |
| --- | --- | --- |
| Organisasi & Layanan | Organisasi/Tenant, Klien/Mitra, Proyek, Sistem | Utama |
| Referensi Tiket | Kategori, Severity, Kebijakan SLA | Kategori dan Severity lebih dahulu; SLA menyusul |
| Konfigurasi Operasional | Template Monitoring, Shift/Jam Operasional, Kontak/Eskalasi | Monitoring lebih dahulu; lainnya bertahap |

Pengguna, role, dan permission tetap memiliki area Administrasi Akses tersendiri. Master Data cukup menyediakan pilihan PIC dari sumber pengguna yang sama.

Jadwal harian staf, tiket, hasil monitoring, dan catatan handover tetap dikelola pada halaman operasional masing-masing.

**3. Input untuk Organisasi/Tenant dan Klien/Mitra**

Keduanya dapat memakai pola form yang serupa, tetapi hubungan datanya mengikuti keputusan pada poin pertama.

| Field | Kebutuhan | Bentuk input |
| --- | --- | --- |
| Nama resmi | Wajib | Teks |
| Kode organisasi | Wajib, unik dalam lingkup yang disepakati | Teks singkat, validasi duplikat |
| Nama singkat | Opsional; gunakan nama resmi jika kosong | Teks |
| Deskripsi | Opsional | Textarea pendek |
| PIC utama | Disarankan; tampilkan penanda jika belum ditetapkan | Pilih pengguna/kontak |
| Email/telepon operasional | Mengikuti kontak yang dipilih | Otomatis atau input kontak eksternal |
| Status administrasi | Default Aktif | Aktif, Nonaktif, Arsip |
| Logo | Opsional, tahap berikutnya | Unggah gambar |
| ID dan waktu perubahan | Otomatis | Hanya ditampilkan di detail |

Yang perlu dibenahi:

- Jangan mewajibkan kontak yang belum tersedia sampai pengguna mengisi data palsu.
- PIC internal dipilih dari pengguna terdaftar.
- PIC eksternal memakai data kontak, tanpa otomatis dibuatkan akun login.
- Tier layanan cukup ditambahkan jika benar-benar memengaruhi kontrak atau layanan.
- Pilihan seperti Enterprise, Mission Critical, dan Dedicated SLA sebaiknya tidak dicampur dalam satu field karena mewakili konsep berbeda.

Tampilan daftar: kode/nama, PIC utama, jumlah proyek, status, dan aksi. Deskripsi panjang, nomor telepon, serta informasi tambahan masuk halaman detail.

**4. Input untuk Proyek/Layanan**

| Field | Kebutuhan | Bentuk input |
| --- | --- | --- |
| Organisasi/Tenant pemilik | Wajib | Select dengan pencarian |
| Nama proyek/layanan | Wajib | Teks |
| Kode proyek | Wajib, unik dalam organisasi | Teks singkat |
| Nama singkat | Opsional untuk tampilan ringkas | Teks |
| Lingkup layanan | Disarankan | Textarea |
| Klien/mitra terkait | Sesuai hubungan bisnis | Pilihan relasi |
| Lead/PIC teknis | Disarankan | Pilih pengguna |
| Kebijakan SLA | Setelah modul SLA tersedia | Pilih kebijakan |
| Status administrasi | Default Aktif | Aktif/Arsip |
| Jumlah sistem/checkpoint | Otomatis | Informasi detail |

Dua perubahan penting:

- Healthy/Degraded/Critical tidak menjadi kondisi yang diketik manual di Master Data. Kondisi berjalan ditampilkan dari Monitoring.
- Deskripsi layanan berisi lingkup yang relatif tetap. Angka throughput, antrean, atau kondisi gangguan masuk Monitoring.

Kode proyek juga perlu dibedakan dari prefix nomor tiket. Prefix yang digunakan integrasi belum tentu cocok dijadikan identitas unik proyek.

Tampilan daftar: kode/nama, organisasi, PIC, jumlah sistem, status, aksi. Lingkup layanan lengkap masuk detail.

**5. Input untuk Sistem/Sub-layanan**

Modul ini diperlukan jika satu proyek memiliki beberapa komponen yang harus dibedakan saat monitoring atau penanganan tiket.

| Field | Kebutuhan | Bentuk input |
| --- | --- | --- |
| Proyek induk | Wajib | Select dengan pencarian |
| Organisasi | Diturunkan dari proyek | Tampil otomatis |
| Nama sistem | Wajib | Teks |
| Kode sistem | Disarankan; dapat dibuat otomatis | Teks singkat |
| Environment | Wajib | Production, Staging, DRC; pilihan tambahan jika diperlukan |
| Criticality | Wajib | Critical, High, Medium, Low |
| PIC sistem | Opsional; gunakan PIC proyek jika kosong | Pilih pengguna |
| Deskripsi fungsi | Opsional | Textarea |
| Referensi dashboard/runbook | Opsional | Pilih referensi atau URL |
| Status administrasi | Default Aktif | Aktif, Nonaktif, Dipensiunkan/Arsip |

Catatan desain:

- Criticality sistem menjelaskan pentingnya sistem tersebut.
- Severity tiket menjelaskan tingkat kejadian pada tiket tertentu.
- Kondisi gangguan atau maintenance berjalan perlu dibedakan dari status administrasi.
- Perubahan status memakai pilihan yang jelas. Hindari tombol yang berputar otomatis dari `active → maintenance → deprecated` seperti perilaku sekarang.

Hostname, IP, lokasi, dan nomor aset dapat ditambahkan kemudian jika halaman ini juga akan menjadi inventaris infrastruktur. Jangan diwajibkan pada tahap awal.

Tampilan daftar: sistem, proyek, environment, criticality, status, aksi.

**6. Referensi Tiket yang perlu ditambahkan**

| Master | Input yang diperlukan | Informasi yang ditampilkan |
| --- | --- | --- |
| Kategori tiket | Nama wajib; deskripsi opsional; status aktif dan urutan tampilan | Nama, deskripsi singkat, jumlah pemakaian, status |
| Severity | Kode standar, nama tampilan, deskripsi; warna dari palet aplikasi | Severity, tingkat, warna, jumlah pemakaian |
| Kebijakan SLA | Lingkup proyek, severity, target respons, target penyelesaian, jam layanan, masa berlaku | Nama kebijakan, lingkup, target, masa berlaku, status |

Untuk Severity, tahap awal tetap memakai empat kode yang sudah digunakan aplikasi:

- Critical
- High
- Medium
- Low

Nama tampilan dapat disesuaikan, misalnya “Critical — Kritis”. Penambahan severity baru dibuka setelah grafik, filter, perhitungan, dan SLA mendukung nilai dinamis.

Status tiket juga belum perlu menjadi master yang bebas ditambah, karena saat ini terikat enum dan alur backend.

Untuk SLA, gunakan satuan yang jelas, misalnya menit. Form desktop dapat berupa matriks empat severity; mobile menjadi empat blok sederhana. Perubahan kebijakan berlaku sesuai tanggal efektif dan tidak menghitung ulang histori secara diam-diam.

**7. Konfigurasi Operasional yang perlu tersedia**

| Master | Input utama | Batas tahap awal |
| --- | --- | --- |
| Template Monitoring | Proyek, nama pemeriksaan, instruksi/kriteria OK, jam pemeriksaan, zona waktu, aktif/nonaktif | Jadwal berupa pilihan jam, tanpa input cron |
| Monitoring sementara | Field template + tanggal mulai dan selesai | Tanggal selesai wajib jika memang memiliki batas waktu |
| Shift/Jam Operasional | Nama, kode, jam mulai, jam selesai, zona waktu | Mendukung lintas tengah malam |
| Kontak/Eskalasi | Nama, internal/eksternal, organisasi, email/telepon, tanggung jawab, status | Gunakan sumber yang sama dengan Runbooks |
| Template kegiatan rutin | Nama kegiatan, proyek, PIC, pola jadwal, referensi dokumen | Tahap lanjutan jika kegiatan berulang sudah dibutuhkan |

Pada Template Monitoring:

- Organisasi mengikuti proyek.
- Pembuat dan waktu pembuatan diisi otomatis dari sesi pengguna/server.
- Pengguna tidak mengisi `creator_id`, ID database, atau timestamp.
- Beberapa jam pemeriksaan ditampilkan sebagai chip, misalnya `08:00`, `12:00`, `16:00`.
- Hasil OK/NOK dan bukti pemeriksaan tetap berada di halaman Monitoring.

Kontrak API jadwal perlu dirapikan terlebih dahulu: model backend mengarah ke beberapa waktu, sedangkan DTO saat ini memvalidasi satu waktu `HH:mm`.

Untuk Shift, tumpang tindih waktu dapat diizinkan jika merupakan jendela serah-terima. Perubahan jadwal harus menjaga pembacaan histori shift lama.

**8. Rancangan desktop**

Urutan layar yang direkomendasikan:

```text
Master Data                          Konteks organisasi

Ringkasan jumlah yang relevan dengan kelompok aktif

Organisasi & Layanan | Referensi Tiket | Operasional
Subkategori sesuai kelompok

Cari data...        Filter...        + Tambah

Tabel daftar
...
Pagination
```

Ketentuan tampilannya:

- Ringkasan cukup tiga angka kecil yang relevan.
- Informasi sinkronisasi menjadi status kecil, bukan kartu statistik besar.
- Tabel memiliki sekitar 5–6 kolom penting.
- Kolom nama menjadi bagian paling menonjol.
- Kode memakai JetBrains Mono; nama dan isi memakai Plus Jakarta Sans.
- Tombol Tambah mengikuti kategori aktif.
- Aksi utama pada baris cukup Detail dan Ubah; arsip berada pada menu tambahan.
- Detail dibuka melalui drawer kanan sekitar 480–640px.
- Form sederhana memakai modal sekitar 680–760px dengan dua kolom.
- Form kompleks seperti SLA atau monitoring dapat memakai halaman detail agar tidak terlalu padat.

Detail organisasi, proyek, dan sistem sebaiknya memiliki:

| Bagian | Isi |
| --- | --- |
| Ringkasan | Identitas, status, PIC, deskripsi |
| Relasi | Proyek, sistem, template, atau referensi terkait |
| Riwayat | Perubahan terakhir dan pelakunya |

Klik relasi membuka daftar yang sudah terfilter. Filter tersebut tidak otomatis mengganti organisasi aktif pada topbar.

**9. Rancangan mobile**

Di bawah 1024px, gunakan daftar baris/kartu sederhana dengan satu kolom.

```text
Master Data                     + Tambah

Pilih kategori: Proyek

Cari proyek...             Filter (2)

SM — Single Mediation           Aktif
Telkomsel · PIC: Galih
5 sistem                              ⋮

MB — Message Broker             Aktif
Telkomsel · PIC belum ditetapkan
3 sistem                              ⋮
```

Ketentuan mobile:

- Pilihan kategori membuka sheet berkelompok; tidak perlu deretan tab panjang.
- Pencarian selalu terlihat.
- Filter tambahan masuk sheet.
- Filter aktif ditampilkan sebagai chip yang dapat dihapus.
- Ketuk baris membuka detail.
- Menu tiga titik hanya berisi aksi yang sesuai izin pengguna.
- Data panjang terpotong rapi dan dapat dibaca lengkap di detail.
- Tidak memaksakan tabel desktop dengan gulir horizontal.
- Ringkasan angka dibuat padat, bukan empat kartu besar bertumpuk.

Form mobile menggunakan layar penuh:

- Header: kembali, judul form, tutup.
- Satu kolom input.
- Field wajib lebih dahulu.
- Informasi tambahan berada dalam bagian yang dapat dibuka.
- Footer Simpan/Batal memperhitungkan keyboard dan safe-area.
- Tinggi kontrol minimal 44px.
- Input teks sekitar 16px, isi daftar 14px, metadata sekitar 12px.

**10. Perilaku form dan daftar yang perlu diterapkan**

| Kebutuhan | Rencana |
| --- | --- |
| Pilihan bertingkat | Organisasi → Proyek → Sistem; hanya menampilkan relasi yang valid |
| Induk berubah | Pertahankan pilihan anak jika masih valid; jika tidak, kosongkan dan minta dipilih ulang |
| Default konteks | Ikuti organisasi aktif jika sesuai izin; hindari memilih data pertama secara diam-diam |
| Validasi | Pesan dekat field, tandai wajib/opsional, fokus ke kesalahan pertama |
| Duplikat | Validasi frontend untuk respons cepat dan backend sebagai pemeriksaan utama |
| Simpan | Cegah kiriman ganda, pertahankan isi form jika gagal |
| Keluar dari form | Konfirmasi jika ada perubahan yang belum disimpan |
| Pencarian/filter | Pertahankan ketika detail ditutup |
| Pagination | Pilihan 10/25/50; jumlah total berasal dari server |
| Kosong | Bedakan belum ada data dengan pencarian tidak menemukan hasil |
| Loading | Skeleton mengikuti bentuk daftar |
| Gagal memuat | Pesan yang jelas dan tombol coba lagi |

Nama proyek, sistem, dan PIC sebaiknya terhubung melalui ID. Mengubah nama tidak boleh memutus hubungan tiket atau monitoring lama.

**11. Arsip, penggunaan data, dan riwayat**

Yang perlu tersedia:

- Arsip dan Pulihkan untuk data yang sudah dipakai.
- Pemeriksaan penggunaan sebelum mengarsipkan.
- Informasi dampak, misalnya jumlah sistem, template aktif, atau tiket terkait.
- Riwayat tetap dapat dibaca setelah data diarsipkan.
- Data arsip tidak ditawarkan untuk transaksi baru.
- Pemulihan memperhatikan apakah organisasi/proyek induknya masih aktif.
- Riwayat perubahan mencatat siapa, kapan, dan field yang berubah.

Perhitungan dampak harus berasal dari server, bukan hanya dari tiket yang kebetulan sudah dimuat di browser.

Pemindahan proyek ke organisasi lain perlu alur khusus. Jangan menjadikannya perubahan dropdown biasa jika sudah memiliki data operasional.

**12. Hak akses**

Ini merupakan pembagian kemampuan yang disarankan; implementasinya mengikuti permission backend.

| Pengguna | Kemampuan |
| --- | --- |
| Pengelola Master Data | Tambah, ubah, arsip, pulihkan sesuai lingkup |
| Lead operasional | Kelola konfigurasi operasional jika diberi izin |
| Operator | Membaca dan memilih data master pada pekerjaan harian |
| Viewer | Membaca data yang diizinkan |
| Pengelola akun | Mengelola pengguna/role melalui izin administrasi tersendiri |

Tombol UI dan pemeriksaan API harus mengikuti izin yang sama. Pembatasan organisasi juga perlu diterapkan di server.

Izin kategori/severity yang sudah tersedia dapat digunakan kembali. Permission organisasi, proyek, dan sistem perlu disiapkan bersama API-nya.

**13. Yang diperlukan, bisa menyusul, dan tidak perlu dimasukkan**

| Fitur/data | Keputusan |
| --- | --- |
| Pencarian, filter, detail, tambah/ubah | Perlu sejak awal |
| Validasi relasi, duplikat, arsip/pulihkan | Perlu sejak awal |
| Penyimpanan server dan hak akses | Perlu sebelum dipakai bersama |
| Waktu perubahan dan riwayat | Perlu |
| Kategori dan severity terhubung ke form tiket | Perlu |
| Import CSV dengan preview dan laporan kesalahan | Menyusul jika data banyak |
| Export daftar sesuai filter dan izin | Menyusul |
| Edit massal status/PIC | Menyusul setelah aturan dampaknya jelas |
| Logo dan penyesuaian tampilan | Opsional |
| Inventaris IP/hostname/aset lengkap | Opsional jika dibutuhkan |
| Grafik besar di Master Data | Tidak perlu pada tahap awal |
| Input manual jumlah proyek/sistem/tiket | Tidak perlu; dihitung otomatis |
| Input manual kondisi Healthy/Gangguan | Tidak perlu; ambil dari Monitoring |
| Menyalin data staf dari Team Roster | Tidak perlu; gunakan sumber pengguna yang sama |
| Daftar transaksi tiket/hasil monitoring lengkap | Tetap di halaman operasional |
| Password, token, dan kredensial akses | Tidak menjadi field Master Data |
| Hapus permanen data yang sudah dipakai | Tidak menjadi aksi umum |
| Permission baru berupa teks bebas | Tidak perlu; pilih dari katalog permission aplikasi |

Import nantinya perlu memiliki langkah: unggah → validasi → preview tambah/perubahan → konfirmasi → hasil. Jangan langsung menimpa data berdasarkan kesamaan nama.

**14. Urutan pengerjaan yang direkomendasikan**

| Tahap | Lingkup | Hasil yang dituju |
| --- | --- | --- |
| 0 — Penyamaan model | Arti Tenant/Client, hubungan proyek, kebutuhan Sistem, ID dan kontrak API | Struktur data disepakati |
| 1 — Fondasi | API, penyimpanan server, validasi, permission, status dan riwayat | Data dapat dipakai bersama secara konsisten |
| 2 — Master utama | Organisasi, Klien/Mitra, Proyek, Sistem; UI desktop/mobile | Tiga tab yang ada menjadi lengkap dan terhubung |
| 3 — Referensi tiket | Kategori, severity, hubungan dengan form/filter | Pilihan tiket memakai satu sumber |
| 4 — Operasional | Template Monitoring, SLA, kontak, shift sesuai kebutuhan | Konfigurasi dipakai oleh halaman operasional |
| 5 — Produktivitas | Import/export, edit massal, pemeriksaan kelengkapan | Pengelolaan data dalam jumlah besar lebih cepat |

Sebelum tahap implementasi, tiga keputusan bisnis yang perlu ditetapkan adalah:

1. Perbedaan Tenant dan Client dalam operasional.
2. Granularitas Sistem: cukup proyek, atau perlu sistem/sub-layanan terpisah.
3. Cakupan SLA: satu kebijakan bersama atau berbeda per proyek, serta layanan 24×7 atau jam tertentu.
