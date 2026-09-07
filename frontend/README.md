# Central Tracking Dashboard (NOC Dashboard)

Dashboard operasional terpadu untuk monitoring layanan, serah terima shift dinas (Shift Handover), manajemen tiket gangguan (Tickets), dan manajemen jadwal tim (Team Roster).

Aplikasi ini dibangun menggunakan arsitektur **React 19**, **Vinext (Vite + Next.js Server Components)**, dan database lokal **Cloudflare D1 (SQLite) dengan Drizzle ORM**.

---

## 📋 Prasyarat Sistem (Prerequisites)

Sebelum memulai, pastikan perangkat Anda telah memenuhi prasyarat berikut:

1. **Node.js**: Versi **`>= 22.13.0`** *(Wajib)*.
   - Cek versi Node.js Anda dengan perintah:
     ```bash
     node -v
     ```
   - *Tips:* Jika menggunakan `nvm` (Node Version Manager), Anda dapat beralih atau memasang versi yang sesuai dengan:
     ```bash
     nvm install 22
     nvm use 22
     ```
2. **Git**: Untuk clone repository dan kolaborasi kode.
3. **Web Browser Modern**: Google Chrome, Mozilla Firefox, Microsoft Edge, atau browser berbasis Chromium terkini.

---

## 🚀 Panduan Instalasi & Setup Cepat (Quick Start)

Ikuti langkah-langkah berikut setelah mengunduh/meng-clone repository dari GitHub:

### 1. Clone Repository
Buka terminal dan clone repository ke komputer lokal Anda:
```bash
git clone https://github.com/pack467/central-tracking-dashboard.git
```

### 2. Masuk ke Direktori Proyek
```bash
cd central-tracking-dashboard
```

### 3. Install Dependensi Proyek
Pasang seluruh pustaka dan dependensi yang diperlukan:
```bash
npm install
```

### 4. Jalankan Aplikasi di Lingkungan Pengembangan
Jalankan dev server dengan perintah:
```bash
npm run dev
```

> **Catatan Otomatis:** Script `predev` pada `package.json` akan otomatis menjalankan migrasi database D1 lokal (`npm run db:migrate:local`) saat Anda menjalankan `npm run dev`. Anda tidak perlu menyiapkan server database eksternal terpisah!

### 5. Buka di Browser
Setelah server berjalan, buka URL berikut di browser Anda:
```text
http://localhost:3000
```

---

## 🛠️ Perintah yang Tersedia (Available Scripts)

Berikut daftar perintah npm yang sering digunakan dalam proyek:

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server pengembangan lokal (lengkap dengan hot reload dan migrasi database otomatis). |
| `npm run build` | Melakukan build dan validasi bundling aplikasi untuk lingkungan produksi. |
| `npm run start` | Menjalankan server dalam mode produksi setelah di-build. |
| `npm run db:migrate:local` | Menerapkan migrasi D1 SQLite lokal secara manual menggunakan Wrangler. |
| `npm run db:generate` | Menghasilkan file migrasi SQL baru dari schema Drizzle (`db/schema.ts`). |
| `npx tsc --noEmit` | Memeriksa validitas tipe data TypeScript di seluruh proyek tanpa membuat file kompilasi. |
| `npm test` | Menjalankan pengujian otomatis end-to-end HTML rendered. |

---

## 🧭 Fitur Utama Aplikasi

1. **Monitoring & Status Layanan Real-time**:
   - Pemantauan metrik proyek utama: B2B, DM, EPC, EPC Core, APH, SM, ActiveMQ, USIEM, MB, UNEM, L2, dll.
   - Pengecekan checkpoint terjadwal dengan status OK / NOK.
   - Panduan penilaian anomali SOP.

2. **Shift Handover (Serah Terima Tugas Shift)**:
   - **Formulir Terstruktur 4 Langkah**:
     - *Langkah 1:* Informasi Shift (Tanggal, Rotasi Shift, Personil PIC).
     - *Langkah 2:* Catatan Shift (Pesan bebas & konteks operasional untuk shift penerima).
     - *Langkah 3:* Temuan & Pengecualian (Dropdown proyek + opsi manual, status monitored/in-progress).
     - *Langkah 4:* Ceklis Tugas (Dropdown proyek, Tipe/Status diperluas, Prioritas Critical/High/Medium/Low).
   - **Siapkan Handover (Verifikasi Checklist)**:
     - Tombol aksi eksplisit **Done** (menandai tugas valid dan dilanjutkan) dan **Delete** (menghapus tugas dengan dialog konfirmasi).
     - Penerimaan resmi handover shift dengan pencatatan audit penerima dan stempel waktu.
   - **Buka Catatan Handover (Arsip Historis)**:
     - Tampilan read-only permanen tanpa tombol aksi interaktif.
     - Badge indikator statis "Done" untuk tugas yang disetujui.

3. **Manajemen Tiket (Tickets View)**:
   - Filter cepat berdasarkan kategori proyek, tingkat keparahan (Critical, High, Medium, Low), dan status tiket.
   - Date picker kustom bertema gelap untuk rentang tanggal tertentu (*custom date range*).
   - Panel drawer detail tiket dan pencatatan riwayat aktivitas.
   - Laporan ringkasan performa tim dan distribusi penanganan tiket.

4. **Jadwal & Roster Tim (Team View)**:
   - Roster mingguan dan kalender dinas bulanan per operator.
   - Pengajuan dan persetujuan tukar shift (*Shift Swap Requests*).
   - Profil detail anggota tim beserta statistik dinas.

---

## 📁 Struktur Direktori Proyek

```text
central-tracking-dashboard/
├── app/
│   ├── api/                 # Endpoint REST API (e.g. /api/handovers)
│   ├── components/
│   │   ├── dashboard/       # Komponen monitoring dan checkpoint
│   │   ├── handover/        # Komponen serah terima shift (Wizard, Modal, Badges, ProjectSelect)
│   │   ├── team/            # Komponen jadwal, shift swap, dan kalender roster
│   │   ├── tickets/         # Komponen tiket gangguan, drawer, dan laporan
│   │   └── ui/              # Komponen UI umum (DatePicker, ModalCloseButton, Badge, Modal, Toast, dll.)
│   ├── hooks/               # Custom React hooks (useHandoverWorkflow, useLiveClock, dll.)
│   ├── lib/                 # Tipe data TypeScript, fungsi pembantu (helpers), data mock, otentikasi
│   └── styles/              # Berkas styling CSS (handover.css, overlays.css, globals)
├── db/                      # Skema Drizzle ORM dan koneksi Cloudflare D1
├── drizzle/                 # Berkas migrasi SQL lokal
├── package.json             # Konfigurasi dependensi dan scripts npm
├── wrangler.local.json      # Konfigurasi runtime D1 lokal Wrangler
└── tsconfig.json            # Konfigurasi TypeScript
```

---

## ❓ Kendala Umum & Solusi (Troubleshooting)

- **Error versi Node.js tidak sesuai:**
  *Penyebab:* Versi Node.js di bawah `22.13.0`.
  *Solusi:* Pastikan menggunakan Node.js versi 22 ke atas (`node -v`). Gunakan `nvm install 22 && nvm use 22`.

- **Port 3000 sudah terpakai:**
  *Solusi:* Vinext akan otomatis mencari port berikutnya (misalnya `http://localhost:3001`), atau matikan proses yang menggunakan port 3000 terlebih dahulu.

- **Data lokal perlu di-reset:**
  *Solusi:* Hapus direktori cache lokal `.wrangler/` dan jalankan ulang `npm run db:migrate:local`.

---

## 🤝 Alur Kontribusi & Kolaborasi

1. Lakukan `git pull origin main` sebelum membuat perubahan baru untuk mendapatkan kode terkini.
2. Buat branch baru untuk fitur atau perbaikan: `git checkout -b feature/nama-fitur`.
3. Pastikan tidak ada error TypeScript sebelum commit:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
4. Commit perubahan dengan pesan yang deskriptif dan push ke repository.

