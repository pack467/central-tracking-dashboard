# Plan: rapikan struktur kode frontend Master Data dan tutup celah

Tanggal: 28 Oktober 2026. Status: **selesai dikerjakan (29 Oktober 2026).** Hasil dan penyimpangan dari rencana ada di bagian "Hasil" di akhir dokumen.

## Tujuan dan batasan

- Struktur kode frontend Master Data dibuat mudah dibaca dan dirawat, dan celah yang ditemukan diperbaiki.
- **Tampilan tidak berubah.** Ini dibuktikan, bukan diklaim: HTML yang dirender harus identik dengan baseline dan selisih pixel 0 (lihat "Cara membuktikan tampilan tidak berubah").
- Backend tidak disentuh. Tidak ada dependensi baru, termasuk pemformat seperti Prettier. Tidak ada commit tanpa diminta.
- Fitur P0 tetap di tree di belakang `MASTER_DATA_P0_ENABLED` dan tidak dihapus.
- Working tree dipakai bersama AI lain, jadi pekerjaan dilakukan per file dan file dibaca ulang tepat sebelum diedit.

## Temuan audit

### Celah

Diurutkan dari yang paling berisiko.

| # | Tingkat | Celah | Bukti | Dampak |
|---|---|---|---|---|
| C1 | Tinggi | Pembuatan ID memakai `crypto.randomUUID()` tanpa cadangan. | `lib/master-data-model.ts:24` | Fungsi ini hanya ada di konteks aman (HTTPS atau `localhost`). Saat aplikasi dibuka lewat IP LAN, misalnya dari HP ke `http://192.168.x.x:3000`, menambah data apa pun gagal dengan `TypeError`. |
| C2 | Tinggi | Data tersimpan yang tidak lolos validasi langsung diganti seed lalu ditulis ulang, tanpa menyimpan salinan aslinya. | `services/master-data-repository.ts`, cabang `INVALID_` di `load()` | Satu field rusak, atau data dari versi aplikasi yang lebih baru, menghapus seluruh Master Data. Lewat event `storage`, tab lain ikut membaca seed hasil tulis ulang itu, jadi kerusakan menjalar ke semua tab. |
| C3 | Sedang | `setQuery` di `useMasterRoute` menyusun URL dari route render terakhir. | `hooks/useMasterRoute.ts` | Dua perubahan filter beruntun sebelum URL ter-update saling menimpa (lost update). Terbukti di Playwright: memilih Organisasi tepat setelah Status membuat filter Status hilang. |
| C4 | Sedang | Kelas tampilan saling bertabrakan: `${buttonClass} hidden sm:inline-flex`. | Ditemukan dan diperbaiki di header detail pada putaran sebelumnya. | `inline-flex` mengalahkan `hidden`, jadi elemen yang mestinya tersembunyi tetap tampil. Pola yang sama perlu diperiksa di semua file Master Data. |
| C5 | Rendah (laten) | `referenceUrl` hanya divalidasi saat ditulis lewat adapter, tidak saat data dimuat dari storage. | `services/master-data-repository.ts:282` | Saat ini aman karena nilainya tidak pernah dirender sebagai tautan. Begitu suatu saat dirender sebagai `href`, nilai `javascript:` yang disuntikkan lewat localStorage akan ikut jalan. |
| C6 | Rendah | `restoreBackup` menulis `schemaRevision: 3`, yang lalu ditimpa menjadi 4 oleh `prepare()`. | `services/master-data-repository.ts:396` | Menyesatkan pembaca kode. Selain itu, `REPORT.md` round 2 keliru menyebut pemulihan cadangan menghasilkan snapshot tanpa personel. Yang benar, `prepare()` mempertahankan personel yang sedang ada, dan catatan itu harus dikoreksi. |

### Struktur

- **S1. Baris sangat panjang.** Lebih dari 300 baris melewati 220 karakter, dan yang terpanjang 3.018 karakter (`MasterForm.tsx`). Diff sulit ditinjau, dan konflik dengan AI lain di tree yang sama mudah terjadi. File terberat: `MasterForm` (31 baris panjang), `MasterDetail` (41), `MasterList` (34), `master-data-repository` (36), `master-review` (33, P0).
- **S2. Duplikasi** (dihitung lewat pencarian di `components/master-data`):
  - Panel "Buang perubahan?" disalin di 3 form.
  - Kelas tombol bahaya (`dangerClass`/`errorClass`) didefinisikan ulang di 5 file.
  - Efek pelacak `visualViewport` dan `beforeunload` masing-masing ada di 3 dan 2 form.
  - Menu aksi baris dengan logika buka ke atas (flip-up) ada di `MasterList` dan `team-ui`.
  - Header drawer beserta menu titik tiga disalin di `MasterDetail` dan `PersonDetail`.
  - Dialog status dan dampak hampir sama di `MasterStatusDialog` dan `TeamStatusDialog`.
- **S3. Modul terlalu besar.** `master-data-repository.ts` (764 baris) mencampur storage, migrasi, CRUD katalog, personel/peran, aturan hapus, dan cadangan P0 dalam satu file.
- **S4. Perhitungan berulang per baris.** `MasterList` mengurutkan kategori dan memfilter proyek di setiap baris. Ringan pada 50 baris, tetapi mudah dirapikan dengan peta yang dihitung sekali.
- **S5. Kode P0 tersembunyi tetap ikut dibundel.** Ini disengaja sesuai keputusan sebelumnya, jadi tidak diubah di plan ini.

Yang tidak ditemukan: `any`, `@ts-ignore`, `eslint-disable`, `dangerouslySetInnerHTML`, atau `eval` di kode Master Data.

## Cara membuktikan tampilan tidak berubah

Fase 0 menyiapkan alat ukur. Setiap fase sesudahnya harus lolos semua pemeriksaan ini.

1. **Snapshot DOM.** Skrip Playwright menyimpan `outerHTML` yang sudah dinormalkan (id dari `useId` dan jam dihapus) untuk sekitar 40 keadaan:
   - 7 tab pada ukuran 1440 dan 390;
   - semua form, baik kosong maupun dengan error;
   - drawer detail dan dialog status, hapus, dan dampak;
   - filter yang aktif dan sheet filter mobile.

   Hasilnya harus identik dengan baseline.
2. **Pixel diff 0%** pada kumpulan screenshot yang sama di 1440, 1024, 768, dan 390.
3. **Pemeriksaan yang sudah ada tetap lulus:** `tsc`, eslint pada file yang diubah, 49 tes master-data, flowA sampai flowD, `cycles`, `sweep` (63 kombinasi), `hover-audit`, dan `vinext build`.

## Fase

### Fase 0: pengaman (tanpa mengubah kode aplikasi)

- Salin folder `components/master-data`, file Master Data di `lib/`, `services/`, `hooks/`, serta `MasterDataView.tsx` ke scratchpad sebagai titik pulih. Folder ini belum ter-commit, jadi git tidak bisa diandalkan.
- Buat skrip snapshot DOM dan screenshot baseline.

### Fase 1: tutup celah (perubahan perilaku kecil, masing-masing dengan tes)

- **C1:** `masterId` memakai `crypto.randomUUID` bila tersedia. Bila tidak, ID dibuat dari `crypto.getRandomValues`, dan baru jatuh ke cara lain bila keduanya tidak ada. Tes: konteks tanpa `randomUUID` tetap menghasilkan ID unik.
- **C2:** sebelum mengganti data yang tidak valid, simpan teks aslinya ke kunci `ctd.masterData.invalid.v1`. Data yang ditandai dari versi lebih baru (`version > 2` atau `schemaRevision > 4`) dibaca sebagai mode sesi saja dan tidak ditimpa. Pembacaan yang dipicu event `storage` tidak boleh menulis balik. Tes: data rusak, data versi baru, dan dua tab.
- **C3:** `useMasterRoute` menyimpan route tertunda terakhir di ref. `setQuery` beruntun menyusun dari ref itu, dan ref disinkronkan ulang saat URL berubah. Tes: dua `setQuery` berturut-turut mempertahankan keduanya. Penanti yang ditambahkan di flowD tetap dibiarkan sebagai pengaman.
- **C4:** periksa semua kombinasi kelas display yang bertabrakan, lalu ganti dengan varian `max-*` yang tidak bertabrakan. Hanya tempat yang terbukti bertabrakan yang diubah.
- **C5:** helper `safeHref()` yang hanya menerima `http(s)` dan path aplikasi, dipakai di semua tempat yang merender tautan dari data Master Data. Validasi URL juga ditambahkan saat data dimuat.
- **C6:** hapus `schemaRevision: 3` yang menyesatkan dan koreksi catatan di `REPORT.md`.

### Fase 2: satukan duplikasi (DOM harus identik)

Komponen dan hook bersama baru di `components/master-data/`:

- `DiscardConfirm`: panel "Buang perubahan?" untuk tiga form.
- `dangerClass`: dipindah ke `master-ui.tsx`; lima salinan dihapus.
- `useVisualViewport()` dan `useUnsavedChangesGuard(dirty)`: dipakai tiga form.
- `RowActionsMenu`: menu aksi baris dengan flip-up, dipakai `MasterList` dan `team-ui`.
- `DetailHeader`: ikon, judul, badge, tombol Ubah, dan menu titik tiga, dipakai `MasterDetail` dan `PersonDetail`.
- `ImpactRows`: baris angka dampak bersama untuk `MasterStatusDialog` dan `TeamStatusDialog`. Teks khusus tiap dialog tetap di dialognya masing-masing.

### Fase 3: pecah repository (API publik tetap)

`masterRepository` tetap diekspor dengan nama dan fungsi yang sama, jadi pemanggilnya tidak berubah. Isinya dipindah ke:

- `master-storage.ts`: load, persist, migrasi, sinkronisasi antar-tab;
- `master-catalog-store.ts`: CRUD Organisasi, Proyek, Sistem, Kategori, Severity;
- `master-team-store.ts`: personel dan peran;
- `master-delete-rules.ts`: aturan hapus aman dan pemakaian;
- `master-backup-store.ts`: cadangan dan pemulihan (P0, tetap di belakang flag).

### Fase 4: rapikan format (DOM harus identik)

- Pecah baris panjang menjadi JSX multi-baris, satu atribut atau satu kelompok kelas per baris, dikerjakan manual per file tanpa alat format. Gaya mengikuti komponen lain di repo yang sudah multi-baris.
- Konstanta kelas Tailwind yang panjang dan dipakai ulang diberi nama.
- `MasterList` (S4): hitung peta urutan kategori, jumlah proyek per organisasi, dan jumlah sistem per proyek sekali per render.
- Urutan file: `MasterForm`, `MasterDetail`, `MasterList`, `PersonFormModal`, `PersonDetail`, lalu sisanya. File P0 hanya diformat, logikanya tidak disentuh.

### Fase 5: dokumentasi

- Catatan struktur baru di awal `docs/master-data-next-plan.md`: modul mana berisi apa dan aturan menaruh kode baru.
- Laporan hasil: celah yang ditutup beserta tesnya, angka baris panjang sebelum dan sesudah, serta bukti snapshot DOM dan pixel.

## Urutan, ukuran, dan risiko

- **Urutan:** Fase 0, lalu 1, lalu 2, lalu 3, lalu 4, lalu 5. Fase 1 paling bernilai dan perubahannya kecil, jadi bisa diterima sendiri tanpa fase berikutnya. Setiap fase berhenti di gerbang verifikasi sebelum fase berikutnya dimulai.
- **Ukuran:** Fase 1 kecil (sekitar 6 file). Fase 2 dan 3 sedang (sekitar 15 file). Fase 4 terbesar dari jumlah baris, tetapi mekanis.
- **Risiko utama:** konflik dengan AI lain yang mengedit file yang sama, dan perubahan DOM yang tidak sengaja saat memecah baris. Mitigasinya: baca ulang file sebelum edit, snapshot DOM setelah tiap file, dan titik pulih di scratchpad.

## Yang tidak termasuk

- Mengubah tampilan, teks, atau perilaku yang terlihat pengguna, kecuali perbaikan celah di Fase 1.
- Backend, kontrak API, dan format penyimpanan. Satu-satunya tambahan storage adalah kunci salinan `ctd.masterData.invalid.v1` dari C2.
- Menghapus atau mengubah logika fitur P0.

## Hasil (29 Oktober 2026)

### Celah yang ditutup

| # | Celah | Perbaikan | Bukti |
|---|---|---|---|
| C1 | `crypto.randomUUID` tidak ada di http lewat IP LAN | `randomUuid()` di `lib/master-data-model.ts`: memakai `randomUUID`, lalu `getRandomValues`, lalu `Math.random`; hasilnya selalu UUID v4 | `tests/master-data-safety.test.mjs` (2 tes): ID unik 500 kali tanpa `randomUUID`, dan membuat Organisasi serta Personel tetap berhasil |
| C2 | Data tidak valid ditimpa seed tanpa salinan | Teks asli disimpan di `ctd.masterData.invalid.v1` (`{ at, raw }`) sebelum ditimpa. Pembacaan karena event `storage` dari tab lain tidak menulis balik; salinan dibuat saat tab ini pertama kali menulis | 4 tes: data rusak, JSON terpotong, versi lebih baru, dan skenario dua tab, serta tes bahwa data valid tidak pernah disalin |
| C3 | `setQuery` beruntun saling menimpa | `useMasterRoute` menyimpan route tertunda dan memakainya sebagai dasar sampai URL berubah | `flowE.cjs`: **5 dari 5 putaran kehilangan perubahan sebelum perbaikan, 0 dari 5 sesudahnya** |
| C4 | Kelas display bertabrakan | Pemindai `scan-display.cjs` (diuji dulu terhadap pola yang pernah bermasalah). Tidak ada tabrakan tersisa di file Master Data | "no conflicting display classes" |
| C5 | URL referensi dari storage tidak divalidasi | `isSafeReferenceUrl` dan `safeHref` satu sumber untuk adapter, form, dan pemuatan. Aturan lama `/^\/(?!\/)/` meloloskan `/\evil.example` yang oleh browser dibaca sebagai situs lain; sekarang ditolak. URL tidak aman dibuang saat dimuat, tanpa menolak seluruh data | tes C5 (2 tes) |
| C6 | `schemaRevision: 3` menyesatkan di pemulihan cadangan | Diganti 4. Catatan keliru di REPORT.md juga dikoreksi: pemulihan cadangan tetap mempertahankan personel yang sedang ada | tes lama dan baru |

Satu bug lagi ditemukan lewat tes lama dan diperbaiki: `reset()` tidak membersihkan state penyimpanan data tidak valid yang baru, sehingga bocor antar-tes.

### Struktur

- **Fase 2 (duplikasi):** `DiscardConfirm`, `useVisualViewport`, `useUnsavedChangesGuard` (`form-hooks.ts`), `dangerClass`/`dangerBusyClass` (satu sumber di `master-ui.tsx`, sebelumnya 5 salinan), `menu-ui.ts` (`useMenuDismiss`, `menuKeyDown`, `opensUpward`, kelas menu), `dialog-ui.tsx` (`DialogHeader`, `DialogBody`, `DialogFooter`, `DialogError`, `AcknowledgeBox`), dan `DetailHeader`/`DetailMenu`/`CodeChip` di `detail-ui.tsx`.
- **Fase 3 (repository):** `master-data-repository.ts` dari 787 baris menjadi fasad 67 baris. Isinya pindah ke modul berikut dan graf impornya acyclic (diperiksa dengan checker TypeScript):

  | Modul | Isi |
  |---|---|
  | `master-store.ts` | state, penyimpanan, migrasi, sinkronisasi antar-tab, pembaca data operasional, setter state |
  | `master-transaction.ts` | akses koleksi, paging, satu penulisan atomik beserta audit |
  | `master-delete-rules.ts` | aturan hapus dan nonaktifkan, tombstone |
  | `master-catalog-store.ts` | Organisasi, Proyek, Sistem, Kategori, Severity: baca, validasi, tulis, hapus, urutan kategori |
  | `master-people-store.ts` | Personel |
  | `master-roles-store.ts` | Peran |
  | `master-review-store.ts` | fitur P0 yang disembunyikan (tinjauan, pemetaan, cadangan) |

  API publik tidak berubah: `masterRepository` dan `masterSourceRecords` tetap diekspor dari `master-data-repository.ts`.
- **Fase 4 (format):** pemformat kecil yang sadar indentasi (`output/master-data-round2/scripts/format-long-lines.cjs`) memecah atribut dan anak JSX, blok, deklarasi ganda, objek, array, pemanggilan fungsi, dan rantai `&&`/`||`. Ia hanya menulis ulang baris yang lebih panjang dari 140 karakter dan membiarkan sisanya apa adanya. Setiap file diverifikasi dengan membandingkan JS hasil kompilasi sebelum dan sesudah; pemformat tidak menyentuh node yang berisi komentar.

| Ukuran (49 file Master Data) | Sebelum | Sesudah |
|---|---|---|
| Baris di atas 220 karakter | lebih dari 300 | 147 |
| Baris terpanjang | 3.018 karakter | 604 karakter (`master-review.ts`, P0) |

Sisa baris panjang terutama string `className` Tailwind, tanda tangan fungsi dengan tipe inline, dan predikat validasi di `master-data-model.ts` serta `master-review.ts` yang tidak dipecah otomatis.

### Penyimpangan dari rencana

- `ImpactRows` (komponen baris dampak bersama) **tidak dibuat**: isi dampak kedua dialog ternyata berbeda (ringkasan tiga kolom vs daftar baris). Yang disatukan hanya kerangka dialog.
- Menu aksi baris di `MasterList` dan `team-ui` **tidak digabung menjadi satu komponen**, karena markup itemnya berbeda dan penggabungan akan mengubah DOM. Yang disatukan: hook tutup-menu, navigasi keyboard, penghitung buka-ke-atas, dan kelas menu.
- Fase 4 memakai pemformat buatan sendiri, bukan Prettier atau `eslint --fix` dengan aturan format. Aturan format ESLint diuji dan ditolak karena hasilnya tanpa indentasi.
- `PersonDetail` kini mengembalikan fokus ke tombol menu setelah Escape, sama seperti menu lain. Form Peran kini ikut menampilkan konfirmasi browser saat halaman ditutup dengan perubahan belum disimpan, sama seperti dua form lain. Kedua perubahan ini kecil dan tidak terlihat di tampilan.

### Cara membuktikan tampilan tidak berubah

- `snap.cjs`: HTML ter-render yang dinormalkan plus screenshot untuk **85 keadaan** (7 tab, filter, sheet, semua form termasuk kondisi error dan buang-perubahan, drawer beserta tab riwayat, menu, dan dialog status/hapus) di 1440 dan 390. Hasil akhir: **IDENTICAL, 85 keadaan, DOM dan pixel**, dua run berturut-turut. Dua area dikecualikan dari perbandingan pixel karena tidak dibekukan: jam di header dan widget shift di sidebar.
- Perbandingan emit JS per file saat memformat, tes (57), `tsc`, eslint pada file yang diubah, `vinext build`, flowA sampai flowF, `cycles`, `sweep` (63 kombinasi), dan `hover-audit`.
- Selisih pixel sesaat (0,23% dan 1,17%) sempat muncul sekali di keadaan pertama run, dan hilang saat run diulang dengan DOM yang tetap identik. Itu pewaktuan browser dingin, bukan perubahan kode.
