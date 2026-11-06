# Panduan Integrasi Frontend Central Tracking Dashboard ke Backend NestJS

Dokumen ini merupakan panduan teknis bagi tim frontend dan backend NestJS untuk menghubungkan antarmuka **Central Tracking Dashboard** ke backend NestJS secara aman dan mulus.

---

## 1. Arsitektur Data Layer Frontend

Aplikasi frontend Central Tracking Dashboard telah dibangun dengan arsitektur **Data Access Layer terpusat** yang memisahkan kode komponen UI dari sumber data:
- **`lib/api/client.ts`**: HTTP client berbasis Fetch API native dengan timeout otomatis, AbortSignal controller, parsing error seragam (`ApiError`), query builder aman, dan interceptor `onUnauthorized` (status 401).
- **`services/*`**: Domain services (`ticketsService`, `monitoringService`, `shiftLogService`, `rosterService`, `reportsService`, `dashboardService`, `runbooksService`).
- **`hooks/useResource.ts`**: React 19 / StrictMode-safe data fetcher hook dengan deduplikasi request, caching ringan berparameter, penanganan abort otomatis, stale-while-revalidate (SWR), dan retry per-panel.
- **`types/*`**: DTO TypeScript yang diselaraskan dengan arsitektur NestJS (field `camelCase`, string ISO 8601 untuk tanggal) dilengkapi mapper tipis (`DTO <-> Model UI`).
- **`services/mock-adapter.ts`**: Adapter simulasi lokal yang membungkus seed data eksisting dengan latensi buatan.

---

## 2. Checklist "Saat Backend NestJS Siap"

Lakukan langkah-langkah berikut ketika repositori backend NestJS telah siap dihubungkan:

- [ ] **1. Perbarui File Environment (`.env.local`)**
  Atur target API URL dan matikan mode mock:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
  NEXT_PUBLIC_USE_MOCK=false
  NEXT_PUBLIC_API_TIMEOUT_MS=15000
  ```

- [ ] **2. Konfigurasi CORS di NestJS Backend**
  Pada file bootstrap NestJS (`main.ts`), pastikan CORS mengizinkan origin frontend:
  ```typescript
  // main.ts (NestJS)
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      // domain staging / production Anda
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
  });
  ```

- [ ] **3. Cocokkan Format Respons Standar NestJS**
  Frontend mengharapkan envelope JSON standar berikut:
  - **Single Entity**:
    ```json
    {
      "data": { "id": "TICK-101", "subject": "High memory consumption" }
    }
    ```
  - **Paginated List**:
    ```json
    {
      "data": [ ... ],
      "meta": {
        "page": 1,
        "pageSize": 10,
        "total": 42,
        "totalPages": 5
      }
    }
    ```
  - **Standard Error Response**:
    ```json
    {
      "statusCode": 400,
      "message": ["subject must not be empty", "severity must be a valid enum"],
      "error": "Bad Request"
    }
    ```

- [ ] **4. Uji Penanganan Error & Ketahanan UI**
  - **Status 401 (Unauthorized)**: Memanggil callback global `apiClient.setOnUnauthorized()`.
  - **Status 403 (Forbidden)**: Ditangkap sebagai `ApiError` dengan status 403, menampilkan pesan izin akses terbatas.
  - **Status 404 (Not Found)**: Ditangani dengan pesan data tidak ditemukan / empty state yang ramah.
  - **Status 422 / 400 (Validation)**: Menampilkan rincian pesan validasi field dari DTO.
  - **Status 5xx & Network Timeout**: Panel tidak crash, menampilkan pesan ramah dan tombol **"Coba lagi"** (refetch lokal per-panel).
  - **Unmount / Ganti Filter Cepat**: `AbortController` membatalkan request lama secara otomatis tanpa memicu state error atau memory leak di console.

- [ ] **5. Hapus / Nonaktifkan Mock Adapter Saat Masuk Production Bundle**
  Jika backend sudah 100% stabil, modul `services/mock-adapter.ts` dapat di-tree-shake atau diarsipkan.

---

## 3. Kontrak Endpoint yang Diharapkan Frontend

Tabel berikut adalah usulan kontrak API resmi per domain service:

| Service | Method | Path | Query / Body Params | Response DTO | Deskripsi |
|---|---|---|---|---|---|
| **Tickets** | `GET` | `/tickets` | `page`, `pageSize`, `clientId`, `project`, `status`, `severity`, `shift`, `q`, `from`, `to` | `{ data: TicketDto[], meta: PaginationMeta }` | Daftar tiket berpaginasi & terfilter |
| **Tickets** | `GET` | `/tickets/:id` | - | `{ data: TicketDto }` | Detail satu tiket |
| **Tickets** | `POST` | `/tickets` | Body: `CreateTicketDto` | `{ data: TicketDto }` | Buat tiket baru |
| **Tickets** | `PATCH` | `/tickets/:id` | Body: `UpdateTicketDto` | `{ data: TicketDto }` | Perbarui status/data tiket |
| **Monitoring**| `GET` | `/monitoring/schedule`| `clientId`, `project`, `status` | `{ data: MonitoringEntryDto[] }` | Matriks checklist monitoring shift |
| **Monitoring**| `GET` | `/monitoring/projects`| `clientId` | `{ data: ProjectHealthDto[] }` | Rekap kesehatan proyek & anomali |
| **Monitoring**| `GET` | `/monitoring/historical`| `clientId`, `date` | `{ data: HistoricalAssessmentDto[] }`| Riwayat asesmen checklist |
| **Monitoring**| `POST`| `/monitoring/assessments`| Body: `CreateAssessmentDto` | `{ data: CheckpointAssessmentDto }` | Simpan hasil pemeriksaan OK/NOK |
| **Shift Log** | `GET` | `/shift-logs` | `page`, `pageSize`, `clientId`, `shift` | `{ data: HandoverRecordDto[], meta: PaginationMeta }` | Catatan handover serah-terima shift |
| **Shift Log** | `POST` | `/shift-logs` | Body: `CreateHandoverDto` | `{ data: HandoverRecordDto }` | Simpan catatan serah-terima shift |
| **Shift Log** | `DELETE`| `/shift-logs/:id` | - | `{ data: { success: true } }` | Hapus catatan shift |
| **Reports** | `GET` | `/reports/weekly` | `periodStart`, `periodEnd`, `clientId` | `{ data: WeeklyReportSummaryDto }` | Ringkasan analitik laporan mingguan |
| **Roster** | `GET` | `/roster/members` | `shift`, `role`, `status` | `{ data: RosterMemberDto[] }` | Daftar staf & teknisi jaga |
| **Roster** | `GET` | `/roster/swaps` | `status` (`Pending`, `Approved`, dll) | `{ data: ShiftSwapDto[] }` | Daftar permintaan tukar shift |
| **Roster** | `POST`| `/roster/swaps` | Body: `CreateShiftSwapDto` | `{ data: ShiftSwapDto }` | Ajukan permohonan tukar shift |
| **Runbooks** | `GET` | `/runbooks/sops` | `q`, `category` | `{ data: SopEntryDto[] }` | Standard Operating Procedures |
| **Runbooks** | `GET` | `/runbooks/credentials`| `q` | `{ data: CredentialEntryDto[] }` | Kredensial & konfigurasi server |
| **Runbooks** | `GET` | `/runbooks/quick-links` | - | `{ data: QuickLinkDto[] }` | Tautan sistem & tool monitoring |
| **Runbooks** | `GET` | `/runbooks/escalations`| `q` | `{ data: EscalationContactDto[] }` | Direktori kontak eskalasi darurat |
| **Dashboard** | `GET` | `/dashboard/summary` | `clientId`, `from`, `to` | `{ data: DashboardSummaryDto }` | Agregasi KPI volume, velocity, & shift |
| **Master Data** | `GET` | `/master-data/clients` | `q`, `status`, `tier`, `page`, `pageSize` | `{ data: ClientOrganizationDto[], meta: PaginationMeta }` | Daftar organisasi klien terdaftar |
| **Master Data** | `GET` | `/master-data/clients/:id` | - | `{ data: ClientOrganizationDto }` | Detail satu organisasi klien |
| **Master Data** | `POST` | `/master-data/clients` | Body: `CreateClientDto` | `{ data: ClientOrganizationDto }` | Tambah klien baru (409 jika kode duplikat, 422 jika validasi gagal) |
| **Master Data** | `PATCH` | `/master-data/clients/:id` | Body: `UpdateClientDto` | `{ data: ClientOrganizationDto }` | Perbarui profil klien (409 jika kode duplikat, 422 jika validasi gagal) |
| **Master Data** | `PATCH` | `/master-data/clients/:id/status` | Body: `{ status: "active" \| "inactive" \| "archived" }` | `{ data: ClientOrganizationDto }` | Ubah status aktif/nonaktif/arsip klien |
| **Master Data** | `GET` | `/master-data/projects` | `clientId`, `q`, `status`, `page`, `pageSize` | `{ data: ProjectMasterDto[], meta: PaginationMeta }` | Daftar proyek master |
| **Master Data** | `GET` | `/master-data/projects/:id` | - | `{ data: ProjectMasterDto }` | Detail satu proyek master |
| **Master Data** | `POST` | `/master-data/projects` | Body: `CreateProjectDto` | `{ data: ProjectMasterDto }` | Tambah proyek baru (409 jika kode duplikat di klien sama, 422 jika validasi gagal) |
| **Master Data** | `PATCH` | `/master-data/projects/:id` | Body: `UpdateProjectDto` | `{ data: ProjectMasterDto }` | Perbarui proyek master |
| **Master Data** | `PATCH` | `/master-data/projects/:id/status` | Body: `{ status: "active" \| "archived" }` | `{ data: ProjectMasterDto }` | Ubah status aktif/arsip proyek |
| **Master Data** | `GET` | `/master-data/systems` | `clientId`, `projectId`, `criticality`, `environment`, `status`, `q` | `{ data: SystemMasterDto[], meta: PaginationMeta }` | Daftar sistem di bawah proyek & klien |
| **Master Data** | `GET` | `/master-data/systems/:id` | - | `{ data: SystemMasterDto }` | Detail satu sistem master |
| **Master Data** | `POST` | `/master-data/systems` | Body: `CreateSystemDto` | `{ data: SystemMasterDto }` | Tambah sistem baru (422 jika validasi gagal) |
| **Master Data** | `PATCH` | `/master-data/systems/:id` | Body: `UpdateSystemDto` | `{ data: SystemMasterDto }` | Perbarui metadata sistem |
| **Master Data** | `PATCH` | `/master-data/systems/:id/status` | Body: `{ status: "active" \| "maintenance" \| "deprecated" }` | `{ data: SystemMasterDto }` | Ubah status operasional sistem |

### Spesifikasi Kode Error Khusus Master Data (NestJS HTTP Exceptions)
1. **HTTP 409 Conflict (Duplicate Code)**
   Dikembalikan saat pengguna mencoba membuat atau mengubah kode entitas yang sudah ada:
   ```json
   {
     "statusCode": 409,
     "error": "Conflict",
     "message": "Kode klien 'TRIT' sudah digunakan oleh organisasi lain. Gunakan kode unik lain."
   }
   ```
2. **HTTP 422 Unprocessable Entity (Validation Error)**
   Dikembalikan bila request body gagal lolos `class-validator` / DTO:
   ```json
   {
     "statusCode": 422,
     "error": "Unprocessable Entity",
     "message": [
       "name must not be empty",
       "code must match /^[A-Z0-9_-]{2,10}$/i",
       "picEmail must be an email"
     ]
   }
   ```

---

## 4. Checklist Migrasi dari localStorage ke Backend NestJS

Ketika backend NestJS siap diimplementasikan untuk Master Data, ikuti panduan transisi berikut:

- [ ] **Langkah 1: Skema Database Relasional**
  - Buat tabel `clients` (`id` varchar PK, `name`, `code` unique ci, `tier`, `status`, `pic_name`, `pic_email`, `pic_phone`, `description`, `logo_url`, `created_at`, `updated_at`).
  - Buat tabel `projects` (`id` varchar PK, `client_id` FK -> `clients.id`, `name`, `full_name`, `code`, `detail`, `lead_engineer`, `health_default`, `status`, `created_at`, `updated_at`, UNIQUE composite on (`client_id`, `code`)).
  - Buat tabel `systems` (`id` varchar PK, `client_id` FK -> `clients.id`, `project_id` FK -> `projects.id`, `name`, `criticality`, `environment`, `status`, `created_at`, `updated_at`).
  - Catatan relasi: `systemCount` dan `checkpointCount` **diturunkan (computed selector)** secara dinamis lewat subquery / aggregasi SQL, bukan kolom fisik.
- [ ] **Langkah 2: Seed Database dari Seed Master**
  - Jalankan seeder NestJS menggunakan data identik dari `frontend/app/lib/masterDataSeeds.ts` (8 klien awal, proyek-proyek aktif terkait).
- [ ] **Langkah 3: Migrasi Data Lokal Klien (`ctd.masterData.v1`)**
  - Sebelum beralih sepenuhnya, siapkan endpoint migrasi opsional `POST /master-data/sync-local` jika ada pengguna yang telah membuat proyek baru di penyimpanan lokal browser.
  - Alternatif bersih: Buka dashboard dengan `NEXT_PUBLIC_USE_MOCK=false`, frontend otomatis beralih memanggil `services/master-data.ts` yang mengarah ke REST API backend.
- [ ] **Langkah 4: Validasi Soft Delete (Arsip)**
  - Pastikan backend menerapkan soft delete (hanya mengubah kolom `status = 'archived'`).
  - Larang operasi `DELETE` permanen pada klien atau proyek jika masih terikat data historis tiket (`tickets.project_id`) atau checklist shift monitoring.
- [ ] **Langkah 5: Penanganan Klien Aktif Terakhir**
  - Validasi guard backend: menolak pengarsipan jika sisa organisasi dengan status `active` adalah 1.

---

## 4. Cara Menguji State Data di Mode Development

Frontend menyediakan parameter query override khusus pengujian (`?mock=...`) yang dapat dimasukkan langsung di browser URL saat pengembangan:

| Parameter URL | Perilaku Simulasi | Tujuan Pengujian |
|---|---|---|
| `?mock=0` atau `?mock=instant` | Latensi 0ms | Memastikan layout stabil seketika tanpa flicker skeleton |
| `?mock=slow` | Latensi 3500ms | Menguji tampilan shimmer skeleton dan interaksi pengguna saat data lambat |
| `?mock=error` | Melempar error HTTP 500 buatan | Menguji state error in-panel dengan tombol **"Coba lagi"** (refetch lokal) |
| `?mock=timeout` | Melempar error HTTP 408 Timeout | Menguji pesan ramah batas waktu koneksi |
| `?mock=empty` | Mengembalikan array kosong `[]` | Menguji tampilan in-panel Empty State |

---

## 5. Komitmen Arsitektur Bebas Library Eksternal

Implementasi ini dibuat **100% tanpa library pihak ketiga** (tanpa Axios, tanpa TanStack Query, tanpa SWR package):
- Seluruh pengambilan data memanfaatkan **Fetch API bawaan browser**.
- State dan lifecycle dikelola oleh `useResource` dan `useDelayedFlag` hooks kustom.
- Jika di masa depan tim memutuskan ingin bermigrasi ke TanStack Query / SWR, struktur service di `services/*.ts` sudah berupa Promise-based fetcher murni yang langsung kompatibel sebagai `queryFn` / `fetcher` tanpa perlu mengubah DTO atau mapper.
