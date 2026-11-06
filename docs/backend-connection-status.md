# Status koneksi frontend ke backend

Diuji pada 29 Oktober 2026 terhadap backend lokal (`http://localhost:3001`, database lokal `ctd_db` berisi data seed). Backend tidak diubah.

## Cara menyalakan
Di `frontend/.env.local` (lalu restart dev server frontend):

```
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_API_MODULES=auth,tickets,people,roles
NEXT_PUBLIC_API_URL=http://localhost:3001
```

`NEXT_PUBLIC_API_MODULES` menyalakan bagian yang sudah tersambung satu per satu; sisanya tetap memakai data mock. `NEXT_PUBLIC_USE_MOCK=false` menyalakan semuanya (belum disarankan: banyak halaman belum punya endpoint). Hapus tiga baris di atas untuk kembali ke aplikasi mock penuh. Backend harus berjalan (`npm run prod` di folder `backend`), dan `CORS_ORIGIN` backend harus memuat `http://localhost:3000`.

## Yang sudah tersambung
| Bagian | Endpoint | Catatan |
| --- | --- | --- |
| Login, sesi, logout | `POST /auth/login`, `GET /auth/me`, `GET /auth/csrf`, `POST /auth/logout` | Cookie sesi httpOnly + token CSRF. Tidak ada token/data pengguna di browser |
| Tiket (baca) | `GET /tickets` | Semua 3.649 tiket dimuat (37 permintaan x 100) dan dipakai oleh Dashboard, Tickets, Reports, Notifikasi. Cache sesi 3 menit supaya muat ulang tidak menghabiskan batas permintaan |
| Detail tiket | dari data yang sama | URL `/tickets/<id backend>` |
| Tiket (tulis) | `POST /tickets`, `PATCH /tickets/:id`, `GET /ticket-categories`, `GET /ticket-severities` | Tiket Baru, Edit dan Close Ticket (30 Oktober 2026). Form memakai proyek backend (dibaca dari tiket yang termuat, karena belum ada `GET /projects`) dan kategori backend. Nama diubah ke id di `services/backend-tickets.ts`; PATCH hanya mengirim yang berubah. Gagal = form tetap terbuka dengan alasannya |
| Personel (baca) | `GET /users`, `GET /roles`, `GET /tickets?user_id=` | Daftar, cari, filter peran, detail. Jumlah tiket dari backend. Header Master Data, roster dan semua pemilih PIC memakai data yang sama |
| Peran (baca) | `GET /roles` | 5 peran backend, jumlah pengguna dari `user_count` |

## Belum tersambung (frontend menyatakannya, tidak berpura-pura menyimpan)
- **Bagian tiket yang tidak punya tempat di backend**: status Escalated (tombol Eskalasi) dan RCA ditolak dengan pesan, bukan disimpan diam-diam. Sistem, Response Time, riwayat, dan PIC kedua dst. tidak disimpan (backend hanya punya satu `user_id`). Proyek yang belum punya tiket sama sekali tidak muncul di pilihan proyek sampai ada `GET /projects`.
- **Pembaruan tiket**: setiap 60 detik (tab terlihat) frontend mengambil 100 tiket yang terakhir berubah (`sort=updated_at`) dan menggabungkannya; tombol Segarkan di top bar melakukan hal yang sama.
- **Menulis Personel dan Peran**: menjawab "belum tersambung ke backend".
- Semua halaman lain masih mock: Master Data (Organisasi, Proyek, Sistem, Kategori, Severity), Monitoring, Shift Log, Reports (selain tiket), Notifikasi, Handover. Runbooks dihapus dari aplikasi (30 Oktober 2026) sampai ada backend-nya.

## Catatan untuk backend developer dan devops
**Perlu diputuskan atau diubah di backend**
1. **Batas permintaan.** `limit` maksimum 100 dan throttle 100 permintaan per menit per IP. Satu kali memuat seluruh tiket = 37 permintaan; beberapa halaman dibuka berturut-turut sudah memicu `429`. Usul: naikkan batas `limit` untuk pengguna yang login (mis. 500), atau sediakan endpoint ringkasan/agregat, atau kecualikan GET terautentikasi dari throttle.
   Tambahan: jawaban `429` sebaiknya menyertakan `Retry-After` dan header itu di-expose lewat CORS (`Access-Control-Expose-Headers: Retry-After`), supaya frontend menunggu sesuai waktu server. Saat ini browser tidak bisa membacanya, jadi frontend memakai jeda bertahap.
2. **Tidak ada endpoint daftar untuk proyek, klien, tenant.** Nama proyek hanya terlihat tertanam di tiket. Dibutuhkan `GET /projects`, `/clients`, `/tenants` (dan untuk Master Data: organisasi dan sistem). Sementara ini form tiket membaca proyek dan klien dari tiket yang sudah termuat, jadi proyek atau klien tanpa tiket belum bisa dipilih.
3. **Model tiket lebih sempit dari yang dipakai UI.** Tidak ada: sistem, prioritas, shift, level eskalasi, waktu respons, target SLA, riwayat tiket, lebih dari satu penanggung jawab, nomor tiket tampilan (hanya `id` dan `third_party_ticket_id`). Frontend menurunkan shift dari jam (Subuh <08, Pagi <16, Malam) dan lama penyelesaian dari `open_at`/`closed_at`.
4. **Severity hanya 3 level** (Low, Med, High); UI mengenal 4 (ada Critical). Nama kategori backend ("Incident & Issue Handling" dst.) berbeda dari kategori di UI ("Incident").
5. **Users**: tidak ada telepon, tanggal bergabung, shift default, catatan. Daftar `GET /users` tanpa paging/filter (cukup untuk 20 pengguna).
6. **Roles**: nama teknis (SUPER_ADMIN, TEAM_LEAD, AGENT); tidak ada status aktif, urutan, atau penanda peran bawaan. Frontend memetakan label tampilan (Super Admin, Admin, Shift Lead, Operator NOC, Viewer).
7. **Dokumentasi Swagger monitoring tidak lengkap.** `CreateMonitoringLogDto` kosong; `GET /monitoring-template` menjawab 400 walau diberi `page` dan `limit`; parameter query di Swagger memuat seluruh field DTO. Keduanya tertulis "publik" padahal butuh login (401 tanpa login). Frontend belum disambungkan ke monitoring karena ini.
8. **Endpoint yang diasumsikan frontend tidak ada**: `/dashboard/tickets`, `/dashboard/summary`, `/master/*`. Perlu disepakati kontraknya, atau frontend yang menyesuaikan.
9. **Contoh env backend**: `.env.example` memakai `PORT=3000` dan `CORS_ORIGIN=http://localhost:3001`, sedangkan frontend dev berjalan di port 3000. Disarankan `PORT=3001` dan `CORS_ORIGIN` memuat `http://localhost:3000`.

**Untuk devops**
- Cookie sesi `SameSite=Lax`: frontend dan API harus satu *site* (mis. `app.contoh.id` dan `api.contoh.id`), dan `CORS_ORIGIN` harus memuat origin frontend. Di produksi `NODE_ENV=production` membuat cookie `Secure` (perlu HTTPS dan `TRUST_PROXY` di belakang proxy).
- Saat start, backend menyelaraskan tabel `permissions` dan saat login menulis `user_sessions`: ini penulisan ke database yang terjadi otomatis. Database `ctddbnonprod` tidak dipakai/diubah dalam pengujian ini.
- `npm run db:fresh` dan `db:reset` lolos pengaman `db:guard` untuk database ber-nama `nonprod` dan akan menghapus isinya; pertimbangkan mempersempit pengaman itu.

## Pengujian yang dilakukan
Browser nyata (Playwright) terhadap backend asli lewat proxy uji: login, 37 halaman tiket termuat, detail tiket, dashboard, Personel (daftar, cari, detail, statistik header, filter peran), Peran, roster tanpa galat, penulisan menjawab "belum tersambung", tidak ada panggilan backend gagal. Skrip: `output/master-data-round2/scripts/verify-backend-connected.cjs` (butuh `e2e-proxy.cjs`).
