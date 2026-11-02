# Master Data v2 — laporan implementasi frontend

27 Oktober 2026. **Backend tidak dibaca, diubah, dibuat, dijalankan, atau dimigrasikan pada pekerjaan implementasi ini.** Padanan skema dalam dokumen kontrak berasal dari pemeriksaan rencana sebelumnya. Server frontend pengguna pada port 3000 tetap berjalan. Tidak ada commit, dependency baru, atau perubahan CSS aplikasi.

## Hasil

Master Data menyediakan Organisasi, Proyek, Sistem, Kategori, dan Severity melalui daftar, detail, form, arsip/pulihkan, dampak, riwayat, pencarian, filter, pagination, dan pemeriksaan izin. Desktop memakai tabel/drawer/modal; mobile memakai kartu, sheet kategori/filter, detail dan form layar penuh. Operasional tampil nonaktif dengan label **Segera**.

Dokumen pendamping:

- [Kontrak API untuk implementasi server berikutnya](../../docs/master-data-api-contract.md).
- [Galeri screenshot](SCREENSHOTS.md), [daftar file](FILES.md), [perubahan source terhadap snapshot awal](source-changes.json).
- [Baseline awal](baseline.json), [hasil akhir halaman lain](after.json), [pengukuran pixel](pixel-diff.json).

## Keputusan model dan migrasi

| Keputusan | Implementasi |
| --- | --- |
| Organisasi sementara | Satu entitas `Organization`, jenis tenant/client. Delapan organisasi seed tetap client, tanpa memindahkan relasi. |
| Pemilik proyek | Satu `organizationId`; nama lama clientId dikonversi. Mitra tambahan melalui relatedClientIds; pemilik sendiri tidak boleh menjadi mitra tambahan. |
| Sistem | Entitas tersendiri dengan projectId; organisasi diturunkan dari proyek. Environment, criticality, PIC dan status administrasi terpisah. |
| Identitas | ID lama dipertahankan; record baru memakai UUID. Mengganti nama/kode tidak membuat ID baru. |
| Kategori | Tujuh key/urutan seed tetap. Nama tampilan boleh berubah; key tiket tidak ikut berubah. Kategori baru mendapat key otomatis. |
| Severity | Empat kode/level/palet tetap. Hanya nama tampil dan deskripsi dapat diubah. Nilai badge dan perhitungan tiket tetap TitleCase. |
| Data turunan | Jumlah proyek/sistem/tiket/checkpoint dan usageCount dihitung dari data, bukan input pengguna. |

Struktur sementara dan mapper ada di [types/master-data.ts](../../frontend/app/types/master-data.ts) dan [master-data-model.ts](../../frontend/app/lib/master-data-model.ts). Perubahan keputusan bisnis perlu dimulai dari kedua modul dan kontrak API, diikuti migrasi yang ditinjau; jangan memindahkan induk berdasarkan kesamaan nama.

Migrasi v1 → v2:

1. Kunci baru `ctd.masterData.v2`; isi v1 tidak ditimpa atau dihapus.
2. Delapan organisasi, 47 proyek, dan 47 sistem seed mempertahankan ID, urutan, nilai lama dan induknya. Seluruh 105 tiket seed tetap tersedia.
3. Status sistem maintenance menjadi active dengan legacyCondition maintenance; deprecated menjadi archived. Penanda maintenance tetap disimpan ketika metadata/status administrasi diedit. Proyeksi konsumen lama mempertahankan status yang dibutuhkan.
4. Kode sistem dibentuk dari nama, dengan suffix bila diperlukan untuk keunikan dalam proyek.
5. Proyek menyimpan legacyKey yang tetap. ID proyek seed yang sudah pernah diganti namanya pada v1 tetap mempunyai pemetaan ke string historis asal.
6. PIC lama tidak ditebak menjadi akun internal berdasarkan kemiripan nama. Kontak lama dipertahankan; PIC internal baru dipilih dari pengguna Team Roster.
7. Tier, tagline, fullName, leadEngineer dan healthDefault lama dipertahankan pada proyeksi/metadata legacy. Form v2 tidak menyediakan tier atau healthDefault. PIC teknis v2 yang belum terhubung ke pengguna ditandai Belum ditetapkan.
8. V1 dengan seluruh organisasi nonaktif tetap dimigrasi tanpa membuang isinya. Pengelola dapat memulihkan satu organisasi. Mutasi berikutnya tetap melindungi organisasi aktif terakhir.
9. Skema, keunikan dan relasi divalidasi saat baca. Data rusak kembali ke seed dengan peringatan. Storage diblokir menggunakan memori sesi; subscriber tidak memicu pemuatan berulang.

Waktu simpan berasal dari operasi penyimpanan, bukan render halaman. Pembukaan ulang data valid tidak mengganti lastSavedAt. Status UI membedakan Menyimpan, Tersimpan, Gagal dan Hanya sesi ini.

## Integrasi konsumen dan batas kompatibilitas

| Konsumen | Perubahan |
| --- | --- |
| ClientContext/header | Proyeksi v2 dan subscription seketika; pilihan aktif saja; pergantian konteks dan toast saat organisasi aktif diarsipkan. |
| clientData | Pembaca langsung v1 diganti proyeksi v2. Daftar kosong tidak menghidupkan seed kembali. Induk nonaktif menyembunyikan pilihan transaksi baru. |
| Monitoring | Daftar proyek mengikuti master; label memakai resolver. Fungsi matchesProject lama dipindahkan tanpa mengubah semantik pencocokannya. healthDefault legacy tetap tersedia sebagai bacaan. |
| Form tiket | Kategori aktif dan nama severity dari master; projectId baru, systemId opsional, serta pemilihan sistem berdasarkan proyek. Nilai historis tetap disimpan. |
| Daftar/detail/filter tiket | Nama kategori, nama severity dropdown, label proyek/arsip dan kategori baru mengikuti master. Kategori nonaktif tetap dapat difilter untuk riwayat. |
| Dashboard/viewer | Label kategori dan kategori 8+ ditangani; warna kategori baru deterministik. Filter menerima proyek baru tanpa tiket. Badge severity/perhitungan dan seri historis dipertahankan. |
| Reports/Monitoring history/Handover | Resolver tampilan proyek ditambahkan pada tempat yang relevan; nilai transaksi dan perhitungan laporan tidak ditulis ulang. |

Resolver mengutamakan ID dan key historis dalam lingkup organisasi, kemudian alias yang tidak ambigu. Contoh EPC Tools → EPC dan SM / ActiveMQ → SM tetap terhubung setelah proyek diganti nama/kode. Dampak memakai resolver yang sama untuk tiket dan checkpoint.

Relasi string yang sengaja masih dipertahankan:

- Ticket.project, project pada checkpoint/handover/report serta key seri grafik lama belum diubah massal menjadi ID. Record baru sudah dapat membawa projectId/systemId. Mengubah seluruh histori sekaligus akan mengubah pengelompokan dan perhitungan halaman lain yang diminta tetap sama.
- Label operasional seperti APH dapat muncul dalam tiket seed tanpa proyek master yang sesuai. Resolver tidak mengarang pemilik atau membuat master baru untuknya. Alias ambigu juga tidak dipaksakan ke satu ID.
- Handover masih mendukung label operasional bebas seperti NOC; label tersebut bukan otomatis relasi master. Master yang sudah diarsipkan disaring/dicegah dipilih kembali.
- Filter alat Monitoring seperti ActiveMQ, Grafana dan Graylog tetap menjadi kosakata pemeriksaan yang sudah ada. Alat tersebut tidak dianggap identik dengan entitas Sistem tanpa keputusan bisnis.
- Beberapa label seri/viewer tetap memakai key operasional historis sebagai identitas seri. Penyeragaman penuh membutuhkan migrasi referensi yang disetujui, bukan penggantian string pada render.

Tidak ada penulisan ulang tiket/checkpoint lama. Pemindahan organisasi proyek yang sudah dipakai ditolak. Pemulihan anak ditolak jika induk belum aktif.

## Dampak, audit, dan izin

Dampak mengambil seluruh tiket tersimpan, dengan fallback seluruh seed, seluruh jadwal terkait dan assessment checkpoint. Hitungan tidak berasal dari halaman tabel yang sedang ditampilkan. Uji memakai 81 tiket, melampaui satu halaman UI. Audit mencatat identitas sesi, waktu dan perubahan field; update tanpa perubahan tidak menambah audit.

**Batas sistem legacy:** tiket/checkpoint lama belum mempunyai systemId. Hitungan dampak sistem hanya memakai hubungan yang eksplisit, bukan menebak dari nama proyek. Angka nol tidak membuktikan tidak adanya penggunaan legacy. Hal ini harus diselesaikan pada migrasi server sebelum dipakai untuk kebijakan transfer/penghapusan.

| Peran mock | Kemampuan pada lima master |
| --- | --- |
| manager, default | Baca/tambah/ubah/arsip/pulihkan sesuai entitas |
| lead | Baca; konfigurasi operasional belum dibangun |
| operator | Baca |
| viewer | Baca |

Severity hanya baca/ubah, termasuk untuk manager. Permission memakai master.organization/project/system/ticketRef dengan read/create/update/archive. Mock role diatur melalui NEXT_PUBLIC_MOCK_ROLE; pelaku audit tetap pengguna sesi. UI dan adapter memeriksa izin. Otorisasi server sebenarnya masih menjadi pekerjaan tim API.

## Verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| Typecheck | Lulus, exit 0 |
| Build | Lulus, exit 0 |
| Lint seluruh frontend | Masih gagal karena temuan bawaan: 166 error, 23 warning; baseline 179 error, 26 warning. Tidak ada penambahan temuan berdasarkan perbandingan file + rule. |
| Unit terkait | 38/38 lulus: migrasi, guard, izin, idempotensi, impact, alias, routing, kontrak mode API dan laporan/PDF |
| Browser CRUD | Tambah organisasi/proyek/sistem, kode otomatis, perubahan nama/ID, audit, filter, dampak arsip, dirty confirmation lulus |
| Referensi tiket | Kategori baru → tiket baru → grafik 8+; kategori nonaktif pada histori; nama severity dropdown lulus |
| Storage | Migrasi browser/cadangan v1, korupsi, mode sesi/peringatan satu kali dan sinkronisasi dua tab lulus |
| Izin browser | Keempat nilai env diuji; tiga peran baca tidak mendapat tombol tulis dan adapter mengembalikan 403 |
| Responsif | 120 kondisi pada 1920×1080, 1440×900, 1024×768, 768×1024, 390×844, 844×390; tidak ada overflow horizontal, teks di bawah 11px, target sentuh di bawah 44px pada mobile atau sisa inert/kunci scroll |
| Form mobile | Select 16px/44px; footer tetap di dalam visualViewport saat tinggi keyboard diemulasi 350px |
| Keyboard/touch | Tab, panah, Esc, menu, PageDown, roda dan gestur sentuh setelah overlay ditutup lulus |
| Ketahanan overlay | 20 buka/tutup cepat, Select Esc mempertahankan form, reduced motion dan React.StrictMode lulus |
| Console | Tidak ada error baru pada alur browser yang dicatat |
| Kontras badge | Minimum **9,45:1**, pada Nonaktif/Low; sembilan variasi badge diukur dari warna render browser |

Script test:handover yang sudah ada merujuk file tests/handover.test.mjs yang tidak tersedia, sehingga script tersebut tidak dapat dijalankan. Keberhasilan unit di atas tidak mencakup script yang hilang ini.

Bukti: [unit](unit-tests.log), [CRUD](crud.json), [referensi](references.json), [resilience](resilience.json), [storage](storage-browser.json), [peran](roles-browser.json), [responsive](responsive.json), [keyboard/kontras](extra-ui.json), [StrictMode](strict-mode.json), [guard induk](parent-guard.json). Log typecheck/lint/build setiap tahap tersimpan dengan prefix stage1–stage7 dan pemeriksaan final-contract terakhir. Mode API diuji dengan stub HTTP, tanpa menghubungi backend; semua halaman katalog dan metadata waktu server ikut diperiksa.

### Pixel dan CLS — pengecualian yang harus diketahui

Baseline dan hasil akhir memakai Chrome, waktu dibekukan, animasi screenshot dinonaktifkan, 1440 dan 390px. Master Data dikecualikan dari perbandingan identik karena memang diganti.

- Seluruh 14 screenshot Panel Viewer: **0% pixel berbeda**. Dashboard kedua ukuran juga 0%.
- Halaman lain umumnya 0%; Tickets desktop sekitar 0,3473% dan Shift Log desktop sekitar 0,0253%, masih di bawah 0,5%.
- **Reports mobile memiliki raw diff sekitar 0,5438%, melewati batas raw 0,5%.** Selisih dengan kanal RGB di atas 16 hanya sekitar 0,00025%; sebagian besar merupakan selisih warna render yang sangat kecil. Raw diff tetap dicantumkan, bukan dinyatakan lulus dengan mengganti ambang tanpa penjelasan. Lihat pixel-diff.json dan gambar before/after.
- Tidak ada sumber layout shift yang terukur di area komponen Master Data pada pengukuran terakhir. **CLS halaman global belum nol:** sekitar 0,00320 pada 1440 dan 0 pada 390. Sumber yang tercatat berada pada AppSplash/font dan hidrasi clock topbar, yang tidak diubah pada tugas ini. [Rincian sumber CLS](cls.json).

Dengan demikian, hasil ini tidak dinyatakan memenuhi seluruh ambang visual global secara mutlak. Dua catatan tersebut dan lint bawaan tetap tersedia untuk ditinjau.

## Source dan dokumen

Perubahan aplikasi dibandingkan snapshot sebelum tugas: 18 file baru, 25 file diubah, 8 komponen Master lama dihapus. Komponen lama dihapus setelah pencarian import membuktikan tidak ada pemakai. Daftar lengkap ada di source-changes.json; file yang sudah diubah pengguna sebelum tugas tidak diklaim sebagai perubahan pekerjaan ini.

| Kelompok | File utama |
| --- | --- |
| Model/migrasi | types/master-data.ts; lib/master-data-model.ts |
| Adapter/service | services/master-data-repository.ts, master-data-v2.ts, legacy-master-adapter.ts, mock-adapter.ts |
| State/routing | context/ClientContext.tsx; hooks/useMasterData.ts, useMasterReferences.ts, useMasterRoute.ts; lib/master-data-route.ts, permissions.ts |
| UI master | views/MasterDataView.tsx; master-data/MasterNavigation, MasterFilters, MasterList, MasterForm, MasterDetail, MasterStatusDialog, master-ui |
| Overlay/skeleton | ui/Modal.tsx; ui/skeleton/MasterDataSkeleton.tsx |
| Konsumen | TicketCreate/Edit/Detail/Table/Report, TicketSystemSelect, TicketsView, Monitoring/History/Schedule, ReportsView, TodayTicketRow, HandoverModal/ProjectSelect, beberapa viewer |
| Kompatibilitas | ui/MasterProjectName.tsx; lib/clientData.ts, query-state.ts, types.ts |
| Tes | master-data-v2.test.mjs, master-data-route.test.mjs; penyesuaian kontrak pada master-data.test.mjs |
| Dokumen | docs/master-data-api-contract.md; laporan dan galeri ini |

Kontrak API mencakup endpoint, query/envelope pagination, DTO camelCase, error 403/404/409/422, idempotensi, dampak/audit, katalog permission, key/ID tetap, perbedaan Tenant/Client/Project/System dan checklist perpindahan storage ke server. Backend tetap menjadi pekerjaan terpisah; tidak ada implementasi server dalam perubahan ini.
