# Central Tracking Dashboard (NOC Dashboard)

Dashboard operasional terpadu untuk monitoring layanan jaringan/sistem, serah terima shift dinas (*Shift Handover*), manajemen tiket gangguan (*Tickets*), dan manajemen jadwal tim (*Team Roster*).

---

## 📂 Struktur Proyek (Monorepo)

Repository ini disusun dengan arsitektur monorepo modular untuk memudahkan kolaborasi multi-komponen:

```text
central-tracking-dashboard/
├── frontend/          # Aplikasi Web Dashboard (Next.js 15 / Vinext, React 19, Tailwind CSS, Cloudflare D1)
├── backend/           # API Service & Gateway (Akan dikembangkan oleh kolaborator)
├── worker-python/     # Background Worker & Telemetry Collector (Akan dikembangkan oleh kolaborator)
├── .gitignore         # Global ignore file untuk Node, Python, dan OS
└── README.md          # Dokumentasi utama proyek
```

---

## 🌐 1. Frontend (Web Dashboard)

Aplikasi web dashboard saat ini telah siap dijalankan di folder `frontend/`.

### Prasyarat:
- **Node.js**: Versi `>= 22.13.0`
- **NPM**: Bawaan Node.js

### Cara Menjalankan Frontend:
```bash
# Masuk ke folder frontend
cd frontend

# Pasang dependensi
npm install

# Jalankan server pengembangan
npm run dev
```
Setelah berjalan, buka browser di `http://localhost:3000`.

> **Catatan:** Migrasi database D1 lokal dijalankan secara otomatis via script `predev` (`wrangler d1 migrations apply`). Dokumentasi lengkap fitur dan komponen frontend dapat dilihat di [frontend/README.md](./frontend/README.md).

---

## ⚙️ 2. Backend Service

Direktori `backend/` disiapkan untuk endpoint API, database centralized, autentikasi terpusat, dan integrasi sistem.
- Lihat detail petunjuk di [backend/README.md](./backend/README.md).

---

## 🐍 3. Worker Python

Direktori `worker-python/` disiapkan untuk background worker, automated tasks, data polling, dan integrasi perangkat telemetri jaringan.
- Lihat detail petunjuk di [worker-python/README.md](./worker-python/README.md).

---

## 🤝 Panduan Berkolaborasi (Git Workflow)

1. **Clone repository**:
   ```bash
   git clone https://github.com/pack467/central-tracking-dashboard.git
   cd central-tracking-dashboard
   ```
2. **Buat branch baru untuk fitur Anda**:
   ```bash
   git checkout -b feature/nama-fitur
   ```
3. **Commit perubahan**:
   ```bash
   git add .
   git commit -m "feat(backend): add initial fast-api structure"
   ```
4. **Push dan buat Pull Request**:
   ```bash
   git push origin feature/nama-fitur
   ```
