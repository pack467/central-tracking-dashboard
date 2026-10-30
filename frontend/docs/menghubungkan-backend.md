# Menghubungkan Frontend, Backend, dan Database (lokal)

Panduan ini menjelaskan cara menjalankan tiga bagian aplikasi di satu komputer sampai bisa login dengan akun dari database.
Ikuti urutannya dari atas. Setiap langkah punya cara cek "sudah benar atau belum".

## Gambaran singkat

```text
  Browser                     Backend (NestJS)                 Database (PostgreSQL)
  http://localhost:3001  -->  http://localhost:3000       -->  localhost:5432 (atau 5433)
  folder: frontend/           folder: backend/                 database: ctd_db, schema ctd_config

  frontend/.env.local         backend/.env
  NEXT_PUBLIC_API_URL  ---->  PORT                (harus sama portnya)
  alamat frontend      ---->  CORS_ORIGIN         (harus memuat http://localhost:3001)
                              DATABASE_URL  -----> alamat database
```

Ada tiga pasangan yang harus cocok. Hampir semua masalah "tidak bisa login" berasal dari salah satunya:

| Pasangan | Di frontend | Di backend |
| :--- | :--- | :--- |
| Port backend | `NEXT_PUBLIC_API_URL=http://localhost:3000` | `PORT=3000` |
| Alamat frontend | frontend dijalankan di port 3001 | `CORS_ORIGIN=http://localhost:3001` |
| Database | (tidak ada) | `DATABASE_URL=postgresql://...` |

Port yang dipakai tim: **backend 3000, frontend 3001**.

---

## Yang perlu ada di komputer

- Node.js versi 22.13 atau lebih baru (`node -v`)
- PostgreSQL yang sedang jalan
- Repository ini sudah di-clone

---

## Langkah 1: Database

1. Pastikan PostgreSQL jalan, lalu buat database kosong. Contoh dengan `psql`:
   ```sql
   CREATE DATABASE ctd_db;
   ```
   Schema `ctd_config` dan tabel-tabelnya dibuat otomatis oleh backend di langkah 2.

2. Siapkan alamat database (dipakai di `backend/.env`):
   ```text
   postgresql://USER:PASSWORD@localhost:5432/ctd_db?schema=ctd_config
   ```
   - Ganti `5432` kalau PostgreSQL kamu memakai port lain (misalnya `5433`).
   - Kalau password database mengandung karakter khusus, tulis dalam bentuk kode:
     `#` jadi `%23`, `@` jadi `%40`, `!` jadi `%21`, `:` jadi `%3A`, `/` jadi `%2F`.
     Contoh: password `Rahasia#1` ditulis `Rahasia%231`.

> **Jangan** arahkan `DATABASE_URL` ke database bersama milik devops (`ctddbnonprod`) untuk percobaan lokal.
> Perintah seed dan reset di bawah mengubah isi database.

---

## Langkah 2: Backend

Semua perintah di langkah ini dijalankan dari folder `backend/`.

1. Buat file env:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Isi `backend/.env`. Nilai yang penting:

   | Variabel | Isi | Keterangan |
   | :--- | :--- | :--- |
   | `PORT` | `3000` | Port backend. Harus sama dengan port di `NEXT_PUBLIC_API_URL` frontend. |
   | `APP_URL` | `http://localhost:3000` | Alamat backend itu sendiri. |
   | `DATABASE_URL` | dari Langkah 1 | Alamat database. |
   | `SEED_DEFAULT_PASSWORD` | minimal 8 karakter | Password awal semua user hasil seed. Lihat catatan di bawah. |
   | `SESSION_SECRET` | minimal 32 karakter acak | Wajib, backend menolak jalan tanpa ini. Buat dengan: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `CORS_ORIGIN` | `http://localhost:3001` | Alamat frontend. Kalau lebih dari satu, pisahkan dengan koma. |

3. Pasang dependensi, buat tabel, dan isi data awal:
   ```bash
   npm install
   npx prisma generate         # menyiapkan kode akses database
   npx prisma migrate deploy   # membuat schema dan tabel di database
   npx prisma db seed          # mengisi role, user, project, kategori, dan ~3.600 tiket
   ```

4. Jalankan backend:
   ```bash
   npm run dev
   ```
   Tunggu sampai log berhenti bergulir, lalu buka `http://localhost:3000/health` di browser.
   Kalau muncul `"database":{"status":"up"...}`, backend dan database sudah tersambung.

### Catatan penting soal password awal

- `SEED_DEFAULT_PASSWORD` hanya diberikan ke user yang **passwordnya masih kosong** saat seed dijalankan.
- Seed **tidak pernah menimpa** password yang sudah ada. Jadi kalau `SEED_DEFAULT_PASSWORD` diganti lalu seed diulang,
  user lama **tetap memakai password lama**.
- Password awal tim backend: `admin123`. Login memakai nilai `SEED_DEFAULT_PASSWORD` di `backend/.env` **komputer yang menjalankan backend**, bukan milik orang lain.
- Login memakai **email** atau **NIK** yang ada di tabel `users`. User yang tidak aktif (`is_active = false`) tidak bisa login.

Cara memberi password awal lagi ke semua user (hanya untuk database lokal):

```sql
UPDATE ctd_config.users SET password = NULL;
```

lalu jalankan lagi `npx prisma db seed` dari folder `backend/`.

---

## Langkah 3: Frontend

Semua perintah di langkah ini dijalankan dari folder `frontend/`.

1. Buat file env:
   ```bash
   cd frontend
   cp .env.example .env.local
   ```
   File `.env.local` tidak ikut ke git. **Setiap orang harus membuatnya sendiri.**

2. Pastikan tiga baris ini ada di `frontend/.env.local` (isi dari `.env.example` sudah benar):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   NEXT_PUBLIC_API_MODULES=auth,tickets,people,roles
   NEXT_PUBLIC_USE_MOCK=true
   ```

   | Variabel | Arti |
   | :--- | :--- |
   | `NEXT_PUBLIC_API_URL` | Alamat backend, tanpa `/` di akhir dan tanpa `/api`. |
   | `NEXT_PUBLIC_API_MODULES` | Bagian aplikasi yang memakai backend. Bagian lain tetap memakai data contoh (mock). **Tanpa `auth` di sini, halaman login hanya mengecek akun demo dan tidak pernah memanggil backend**, sehingga password yang benar pun ditolak. |
   | `NEXT_PUBLIC_USE_MOCK` | `true` = campuran (modul di atas ke backend, sisanya mock). `false` = semua ke backend. |

3. Pasang dependensi dan jalankan frontend **di port 3001**:
   ```bash
   npm install
   npm run dev:backend
   ```
   `npm run dev:backend` sama dengan `npm run dev`, hanya port-nya 3001, karena port 3000 sudah dipakai backend.

4. Buka `http://localhost:3001` dan login dengan email/NIK dan password dari Langkah 2.

> Setiap kali `.env.local` diubah, **matikan lalu jalankan lagi** dev server frontend. Nilai `NEXT_PUBLIC_*` hanya dibaca saat server mulai.

---

## Langkah 4: Cek sambungan otomatis

Dengan backend sudah jalan, dari folder `frontend/` jalankan:

```bash
npm run check:backend
```

Script ini membaca `frontend/.env.local` lalu mengecek satu per satu:

1. Pengaturan frontend: alamat backend terisi dan modul `auth` aktif.
2. Backend menjawab di alamat itu (`GET /ready`).
3. Backend tersambung ke database (`GET /health`).
4. Backend mengizinkan request dari `http://localhost:3001` (CORS).

Untuk sekalian mencoba login (script langsung logout lagi setelahnya):

```bash
npm run check:backend -- --id nama@hutabyte.com --password admin123
```

Contoh hasil kalau semuanya benar:

```text
1. Pengaturan frontend
  [OK]    dibaca dari .env.local
  [OK]    alamat backend: http://localhost:3000
  [OK]    modul ke backend: auth, tickets, people, roles (sisanya data mock)

2. Backend (http://localhost:3000)
  [OK]    backend berjalan (GET /ready 200)

3. Database (dilihat dari backend)
  [OK]    backend tersambung ke database (GET /health 200)

4. Izin browser / CORS (frontend http://localhost:3001)
  [OK]    backend menerima request dari http://localhost:3001
  [OK]    GET /auth/me tanpa login menjawab 401, sesuai harapan

5. Login
  [OK]    login berhasil: Nama User (role: AGENT)

Semua sambungan yang dicek beres.
```

Kalau ada `[GAGAL]`, baris `->` di bawahnya menjelaskan apa yang harus diperbaiki. Perbaiki yang paling atas dulu.
Frontend dijalankan di alamat lain? Jalankan dengan `CTD_FRONTEND_ORIGIN=http://localhost:4000 npm run check:backend`.

---

## Masalah yang sering terjadi

| Gejala di halaman login | Penyebab | Solusi |
| :--- | :--- | :--- |
| "Email/ID karyawan atau kata sandi salah" dan di DevTools > Network **tidak ada** request `auth/login` | Modul `auth` tidak aktif, login dicek ke akun demo | Isi `NEXT_PUBLIC_API_MODULES=auth,tickets,people,roles` di `.env.local`, restart frontend |
| "Email/ID karyawan atau kata sandi salah" dan **ada** request `auth/login` dengan status 401 | Password/email salah, user tidak aktif, atau password di database bukan `SEED_DEFAULT_PASSWORD` | Lihat "Catatan penting soal password awal" di Langkah 2 |
| "Tidak dapat terhubung ke server" | Backend mati, port salah, atau CORS menolak | Jalankan `npm run check:backend` |
| "Server sedang bermasalah" | `NEXT_PUBLIC_API_URL` mengarah ke frontend sendiri, atau backend error | Pastikan port di `NEXT_PUBLIC_API_URL` = `PORT` backend |
| "Terlalu banyak percobaan" | Lebih dari 5 kali gagal login dalam 1 menit | Tunggu 1 menit |
| "Login berhasil, tetapi browser tidak menyimpan sesinya" | Frontend dan backend dibuka dengan nama host berbeda | Buka keduanya dengan `localhost`, jangan campur dengan `127.0.0.1` |
| `/health` menjawab 503 | Backend tidak bisa membuka database | Cek PostgreSQL jalan dan `DATABASE_URL` (host, port, user, password, nama database) |
| Frontend gagal start: port 3001 sudah dipakai | Ada program lain di 3001 (misalnya backend lama dengan `PORT=3001`) | Matikan program itu, atau samakan ulang port di kedua `.env` |

Cara melihat request di browser: tekan `F12`, buka tab **Network**, lalu coba login.
Request ke `localhost:3000/auth/login` harus muncul. Kolom **Status** menunjukkan jawaban backend.

---

## Ringkasan perintah

```bash
# Terminal 1: backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev                 # http://localhost:3000

# Terminal 2: frontend
cd frontend
npm install
npm run dev:backend         # http://localhost:3001
npm run check:backend       # cek sambungan
```

Dokumen terkait: [frontend-auth.md](frontend-auth.md) (cara kerja login dan cookie sesi),
[backend-connection-status.md](backend-connection-status.md) (bagian mana yang sudah tersambung ke backend).
