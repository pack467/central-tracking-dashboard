# Kontrak API Master Data v2

> **Pembaruan 28 Oktober 2026.** Bagian [Personel, Peran, dan hapus aman](#personel-peran-dan-hapus-aman-28-oktober-2026) di akhir dokumen menambah entitas `person` dan `role`, aturan hapus permanen, dan izin `delete`. Fitur "Perlu ditinjau", "Tinjau referensi", dan cadangan JSON sudah dibatalkan dan disembunyikan (lihat [Fitur P0 yang disembunyikan](#fitur-p0-yang-disembunyikan)); kontraknya tidak perlu diimplementasikan server.

Status: usulan kontrak frontend, 27 Oktober 2026. Implementasi saat ini memakai mock. Dokumen ini tidak membuat endpoint, tabel, migrasi, atau perubahan backend.

## Ruang lingkup dan keputusan model

- Satu `Organization`, dengan `kind: tenant | client`. Semua delapan organisasi lama tetap `client`; ID dan pemilik proyek dipertahankan.
- Satu proyek dimiliki satu organisasi melalui `organizationId`. `relatedClientIds` merupakan relasi tambahan ke organisasi berjenis `client`, bukan pemilik kedua.
- Sistem menjadi entitas tersendiri di bawah proyek. Organisasi sistem diturunkan dari proyek.
- Kategori memiliki ID dan `key` tetap. Mengganti nama tampilan tidak mengganti nilai pada tiket.
- Empat kode severity tetap. Pengaturan hanya mengubah `displayName` dan `description`.
- Personel dan Peran sudah termasuk (lihat bagian akhir). SLA, template monitoring, kontak terpisah, definisi shift, import/export, dan bulk edit belum termasuk.

Keputusan jenis organisasi dan konversi field lama diisolasi pada `frontend/app/types/master-data.ts` dan `frontend/app/lib/master-data-model.ts`. Jika model bisnis berubah, ubah mapper, DTO, dan kontrak relasinya terlebih dahulu; jangan memindahkan data otomatis berdasarkan nama.

## Konvensi

Base path relatif terhadap `NEXT_PUBLIC_API_URL`: `/master`. JSON memakai camelCase. Tanggal memakai ISO 8601 UTC. UI menampilkan waktu dalam Asia/Jakarta.

`NEXT_PUBLIC_USE_MOCK` default aktif. Nilai `false` mengarahkan service v2 ke API client; halaman tidak melakukan `fetch` langsung. Server yang memenuhi kontrak ini tetap perlu disiapkan secara terpisah. Tidak ada permintaan ke backend dalam pengujian implementasi mock.

Daftar mengembalikan:

```json
{
  "data": [],
  "meta": { "page": 1, "pageSize": 10, "total": 47, "totalPages": 5 }
}
```

Detail/mutasi/dampak mengembalikan `{ "data": ... }`. `total` berasal dari seluruh hasil yang sesuai filter, sebelum pagination. Daftar kosong memiliki `totalPages: 1`.

Parameter daftar:

| Query | Nilai / perilaku |
| --- | --- |
| `q` | Pencarian identitas/deskripsi, tanpa membedakan kapital |
| `status` | `all`, `active`, `inactive`, `archived`; proyek hanya active/archived |
| `kind` | `all`, `tenant`, `client`; organisasi saja |
| `organizationId` | Filter pemilik proyek atau organisasi sistem |
| `projectId` | Filter proyek induk sistem |
| `sort` | `name`, `-name`, `updated`, `-updated`, `order`. Semua daftar menawarkan A–Z, Z–A, dan terakhir diubah; kategori, severity, dan peran juga `order`. Kategori/severity tidak punya `updatedAt` sendiri: urutan "terakhir diubah" memakai entri audit terbaru. |
| `page` | Bilangan mulai 1; di luar rentang dijepit ke halaman terakhir |
| `pageSize` | 10, 25, 50; default 10 |

Kategori memakai `active`; filter status `inactive` memetakan `active: false`. Severity diurutkan berdasarkan `level` dan tidak memiliki status arsip. `organizationId`/`projectId` bukan filter yang relevan untuk kategori/severity.

## Endpoint

Nama koleksi: `organizations`, `projects`, `systems`, `categories`, `severities`.

| Method | Path | Hasil / kebutuhan |
| --- | --- | --- |
| GET | `/master/meta` | `{ data: { lastSavedAt, revision } }`; waktu perubahan master terakhir dalam lingkup izin, termasuk kategori/severity |
| GET | `/master/{collection}` | Daftar berhalaman sesuai query di atas |
| GET | `/master/{collection}/{id}` | Detail; `{id}` severity berupa kode lowercase |
| POST | `/master/{collection}` | Membuat record; tidak tersedia untuk severity |
| PUT | `/master/{collection}/{id}` | Perubahan parsial field yang dapat diedit |
| PATCH | `/master/{collection}/{id}/status` | `{ "status": "active" }`; tidak tersedia untuk severity |
| GET | `/master/{collection}/{id}/impact` | Dampak dari seluruh dataset dalam lingkup izin |
| GET | `/master/{collection}/{id}/audit?page=1` | Riwayat terbaru dahulu, 10 entri per halaman |
| PUT | `/master/categories/order` | `{ "ids": string[] }`: urutan baru semua kategori **aktif**, satu operasi atomik (lihat TicketCategory) |

DELETE hanya tersedia untuk organisasi, proyek, sistem, dan kategori, dan hanya untuk record yang **belum pernah dipakai** (lihat bagian Hapus aman). Severity tidak dapat dihapus. Selain itu nonaktif/arsip menggunakan perubahan status. Kategori mengartikan `active` sebagai aktif dan `inactive`/`archived` sebagai `active: false`. Pilihan `sort` daftar kategori: `order` (urutan tiket, bawaan), `name`, `-name`, `-usage` (terbanyak dipakai), `-updated`.

Metadata diperbarui dalam transaksi yang sama dengan mutasi dan audit. Membaca katalog tidak mengubah lastSavedAt. Frontend tidak menebak waktu simpan kategori/severity dari timestamp organisasi atau waktu halaman dibuka.

POST/PUT membawa header `Idempotency-Key`. Mengulang key dengan payload dan pelaku sama menghasilkan record yang sama tanpa audit tambahan. Key yang sama dengan payload berbeda menghasilkan 409. Mock menyimpan 200 key terakhir; retensi/durasi idempotensi server perlu ditetapkan tim API. Jangan mengandalkan tombol disabled sebagai satu-satunya pencegah duplikasi.

## DTO

Field berakhiran `?` opsional. String opsional kosong dinormalisasi menjadi tidak terisi. Pengosongan relasi PIC/lead memakai `null`. ID, pelaku, audit, dan timestamp tidak diisi pengguna.

### Organization

```ts
type Organization = {
  id: string;
  kind: "tenant" | "client";
  code: string; // trim, uppercase, maksimum 32; unik global tanpa beda kapital
  name: string; // wajib, maksimum 255
  shortName?: string; // maksimum 100
  description?: string; // maksimum 2000
  logoUrl?: string; // lihat "Logo" di bawah
  picUserId?: string;
  picContact?: { name: string; email?: string; phone?: string };
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
};
```

**Istilah tampilan (UI, 28 Oktober 2026):** pada Organisasi, `picUserId` / `picContact` ditampilkan sebagai **Leader**; pada Proyek, `leadUserId` ditampilkan sebagai **PIC**; pada Sistem, `picUserId` tetap **PIC sistem**. Nama field dan DTO tidak berubah, jadi tidak ada migrasi data; hanya label UI dan riwayat yang memakai istilah ini.

Leader/PIC internal harus merujuk pengguna terdaftar dari sumber Team Roster. `picUserId` dan `picContact` saling eksklusif; keduanya boleh kosong. Kontak eksternal tidak otomatis menjadi akun login. Email divalidasi jika diisi. Organisasi aktif terakhir tidak boleh dinonaktifkan atau diarsipkan.

### Project

```ts
type Project = {
  id: string;
  organizationId: string;
  relatedClientIds?: string[];
  code: string; // unik dalam organizationId, maksimum 32
  name: string;
  shortName?: string;
  scope?: string;
  logoUrl?: string;
  leadUserId?: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};
```

Induk baru harus aktif. Pemindahan organisasi ditolak jika proyek memiliki sistem, tiket, atau checkpoint. Alur transfer tidak termasuk rilis ini. Jumlah sistem/tiket/checkpoint merupakan hasil hitung, bukan field mutasi.

### System

```ts
type System = {
  id: string;
  projectId: string;
  name: string;
  code: string; // otomatis dari nama jika kosong; unik dalam projectId
  /** @deprecated 29 Oktober 2026. Tidak lagi diminta, ditulis, ditampilkan, dicari, atau diurutkan. Nilai lama di storage dibiarkan. */
  environment?: "Production" | "Staging" | "DRC";
  /** @deprecated 29 Oktober 2026. Sama seperti environment. Tidak berkaitan dengan severity tiket. */
  criticality?: "critical" | "high" | "medium" | "low";
  picUserId?: string; // kosong: mengikuti PIC proyek
  description?: string;
  referenceUrl?: string; // http/https atau path aplikasi yang diawali satu slash
  logoUrl?: string;
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
};
```

### Logo (Organisasi, Proyek, Sistem; ditambahkan 29 Oktober 2026)

`logoUrl` opsional pada ketiga entitas. Frontend mengecilkan gambar di browser (PNG, JPG, atau WebP, file maksimum 2 MB) menjadi paling besar 128 × 128 px dan mengirimnya sebagai data URL base64 di field ini. Hasilnya biasanya 2–20 KB.

- Nilai yang diterima: `data:image/(png|jpeg|webp);base64,...` atau URL `https://`. SVG ditolak karena bisa membawa skrip. Panjang maksimum 200.000 karakter. Nilai lain: `422 INVALID_LOGO` dengan `field: "logoUrl"`.
- String kosong pada `PUT` menghapus logo; field yang tidak dikirim membiarkan logo apa adanya.
- Riwayat tidak menyimpan gambarnya: perubahan dicatat sebagai `"Logo lama"` → `"Logo baru"` (atau `null` saat ditambah/dihapus).
- Pencarian `q` tidak mencocokkan isi `logoUrl`.
- **Untuk backend:** `ValidationPipe` memakai `forbidNonWhitelisted: true`, jadi DTO create/update ketiga entitas wajib mencantumkan `logoUrl` (`@IsOptional() @IsString() @MaxLength(200000)` plus pola di atas). Bila nanti server menyimpan file sendiri, server boleh mengganti data URL dengan URL `https://` hasil unggah; frontend menampilkan keduanya.

`organizationId` sistem bukan input tersimpan. Pulihkan proyek/sistem hanya jika semua induk aktif.

**Environment dan Criticality dihapus dari DTO create/update sistem (29 Oktober 2026).** Payload POST/PUT sistem: `projectId`, `name`, `code?`, `picUserId?`, `description?`, `referenceUrl?`, `logoUrl?`, `status`. Untuk backend: hapus kedua field dari DTO input; pada respons tandai deprecated (boleh tetap dikirim bila ada, boleh dihilangkan). Server yang masih menerima kedua field harus **mengabaikannya tanpa error** agar klien lama tidak rusak; `forbidNonWhitelisted` tidak boleh menolak payload lama. Migrasi tidak destruktif: nilai lama di data tersimpan dibiarkan apa adanya dan tidak ditulis ulang oleh pengubahan sistem; validasi menerima data lama yang berisi maupun yang tidak berisi kedua field (nilai di luar daftar lama dibuang saat impor cadangan). Mock mengembalikan `environment: "Production"` dan `criticality: "medium"` pada proyeksi lama (`systemToLegacy`) hanya agar pembaca operasional lama tidak rusak.

### TicketCategory

```ts
type TicketCategory = {
  id: string;
  key: string; // immutable; kode tampil, dibuat dari nama saat kategori dibuat
  name: string; // maksimum 40 karakter; unik tanpa beda kapital
  description?: string;
  color: CategoryColorKey; // kunci palet, bukan hex
  active: boolean;
  sortOrder: number; // integer >= 0; diatur lewat PUT /master/categories/order
  usageCount: number; // readonly, dihitung dari seluruh tiket
};
type CategoryColorKey = "sky" | "blue" | "cyan" | "emerald" | "lime" | "amber" | "orange" | "red" | "rose" | "purple" | "indigo" | "slate";
```

Payload POST/PUT: `name`, `description?`, `color?`, `active`. Tidak ada `sortOrder` pada form: kategori baru ditempatkan paling akhir (`max(sortOrder) + 1`), kategori yang diubah tetap di tempatnya. `sortOrder` hanya diterima bila dikirim eksplisit (klien lama) dan harus bilangan bulat >= 0. `key` tidak dapat diubah.

**Kode (`key`)**: kategori baru memperoleh `key` dari nama: huruf besar, selain huruf/angka menjadi `-`, maksimum 28 karakter; bentrok diberi akhiran `-2`, `-3`. Mengganti nama tidak mengubah `key`, sehingga tiket lama tetap menunjuk kategori yang sama. Tujuh key seed (tidak diubah), sesuai urutan: `Maintenance`, `Incident`, `Change Request`, `Escalation`, `Ad-hoc Request`, `Monitoring`, `Monitoring Alert`.

**Urutan (`PUT /master/categories/order`)**: body `{ "ids": [...] }` memuat semua id kategori aktif tepat satu kali. Kategori aktif mengisi, sesuai urutan yang diberikan, posisi yang sebelumnya ditempati kategori aktif; kategori nonaktif tidak berpindah. Satu transaksi: semua perubahan `sortOrder` dan entri audit (`field: "sortOrder"`) tersimpan bersama atau tidak sama sekali. Daftar tidak lengkap, ganda, atau berisi id asing: `422 VALIDATION_ERROR`, `field: "ids"`. Membatalkan dialog "Atur urutan" di UI tidak memanggil endpoint ini.

### Warna kategori

Kategori menyimpan **kunci palet**, bukan kode warna. Dua belas warna bernama (Biru muda, Biru, Cyan, Hijau, Lime, Kuning, Oranye, Merah, Merah muda, Ungu, Indigo, Abu); delapan pertama adalah warna yang selalu dipakai seri grafik kategori, sehingga data lama tampil sama persis. Satu modul frontend (`lib/category-colors.ts`) memetakan kunci ke kelas titik, lencana, dan hex grafik; layar lain meminta warna lewat `resolveCategoryColor(ref, categories)`, bukan lewat daftar warna sendiri. Pencarian kategori oleh resolver: id, lalu `key`, lalu nama (tanpa beda kapital); tidak ditemukan atau tanpa warna = abu netral, tidak ditebak. Mengganti nama tidak mengubah warna tiket lama; kategori nonaktif tetap berwarna. Dua kategori boleh memakai warna yang sama (UI hanya memberi petunjuk "Sama dengan: …"). Kategori baru tanpa `color` memakai warna palet yang belum dipakai kategori lain, lalu yang paling jarang dipakai. `color` di luar palet: `422 VALIDATION_ERROR`, `field: "color"`. Riwayat mencatat `color` dengan label "Warna" dan nama warna (mis. "Biru muda" → "Merah"). Warna severity tidak dapat diubah.

Kategori nonaktif tidak menjadi pilihan tiket baru. Tiket lama dan filternya tetap dapat menampilkan key tersebut dengan nama terbaru/penanda arsip. Kategori legacy di luar katalog tetap dapat dibaca.

### Severity

```ts
type Severity = {
  code: "critical" | "high" | "medium" | "low";
  displayName: string; // wajib, maksimum 24 karakter
  description?: string;
  level: 1 | 2 | 3 | 4; // readonly: critical=1, high=2, medium=3, low=4
  color: string; // readonly dari palet aplikasi
  usageCount: number; // readonly
};
```

Payload PUT hanya `displayName`, `description?`. **Deskripsi bawaan (29 Oktober 2026)**, hanya nilai awal di mock dan tidak pernah menimpa isian pengguna: Critical "Layanan utama mati total", High "Fungsi penting terganggu", Medium "Sebagian fungsi terganggu, ada solusi sementara", Low "Dampak kecil, tidak mendesak". Untuk backend: `ticket_severities` hanya memiliki `code_name` dan `name`; `description` dan `level` belum ada di skema. Warna: critical `#ef4444`, high `#f97316`, medium `#f59e0b`, low `#2dd4bf`. Nilai pada tiket tetap `Critical`, `High`, `Medium`, `Low`; badge/grafik/perhitungan tetap memakai kode tersebut. Tidak ada tambah, hapus, ubah level, atau ubah palet.

### Audit dan dampak

```ts
type AuditEntry = {
  id: string;
  entityType: "organization" | "project" | "system" | "category" | "severity";
  entityId: string;
  at: string;
  byUserId: string;
  byName: string;
  changes: { field: string; from: unknown; to: unknown }[];
};
type MasterImpact = {
  organizations: number;
  projects: number;
  systems: number;
  checkpoints: number;
  activeCheckpoints: number;
  tickets: number;
  activeTickets: number;
  parentActive: boolean;
  parentReason?: string;
};
```

Pelaku berasal dari sesi terautentikasi. Audit dibuat bersama transaksi mutasi; update tanpa perubahan tidak membuat entri. Null menunjukkan field kosong pada audit. Password/token tidak menjadi field master maupun audit.

Mock membaca seluruh `ctd.tickets.v4`, dengan fallback seluruh 105 tiket seed; menghitung semua jadwal monitoring organisasi terkait dan assessment `ctd.checkpoints`. Checkpoint NOK tetap aktif, OK/adequate selesai; tanpa assessment mengikuti status jadwal. `Closed`/`ditutup` bukan tiket aktif.

**Batas data lama:** tiket/checkpoint seed belum memiliki `systemId`. Dampak sistem hanya menghitung relasi sistem yang eksplisit, bukan menebak berdasarkan nama proyek. Angka 0 pada sistem tidak membuktikan ketiadaan pemakaian legacy. Server perlu menyediakan relasi sistem yang sebenarnya sebelum angka itu digunakan untuk kebijakan penghapusan/transfer.

## Error dan izin

```json
{ "statusCode": 409, "message": "Kode sudah digunakan.", "code": "DUPLICATE_CODE", "field": "code" }
```

API client mengonversi kegagalan menjadi `ApiError`. UI memerlukan `details.field` atau field body error untuk mengarahkan fokus ke input yang salah. Kode yang digunakan mock:

| HTTP | Kode / kondisi |
| --- | --- |
| 403 | `FORBIDDEN`: tidak memiliki izin; severity tidak dapat dibuat/diarsipkan |
| 404 | `NOT_FOUND`: ID tidak ditemukan |
| 409 | `DUPLICATE_CODE`, `IDEMPOTENCY_CONFLICT`; personel/peran/hapus: `DUPLICATE_EMPLOYEE_ID`, `DUPLICATE_EMAIL`, `DUPLICATE_NAME`, `IN_USE`, `LAST_ACTIVE_HOLDER`, `SELF_PROTECTED`, `ROLE_PROTECTED`, `ROLE_IN_USE` |
| 422 | `VALIDATION_ERROR`, `INVALID_USER`, `INACTIVE_USER`, `INACTIVE_ROLE`, `INVALID_EMAIL`, `INVALID_URL`, `INVALID_PARENT`, `PARENT_LOCKED`, `PARENT_INACTIVE`, `LAST_ACTIVE_CLIENT`, `INVALID_RELATION` |

Permission katalog: `master.{organization|project|system|ticketRef|person|role}.{read|create|update|archive|delete}`. Category/severity memakai `ticketRef`; severity tetap hanya read/update (tidak ada create/archive/delete). Nama izin fitur P0 yang dibatalkan (`master.review.read`, `master.mapping.decide`, `master.backup.manage`) tetap ada di katalog tetapi tidak dipakai UI.

| Peran mock | Master tersedia |
| --- | --- |
| `manager` (default) | Semua aksi yang relevan |
| `lead` | Baca; konfigurasi operasional belum termasuk |
| `operator` | Baca |
| `viewer` | Baca |

Ubah peran pengujian melalui `NEXT_PUBLIC_MOCK_ROLE`. Mock memakai identitas pengguna sesi untuk audit, terpisah dari pemetaan peran simulasi. **Pembatasan UI/mock bukan otorisasi server.** Server wajib memeriksa permission dan lingkup organisasi pada setiap endpoint, termasuk hitungan dampak/audit.

## Migrasi dan kompatibilitas

- Kunci baru `ctd.masterData.v2`; v1 tetap menjadi cadangan dan tidak ditimpa/dihapus oleh migrasi.
- Delapan ID organisasi dan 47 ID proyek/sistem dipertahankan; hubungan `clientId` menjadi `organizationId`, tanpa memindahkan induk.
- Status sistem `maintenance` menjadi `active` + `legacyCondition: maintenance`; `deprecated` menjadi `archived`. Proyeksi lama masih mengembalikan status lama yang diperlukan pembaca operasional.
- Penanda maintenance tidak dihapus oleh pengubahan nama atau status administrasi. Kondisi operasional tidak diedit melalui Master Data.
- Jika v1 lama berisi seluruh organisasi nonaktif, migrasi mempertahankan datanya. Pengelola dapat memulihkan satu organisasi; aturan organisasi aktif terakhir berlaku pada mutasi berikutnya. Data nonaktif tidak ditawarkan untuk transaksi baru.
- `legacyKey` proyek menyimpan string operasional historis yang tetap. Record lama yang ID-nya dikenal memakai key seed walaupun nama v1 sudah berubah. Tiket baru juga menyimpan `projectId`; `project` tetap tersedia untuk kompatibilitas.
- Resolver bersama menangani alias dalam lingkup organisasi, misalnya EPC Tools → EPC dan SM / ActiveMQ → SM. ID/key historis yang cocok tepat diprioritaskan; alias ambigu atau tidak dikenal tidak ditebak. Identitas seri grafik historis belum diganti massal.
- Respons proyek selama transisi perlu menyediakan `legacyKey` tersebut, atau mapper migrasi server harus mengembalikannya. Field ini tidak dapat diedit pengguna. Jangan membuat ulang ID berdasarkan nama/kode.
- `legacy` menyimpan atribut presentasi lama seperti tier, tagline, leadEngineer, fullName, dan healthDefault. Field tersebut tidak ditawarkan dalam form v2. `healthDefault` masih dibaca Monitoring; kondisi berjalan tidak diubah melalui master.
- Hasil hitung `systemsCount`/`usageCount` tidak disimpan sebagai sumber kebenaran v2.
- Storage divalidasi mendalam. Data rusak menggunakan seed dan peringatan; storage tidak tersedia menggunakan memori sesi dan peringatan satu kali. Tab lain dimuat ulang lewat event storage v2. Konflik penulisan serentak mock mengikuti write terakhir; server perlu menetapkan kontrol konkurensi.
- **`schemaRevision` 5 (29 Oktober 2026).** Migrasi saat dibaca dan tidak destruktif: (1) setiap kategori tanpa `color` diberi warna yang **sama dengan yang tampil hari ini** (urutan seri grafik: Biru muda, Hijau, Ungu, Kuning, Cyan, Merah muda, Lime, lalu Abu) dan hasilnya disimpan sekali; (2) `environment`/`criticality` pada sistem tidak disentuh; (3) koleksi lain dibawa apa adanya. Cadangan (`schemaVersion` 3) memuat `color` kategori; cadangan lama tanpa `color` tetap dapat dipulihkan dan diberi warna dasar yang sama.
- **`schemaRevision` 6 (29 Oktober 2026).** Severity yang tersimpan tanpa `description` diberi deskripsi bawaan sekali saat dibaca; deskripsi yang dikosongkan pengguna sesudahnya tetap kosong. Field lain tidak disentuh.
- **Tampilan ringkasan (29 Oktober 2026)** tidak mengubah kontrak: drawer dan header hanya menampilkan field yang nyata dan relasi bernilai lebih dari nol. Field yang ada di frontend tetapi belum ada di backend (diperiksa baca-saja pada `prisma/schema.prisma`): logo, kode, status, dan PIC/Leader untuk organisasi, proyek, sistem; `active`, `color`, `key`, `sortOrder` untuk kategori; `description`, `level` untuk severity; `phone`, `joinDate`, `defaultShift`, `notes` untuk personel. Tidak ada entitas Sistem di backend.
- `lastSavedAt` mencatat penyimpanan sebenarnya, bukan jam render. Pembukaan ulang data valid tidak mengubah waktu tersebut. Status: saving/saved/failed/session.

Padanan backend yang dicatat pada pemeriksaan rencana awal:

| Frontend v2 | Perbedaan yang perlu diputuskan tim API |
| --- | --- |
| Organization dengan kind | Backend membedakan Tenant dan Client; arti bisnis keduanya belum identik |
| Project.organizationId | Backend Project mengarah ke Tenant melalui `tenant_id`, bukan Client frontend lama |
| name/code/scope | Skema lama memakai nama seperti `code_prefix`, `detail_info`; prefix tiket tidak otomatis sama dengan kode proyek |
| System tersendiri | Model Sistem dan endpoint `/master/*` belum ditemukan pada pemeriksaan awal |
| category/severity | API referensi yang ada perlu adapter DTO; jangan mengubah enum/status tiket sebagai efek samping |

Tabel ini bukan pernyataan bahwa backend telah diubah atau diverifikasi ulang pada implementasi frontend ini.

## Checklist perpindahan ke server

- [ ] Tetapkan arti Tenant/Client, pemilik proyek, dan lingkup permission bersama pemilik bisnis.
- [ ] Sediakan endpoint kontrak ini, validasi relasi, unique constraint, transaksi audit, dan idempotensi.
- [ ] Ekspor cadangan v1/v2; validasi preview dan laporan konflik, tanpa menimpa berdasarkan nama.
- [ ] Pertahankan ID lama atau sediakan tabel pemetaan ID eksplisit; simpan legacyKey proyek dan key kategori.
- [ ] Selesaikan pemetaan `projectId`/`systemId` untuk tiket, jadwal, handover, dan histori; jangan menebak relasi ambigu.
- [ ] Impor organisasi → proyek → sistem → kategori/severity, kemudian referensi operasional dan audit.
- [ ] Pastikan relasi arsip masih dapat dibaca dan pemulihan memeriksa semua induk.
- [ ] Kembalikan hitungan penggunaan/dampak dari server, termasuk record di luar halaman UI.
- [ ] Tetapkan timestamp server, kebijakan versi/ETag, dan pengiriman perubahan antar sesi pengguna.
- [ ] Uji flag mock=false dengan API pengujian, izin semua peran, timeout, batal request, dan respons invalid.
- [ ] Bandingkan jumlah, ID, relasi, label, grafik, dan histori sebelum/sesudah; lakukan cutover setelah review.
- [ ] Arsipkan cadangan lokal sesuai kebijakan data setelah cutover berhasil; jangan menghapus otomatis.


## Personel, Peran, dan hapus aman (28 Oktober 2026)

Mengikuti [Tinjauan Cakupan Halaman Master Data](master-data-scope-review.md). Master Data adalah **satu-satunya sumber identitas personel**: Team Roster hanya menjadwalkan (shift, kehadiran, tukar shift) dan membaca orang dari sini; setiap pilihan PIC (organisasi, proyek, sistem, tiket) memakai daftar personel aktif. Backend tidak disentuh; kontrak ini adalah usulan untuk server.

### Person

```ts
type Person = {
  id: string;                 // stabil; id anggota roster lama dipakai ulang ("mem-1")
  fullName: string;
  employeeId?: string;        // unik, tanpa membedakan kapital; wajib saat disimpan dari form
  email?: string;             // unik, tanpa membedakan kapital; wajib saat disimpan dari form
  phone?: string;
  roleKey: string;            // Role.key
  defaultShift?: "subuh" | "pagi" | "malam";
  joinDate?: string;          // ISO date YYYY-MM-DD
  status: "active" | "inactive" | "archived";
  notes?: string;
  createdAt: string; updatedAt: string; // ISO 8601 UTC
};
type PersonInput = { fullName; roleKey; employeeId?; email?; phone?; joinDate?; defaultShift?: string | null; status?; notes? };
```

Anggota lama yang belum punya ID pegawai, email, atau tanggal bergabung tetap valid; UI menampilkan "Belum diisi" dan nilai tidak dikarang. Field itu baru wajib ketika form menyimpan: pada PUT hanya field yang **ada** di body yang divalidasi.

| Method | Path | Hasil |
| --- | --- | --- |
| GET | `/master/people` | `{ data, meta }`; query `q` (nama, ID, email, telepon), `status`, `roleKey`, `sort` (`name`, `-name`, `updated`, `-updated`), `page`, `pageSize` |
| GET | `/master/people/{id}` | Detail |
| POST | `/master/people` | Membuat; header `Idempotency-Key` |
| PUT | `/master/people/{id}` | Perubahan parsial |
| PATCH | `/master/people/{id}/status` | `{ "status": "active" | "inactive" | "archived" }` |
| GET | `/master/people/{id}/usage` | `PersonUsage` (di bawah) |
| GET | `/master/people/{id}/audit?page=1` | Riwayat, 10 entri per halaman |
| DELETE | `/master/people/{id}` | Hapus permanen, hanya bila belum pernah dipakai |

```ts
type PersonUsage = {
  organizations: { id: string; label: string; active?: boolean }[];   // PIC lewat picUserId
  projects: { id: string; label: string; active?: boolean }[];        // lead lewat leadUserId (atau teks leadEngineer lama yang cocok persis dengan nama)
  systems: { id: string; label: string; active?: boolean }[];         // PIC lewat picUserId
  tickets: number; activeTickets: number; ticketExamples: { id: string; label: string; active?: boolean }[];
  handovers: number; checkpoints: number;
  scheduleEntries: number; swapRequests: number;  // hari kerja pada jadwal tersimpan; permintaan tukar shift
  auditEntries: number;
  isSelf: boolean;                                // pengguna yang sedang masuk
  lastHolderOf?: string;                          // nama peran bila ini satu-satunya pemegang aktif peran protected
  canDelete: boolean; deleteReason?: string;
  canDeactivate: boolean; deactivateReason?: string;
};
```

**ID vs teks nama.** Tiket, checkpoint, dan handover lama menyimpan nama sebagai teks (`owner`, `owners`, `escalatedTo`, `monitoringOwner`, ...); teks itu **tidak pernah ditulis ulang**. Tiket baru menambahkan `ownerIds: string[]` (aditif, kompatibel mundur). Tampilan memakai nama terkini bila id dikenal dan teks tersimpan bila tidak. Pencocokan penggunaan memakai id **dan** teks nama secara konservatif (sama persis, tanpa membedakan kapital, dipecah pada koma, titik koma, "&", "dan"). Konsekuensinya, mengganti nama personel tidak memutus relasi berbasis id, tetapi relasi berbasis teks lama berhenti cocok dengan nama baru; karena itu hapus permanen tetap diblokir lewat aturan lain (PIC id, riwayat) dan server sebaiknya menyimpan id pada record operasional.

### Role (Peran)

```ts
type Role = {
  key: string;          // stabil dan tidak berubah; lima peran awal memakai string historis
  name: string;         // nama tampil; mengganti nama tidak mengubah key
  description?: string;
  active: boolean;
  sortOrder: number;
  protected: boolean;   // dipakai logika aplikasi: tidak dapat dinonaktifkan atau dihapus; nama boleh diubah
  usageCount: number;   // turunan: personel AKTIF yang memegang peran
};
type RoleInput = { name: string; description?: string; active: boolean };
type RoleUsage = { activePeople: number; inactivePeople: number; canDelete: boolean; deleteReason?: string; canDeactivate: boolean; deactivateReason?: string };
```

Lima peran awal (`Operator NOC`, `Shift Lead`, `Incident Coordinator`, `L2 Specialist`, `Infrastructure Engineer`) semuanya `protected`: statistik Team Roster membandingkan ketiganya lewat string. Peran baru memakai key `role-{uuid}` dan tidak protected.

| Method | Path | Hasil |
| --- | --- | --- |
| GET | `/master/roles` | `{ data, meta }`; `q`, `status` (`active`/`inactive`), `sort` (`order`, `name`, `-name`) |
| GET | `/master/roles/{key}` | Detail |
| POST | `/master/roles` | Membuat |
| PUT | `/master/roles/{key}` | `name`, `description`, `active` |
| PATCH | `/master/roles/{key}/status` | `{ "status": "active" | "inactive" }` |
| PATCH | `/master/roles/order` | `{ "key", "direction": -1 | 1 }`; menukar dua peran bertetangga dalam **satu** transaksi |
| GET | `/master/roles/{key}/usage` | `RoleUsage` |
| GET | `/master/roles/{key}/audit?page=1` | Riwayat |
| DELETE | `/master/roles/{key}` | Hanya bila bukan protected, tidak dipegang personel mana pun (aktif atau tidak), dan tidak pernah diubah |

### Aturan hapus permanen

Hapus permanen hanya untuk record yang **tidak pernah dipakai**; selain itu gunakan nonaktifkan/arsip. Server wajib menegakkan aturan ini; UI hanya menampilkan alasannya.

| Entitas | Diblokir bila |
| --- | --- |
| Personel | Pengguna yang sedang masuk; satu-satunya pemegang aktif peran protected; menjadi PIC organisasi/proyek/sistem; dirujuk tiket, checkpoint, handover, jadwal shift, atau tukar shift (id atau teks nama); ada entri audit selain pembuatan |
| Peran | Protected; masih dipegang personel; pernah diubah |
| Organisasi | Organisasi terakhir; masih punya proyek; dipakai sebagai klien terkait; dipakai tiket/checkpoint/handover (id atau alias); pernah diubah |
| Proyek | Masih punya sistem; dipakai tiket/checkpoint/handover; pernah diubah |
| Sistem | Dipakai tiket/checkpoint/handover; pernah diubah |
| Kategori | Kategori bawaan (kunci seed); dipakai tiket; pernah diubah |
| Severity | Selalu |

Respons gagal: **409** dengan `code` `IN_USE` (atau `LAST_ACTIVE_HOLDER`, `SELF_PROTECTED`, `ROLE_PROTECTED`) dan `message` berisi alasan singkat, mis. "Sudah dipakai di 3 tiket. Gunakan Arsipkan.". Tanpa izin: **403**; id tidak ada: **404**. `GET /master/{collection}/{id}/impact` menambahkan `canDelete` dan `deleteReason`. "Pernah diubah" berarti ada entri audit selain entri pembuatan (`kind: "create"`); record seed tanpa audit dianggap belum diubah.

Penghapusan menulis **tombstone** `{ type, id, nameSnapshot, at, by }` dan satu entri audit `kind: "delete"`, dalam transaksi yang sama.

### Perlindungan kehilangan

- Tidak dapat menonaktifkan, mengarsipkan, menghapus, atau memindahkan dari peran protected: satu-satunya pemegang aktifnya (409 `LAST_ACTIVE_HOLDER`) dan pengguna yang sedang masuk (409 `SELF_PROTECTED`, kecuali pemindahan peran).
- Personel nonaktif/arsip tidak ditawarkan untuk penugasan baru (PIC, shift, tiket). Penugasan lama tetap terbaca dengan tag "Nonaktif"; PIC yang sudah terpasang boleh dipertahankan pada PUT (422 `INACTIVE_USER` hanya untuk penugasan baru).
- **Celah:** model akses (Pengelola, Lead, Operator, Viewer) belum menjadi atribut personel, sehingga "satu-satunya Pengelola" belum dapat dilindungi. Server perlu melindunginya begitu akses terhubung ke personel.

### Izin

Hanya Pengelola (`manager`) yang membuat, mengubah, mengarsipkan, dan menghapus: `master.person.{create,update,archive,delete}`, `master.role.{create,update,archive,delete}`, dan `master.{organization,project,system,ticketRef}.delete`. Semua peran dapat membaca. Mock menolak dengan 403 di adapter; **server wajib menegakkan izin dan aturan hapus sendiri**, UI hanya menyembunyikan/menonaktifkan tombol. Peran akses tetap terpisah dari peran operasional dan tidak dikelola di sini. Kata sandi, token, dan kredensial tidak pernah disimpan atau ditampilkan di Master Data.

### Penyimpanan mock dan migrasi

Kunci tetap `ctd.masterData.v2` dan `version: 2`; penanda skema naik dari `schemaRevision: 3` ke **4** dengan koleksi baru `people`, `roles`, `tombstones`. Migrasi saat dibaca: bila `people`/`roles` belum ada, personel dibangun dari 14 anggota seed ditambah isi `ctd.roster.members` bila ada (id yang sama: versi tersimpan menang; id lain dipertahankan; peran asing menjadi peran tidak protected). Semua koleksi lain (organisasi, proyek, sistem, kategori, severity, audit, referensi lama, keputusan pemetaan) dibawa apa adanya. Kunci `ctd.roster.members` tidak pernah ditulis atau dihapus (salinan pengaman). Koleksi people/roles dengan isi rusak membuat storage dianggap tidak valid dan jatuh ke seed, seperti koleksi lain.

### Fitur P0 yang disembunyikan

"Perlu ditinjau", "Tinjau referensi" (pemetaan), penanda kelengkapan, pecahan penggunaan "Lewat ID / Pemetaan ditinjau / Belum jelas", dan cadangan/pemulihan JSON dibatalkan oleh tinjauan cakupan. Kodenya **tetap ada** (`MasterReviewView`, `MasterMappingWorkspace`, `MasterTools`, `lib/master-backup.ts`, `lib/master-review.ts`, `tests/master-data-p0.test.mjs`) tetapi seluruh pintu masuknya (menu, tombol dan lencana header, filter, penanda daftar/detail, parameter URL `view`, `ref`, `type`, `review`, chip riwayat "Pemetaan", perhitungan ulang referensi saat menyimpan) dikendalikan satu konstanta: `MASTER_DATA_P0_ENABLED` di `frontend/app/lib/master-data-flags.ts`, bernilai `false`. Untuk mengaktifkannya kembali ubah menjadi `true`; tidak ada perubahan lain. Parameter URL yang tidak dikenal jatuh ke tab bawaan.
