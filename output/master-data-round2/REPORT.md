# Master Data tahap 1 dan 2: Personel, Peran, hapus aman

Tanggal: 28 Oktober 2026. Backend tidak disentuh dan tidak dibaca. Tidak ada commit.

## Temuan Langkah 0

**Yang ditinggalkan P0 di working tree**
- Storage tetap `ctd.masterData.v2`, `version: 2`, `schemaRevision: 3`. Tambahan opsional: `legacyReferences`, `mappingDecisions`, entri audit `mapping`/`backup`, kunci pemulihan `ctd.masterData.recovery.v1`.
- Izin: `master.review.read`, `master.mapping.decide`, `master.backup.manage`.
- File: `MasterReviewView`, `MasterMappingWorkspace`, `MasterTools`, `lib/master-backup.ts`, `lib/master-review.ts`, `lib/master-audit.ts` (dipakai ulang setelah dibaca), `lib/master-data-links.ts`, `tests/master-data-p0.test.mjs`.
- Pintu masuk yang disembunyikan: chip dan ikon "Perlu ditinjau" di header, menu `MasterTools`, parameter URL `view`/`ref`/`type`/`review`, filter Tinjauan, penanda di daftar dan detail, pecahan "Lewat ID / Pemetaan / Belum jelas" di detail dan dialog dampak, chip riwayat "Pemetaan", perhitungan ulang referensi saat menyimpan, `useMasterReview`.

**Team Roster dan konsumen personel**
- `ctd.roster.members` hanya dibaca, tidak pernah ditulis. Tambah/ubah anggota hanya mengubah state `AppShell` dan tidak muncul karena daftar memakai hasil fetch. Jadi tidak ada data tersimpan yang hilang, tetapi migrasi tetap membacanya.
- Seed: 14 anggota; semua punya ID pegawai, email, telepon, tanggal bergabung ("15 Jan 2024", bukan ISO). Tidak ada duplikat.
- Jadwal minggu, statistik, dan riwayat tertanam pada objek anggota seed. ID dipakai oleh tukar shift (`requesterId`/`targetMemberId`); nama tersimpan sebagai teks.
- `RosterRole` di-hardcode di tipe, filter peran, `MemberCreateModal`, dan `RosterStatCards` (perbandingan string).
- Konsumen berbasis **teks nama**: `owner`/`owners`/`escalatedTo` pada tiket, `owner` pada jadwal monitoring, `confirmedBy`/`sourcePic`/`targetPic`/`monitoringOwner` pada handover, `leadEngineer` pada proyek seed. Berbasis **id**: `picUserId`/`leadUserId`, tukar shift, dan kini `ownerIds` (tiket baru).
- Peran akses (Pengelola, Lead, Operator, Viewer) hanya dimodelkan sebagai pemetaan string di `permissions.ts`; tidak ada atribut akses pada personel.

## Keputusan sementara dan cara mengubahnya
1. Master Data satu-satunya sumber identitas; Team Roster tetap menjadwalkan. Pemetaan ada di `lib/people-roster.ts`.
2. Hapus permanen hanya untuk record yang tidak pernah dipakai. Aturan di `catalogDeleteCheck`, `personUsageOf`, `roleUsageOf` (`master-data-repository.ts`).
3. Kelima peran seed **protected**, karena `RosterStatCards` membandingkan ketiganya lewat string dan `permissions.ts` memetakan "shift lead"/"operator noc". Daftar di `seedRoles()` (`lib/master-people.ts`).
4. Kategori bawaan (7 kunci seed) tidak dapat dihapus permanen walau belum dipakai tiket (dipakai aplikasi). Dapat dilonggarkan di `catalogDeleteCheck`.
5. "Pernah diubah" = ada entri audit selain pembuatan; ini memblokir hapus. Entri baru memakai `kind: "create"`; record lama tanpa penanda dianggap belum diubah selama entri tertuanya seluruhnya berisi nilai awal.
6. Satu flag `MASTER_DATA_P0_ENABLED` (`lib/master-data-flags.ts`, `false`) untuk P0.

## Storage dan migrasi
Kunci tetap `ctd.masterData.v2`. Bila disebut "versi berikutnya": `schemaRevision` 3 → **4**, bukan kunci baru, supaya pembaca lain (`readMasterProjection`, tes, kompatibilitas cadangan) tetap berfungsi. Koleksi baru: `people`, `roles`, `tombstones`. Migrasi saat baca: seed 14 anggota + isi `ctd.roster.members` bila ada (id sama: versi tersimpan menang; lainnya dipertahankan; peran asing menjadi peran tidak protected). Koleksi lain, termasuk P0, dibawa tanpa diubah. Kunci roster tidak pernah ditulis. Storage rusak jatuh ke seed. Teruji di `tests/master-people.test.mjs`.

## Perubahan yang terlihat
- Grup baru **Tim & Operasional** (`?group=team&tab=people|roles`) dengan ringkasan Personel aktif, Peran aktif, Shift Lead aktif. Grup "Operasional (Segera)" tidak disentuh. Dua nama grup yang mirip dapat membingungkan; usul: saat Template Monitoring dan Kontak & Eskalasi dikerjakan, gabungkan ke satu grup "Operasional" dan pindahkan Personel/Peran ke dalamnya.
- Personel: tabel, kartu mobile, form (satu form dipakai juga oleh Team Roster), drawer (Ringkasan, Penggunaan, Riwayat), nonaktifkan/arsipkan/pulihkan dengan dampak, hapus aman dengan konfirmasi ketik nama.
- Peran: tabel, form, urut naik/turun (satu transaksi), nonaktifkan/hapus dengan alasan, tautan pemakaian ke daftar Personel terfilter.
- Team Roster membaca personel aktif dari Master Data (peserta baru muncul tanpa reload). Filter peran dinamis (kunci URL tetap untuk lima peran awal); toggle "Termasuk nonaktif" hanya muncul bila ada personel nonaktif, sehingga seed tidak berubah. Tombol Tambah/Ubah hanya untuk Pengelola.
- PIC picker (OwnerTagInput, TicketEditModal, form Organisasi/Proyek/Sistem) memakai personel aktif; PIC lama yang nonaktif tetap muncul dengan tag "Nonaktif". Tiket baru membawa `ownerIds`; tabel dan drawer tiket menampilkan nama terkini bila id dikenal. Teks tersimpan tidak pernah ditulis ulang.
- Tahap 2: hapus aman untuk Organisasi/Proyek/Sistem/Kategori (menu baris dan detail), riwayat dengan label terbaca dan chip filter, pesan relasi dikosongkan, "Tambahan" terbuka otomatis bila error di dalamnya, urut kategori satu transaksi, opsi urutan A–Z/Z–A/terakhir diubah di semua daftar, status simpan "Lokal - Tersimpan HH:mm".
- `DatePicker`: prop baru `showPresets` (default `true`); mode `single` sebelumnya menampilkan preset rentang yang menimpa tanggal tunggal.

## Verifikasi
- `tsc --noEmit` bersih; `vinext build` berhasil; eslint pada file baru/yang saya ubah tidak menambah temuan baru (temuan lain di file itu sudah ada sebelumnya, mis. `TicketCreateModal`, `TicketEditModal`, `DatePicker`).
- Tes: 38 tes master-data lama + baru lulus, ditambah 6 tes rute tim. Seluruh `tests/*.test.mjs`: 119 lulus, **17 gagal**; semuanya tes struktur CSS/HTML (mis. donut wrap, judul seksi Profil) pada file yang tidak saya ubah; saya tidak punya baseline bersih untuk membuktikan bahwa kegagalan itu sudah ada sebelum perubahan ini.
- Playwright (`scripts/`): tambah personel (validasi, duplikat, date picker tunggal), muncul di Team Roster tanpa reload, hapus personel baru, hapus diblokir dengan alasan untuk personel terpakai, nonaktifkan dengan dampak dan pulihkan, pengguna yang masuk tidak dapat dinonaktifkan, peran baru/urut/protected, peran baru muncul di filter roster, hapus aman Organisasi/Kategori, riwayat dan chip, pesan relasi. Semua PASS. 20 siklus buka-tutup form dan drawer: scroll lock, `inert`, `aria-hidden` bersih, tanpa error konsol.
- Pada 1920, 1440, 1024, 768, 390, dan 844x390: tanpa scroll horizontal, teks >= 11px, target sentuh >= 44px pada layar sentuh (kecuali input `sr-only` 1x1 milik komponen Select). Kontras badge terendah **8,19:1**. CLS halaman 0,00312 (sumber yang sudah ada: AppSplash/clock; membuka form menambah 0).
- Pixel diff halaman lain terhadap `master-data-round1/after` (clock disetel setelah muat): tiket, shift log, reports, team roster, runbooks, notifikasi, profil <= 0,48% raw pada 1440 dan 390 (over16 <= 0,06%). **Dashboard dan Monitoring di 1440 tidak stabil**: berubah antar-run (tinggi halaman berbeda, 0,16% sampai 6,6%) karena bagian yang dimuat lambat dan penanda jam; tidak dapat dinyatakan lulus atau gagal dari pengukuran ini. Lihat `pixel-diff.json`.
- Izin per peran: `NEXT_PUBLIC_MOCK_ROLE` dibaca saat build, jadi peran `lead`/`operator`/`viewer` hanya diuji di tingkat adapter (403 pada semua tulis), bukan lewat UI di server dev yang berjalan.

## Celah yang diketahui
- Peran akses belum menjadi atribut personel, jadi "satu-satunya Pengelola" belum dapat dilindungi.
- Relasi berbasis teks lama berhenti cocok dengan nama baru setelah rename; hapus tetap aman karena PIC id dan riwayat ikut memblokir, tetapi server sebaiknya menyimpan id.
- Jadwal Team Roster (shift, kehadiran, tukar shift) tetap sesi saja seperti sebelumnya.
- ~~Memulihkan cadangan JSON menghasilkan snapshot tanpa people.~~ **Dikoreksi 29 Oktober 2026:** keliru. `prepare()` mempertahankan personel dan peran yang sedang ada saat memulihkan cadangan. Lihat [master-data-refactor-plan.md](../../docs/master-data-refactor-plan.md), celah C6.
- Date picker tunggal berpindah per bulan; tanggal bergabung jauh ke belakang memerlukan banyak klik.
- Peran tidak punya drawer detail (hanya tabel dan form).

## File
Baru: `lib/master-data-flags.ts`, `lib/master-people.ts`, `lib/people-roster.ts`, `lib/ticket-owner.ts`, `components/master-data/{form-ui,list-chrome,team-ui,detail-ui,MasterHistory,PeopleList,RolesList,PersonFormModal,RoleFormModal,PersonDetail,TeamPanel,CatalogPanel,DeleteDialog,TeamStatusDialog}.tsx`, `tests/master-people.test.mjs`, `tests/master-data-team-route.test.mjs`.
Diubah: `types/master-data.ts`, `types.ts` (`ownerIds`, `roleKey`, `RosterRole` longgar), `permissions.ts`, `master-data-model.ts`, `master-data-route.ts`, `master-audit.ts`, `query-state.ts`, `master-data-repository.ts`, `master-data-v2.ts`, `mock-adapter.ts`, `useMasterData.ts`, `useMasterRoute.ts`, `MasterDataView`, `MasterNavigation`, `MasterFilters`, `MasterList`, `MasterDetail`, `MasterForm`, `MasterStatusDialog`, `master-ui`, `TeamRosterView`, `RosterStatCards`, `AppShell`, `OwnerTagInput`, `TicketCreateModal`, `TicketEditModal`, `TicketTable`, `TicketDetailDrawer`, `DatePicker`, dan tiga dokumen di `docs/`.
Dihapus: `components/team/MemberCreateModal.tsx` (terbukti tidak dipakai; file terlacak git sehingga dapat dipulihkan).
Dokumen: `docs/master-data-api-contract.md` (Personel, Peran, hapus aman, izin, penyimpanan, flag P0), catatan di awal `docs/master-data-next-plan.md` dan `docs/master-data-scope-review.md`.

## Perbaikan lanjutan (29 Oktober 2026)

Celah penyimpanan dan rute, perapian struktur kode, dan bukti bahwa tampilan tidak berubah dicatat di [docs/master-data-refactor-plan.md](../../docs/master-data-refactor-plan.md) (bagian "Hasil"). Alat ukurnya ada di `scripts/` (`snap.cjs`, `flowE.cjs`, `flowF.cjs`, `sweep.cjs`, `hover-audit.cjs`, `scan-display.cjs`, `format-long-lines.cjs`).
