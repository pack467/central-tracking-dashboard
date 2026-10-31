# Temuan Integrasi Frontend ↔ Backend — 31 Oktober 2026

Ringkasan semua temuan saat menyambungkan frontend ke backend, hasil audit Handover, sesi dan logout, serta risiko yang perlu ditangani sebelum production.
Setiap temuan punya **status** dan **siapa yang menindaklanjuti**.

| Status | Arti |
| :--- | :--- |
| ✅ Selesai | Sudah diperbaiki dan sudah di-push |
| 🟡 Sebagian | Bagian frontend selesai, sisanya menunggu pihak lain |
| ⏳ Terbuka | Belum dikerjakan |

## Daftar singkat

| # | Temuan | Tingkat | Status | Tindak lanjut |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Tim backend tidak bisa login dari frontend | Tinggi | ✅ Selesai | FE |
| 2 | Frontend dan backend bentrok di port 3000 ("Server sedang bermasalah") | Sedang | ✅ Selesai (setup) | Semua dev |
| 3 | Request `_rsc` ke port 3001 dikira salah alamat | Info | Bukan bug | — |
| 4 | Identitas Handover tidak terhubung ke login | Tinggi | 🟡 Identitas selesai (FE), penyimpanan masih D1 | FE ✅ / BE |
| 5 | Data demo Handover menimpa data setiap kali daftar dimuat | Tinggi | ✅ Selesai | FE |
| 6 | Info "dikonfirmasi oleh" pada tugas Handover hilang | Sedang | ✅ Selesai | FE |
| 7 | Penerima bisa melewati checklist dengan menghapus tugas | Sedang | ✅ Selesai (aturan baru) | FE |
| 8 | Aturan akses Handover longgar dan tidak konsisten | Sedang | ✅ Selesai (aturan baru) | FE |
| 9 | Daftar tiket di catatan Handover tidak divalidasi | Sedang | ✅ Selesai | FE |
| 10 | Audit trail Handover bisa membengkak sampai catatan terkunci | Rendah | ✅ Selesai | FE |
| 11 | Filter PIC dengan banyak nama bisa error 500 | Rendah | ✅ Selesai | FE |
| 12 | Draf Handover tercampur antar user di komputer yang sama | Rendah | ✅ Selesai | FE |
| 13 | Shift dan PIC di form Handover masih diketik manual | UX | ✅ Selesai | FE |
| 14 | Daftar pilihan dropdown terlalu kecil di bawah layar | UX | ✅ Selesai | FE |
| 15 | `/roles` dan `/users` di-fetch berulang saat logout | Sedang | ✅ Selesai | FE |
| 16 | Semua tiket diambil sekaligus | **Tinggi untuk production** | ⏳ Terbuka, menunggu endpoint ringkasan BE | BE, lalu FE |
| 17 | Rahasia di `.env` backend terlihat saat screen share | Sedang | ⏳ Terbuka | BE / DevOps |
| 18 | Logout tidak menunggu backend, jadi bisa "tidak benar-benar logout" | Tinggi | ✅ Selesai | FE |
| 19 | Sesi tidak dicek saat pindah halaman (tanpa spam `/auth/me`) | Sedang | ✅ Selesai | FE |
| 20 | Logout bisa menggantung saat mengambil ulang token CSRF | Rendah | ✅ Selesai | FE |
| 21 | Logout yang ditolak karena batas request (429) disebut "periksa koneksi" | Rendah | ✅ Selesai | FE |
| 22 | Filter PIC dipotong di 500 karakter, nama terakhir terpotong di tengah | Rendah | ✅ Selesai | FE |
| 23 | Panggilan `/auth/me` dari server Handover berbagi batas request satu IP | Sedang (production) | ⏳ Terbuka | BE / DevOps |
| 24 | 401 dari API Handover tidak me-logout, dan bisa membuat loop login | Sedang | ✅ Selesai | FE |
| 25 | Kode mati yang memanggil `/api/handovers` ke alamat backend | Info | Dicatat, tidak diubah | FE |
| 26 | Request ganda saat login (15 request, seharusnya 9) | Sedang | ✅ Selesai | FE |
| 27 | TanStack Query dan Zod: satu cache data server dan validasi jawaban backend | Perbaikan | ✅ Selesai | FE |
| 28 | Render server gagal di setiap halaman (React #419) karena nilai acak di scope global, regresi dari #26 | Tinggi | ✅ Selesai | FE |
| 29 | Zod memicu pelanggaran CSP `script-src eval` | Sedang | ✅ Selesai | FE |
| 30 | `/auth/me` dan `/auth/csrf` ganda tepat setelah login | Rendah | ✅ Selesai | FE |

---

## 1. Tim backend tidak bisa login dari frontend ✅

**Gejala:** login dengan akun dari database selalu ditolak dengan pesan *"Email/ID karyawan atau kata sandi salah"*.

**Penyebab:**
- `frontend/.env.local` tidak ikut git, dan `frontend/.env.example` **juga tidak pernah masuk git** karena `.gitignore` frontend mengabaikan semua `.env*`.
- Tanpa setting itu, `NEXT_PUBLIC_API_MODULES` kosong, sehingga frontend berjalan dalam **mode mock**. Halaman login hanya mencocokkan akun demo bawaan frontend dan **tidak pernah memanggil backend**.
- Port juga tidak cocok. Backend tim berjalan di **3000**, sedangkan setting frontend lama mengarah ke **3001**.

**Perbaikan** (commit `32fd3b4`, `3aa80f1`):
- `.env.example` sekarang ikut git (pengecualian `!.env.example`) dan langsung mengarah ke backend:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:3000
  NEXT_PUBLIC_API_MODULES=auth,tickets,people,roles
  NEXT_PUBLIC_USE_MOCK=true
  ```
- `npm run dev:backend` menjalankan frontend di port **3001**.
- `npm run check:backend` mengecek env, backend, database, CORS, dan login satu per satu.
- Panduan lengkap ada di [menghubungkan-backend.md](menghubungkan-backend.md).

**Kesepakatan port:** backend **3000**, frontend **3001**, dan `CORS_ORIGIN=http://localhost:3001` di `backend/.env`. Password seed tim backend: `admin123`.

## 2. Frontend dan backend bentrok di port 3000 ✅

**Gejala:**
- Saat login muncul *"Server sedang bermasalah. Coba lagi nanti."*
- Setelah itu muncul `{"statusCode":404,"message":"Cannot GET /login?next=%2Fdashboard"}`.

**Penyebab:**
- Backend mendengarkan di `0.0.0.0:3000` (IPv4) dan frontend dev server di `[::1]:3000` (IPv6). Browser menerjemahkan `localhost` ke IPv6 lebih dulu, jadi `POST /auth/login` sampai ke **frontend** dan dijawab 404.
- Pesan 404 kedua muncul karena tab lama masih membuka `localhost:3000`, yang sekarang dipakai backend.

**Perbaikan:**
- Frontend selalu dijalankan dengan `npm run dev:backend` (port 3001).
- Aplikasi dibuka di `http://localhost:3001`. Port 3000 hanya untuk API dan **jangan dibuka di browser**.

## 3. Request `_rsc` ke port 3001 — bukan bug

Di DevTools terlihat request seperti `localhost:3001/tickets/3589?page=6&_rsc`. Itu **navigasi halaman** frontend (React Server Component), dengan `Content-Type: text/x-component`. Request data tiket yang sebenarnya, `tickets?limit=100&page=…`, tetap pergi ke `localhost:3000` dengan `Content-Type: application/json`.

Cara mengecek: di tab Network pilih filter **Fetch/XHR**, lalu klik baris `tickets?limit=100…`.

---

## Audit Handover

File yang diaudit: `app/api/handovers/*`, `app/lib/handover*.ts`, `app/hooks/useHandoverWorkflow.ts`, dan komponen `app/components/handover/*`.

**Yang sudah baik:**
- Semua query SQL memakai parameter (aman dari SQL injection).
- Tidak ada `innerHTML`.
- Ada batas ukuran isi.
- Ada pengecekan `revision` untuk edit bersamaan.
- Ada pengecekan asal request (same-origin).
- Ada `Cache-Control: no-store`.
- POST idempotent lewat `requestId`.

### 4. Identitas Handover tidak terhubung ke login 🟡

**Sebelumnya:** API Handover tidak membaca sesi login backend (cookie `ctd.sid`):
- **Development:** semua orang dianggap satu operator bawaan. Pembatasan "hanya pembuat" atau "hanya penerima" di API jadi tidak berarti.
- **Production:** tanpa `HANDOVER_TRUST_OAI_HEADERS`, semua request ditolak 401 dan fiturnya mati. Dengan `HANDOVER_SIMULATED_ACTOR=true`, semua orang memakai satu identitas.

**Sekarang** (`app/lib/handover-auth.ts`, `requestActor`): kalau login backend aktif (`auth` ada di `NEXT_PUBLIC_API_MODULES`), API Handover mengirim cookie `ctd.sid` dari browser ke `GET /auth/me` di backend, dan pemanggilnya adalah user yang dijawab backend.
- Tanpa sesi atau sesi berakhir → 401. Backend tidak bisa dihubungi → 503. Operator bawaan dan header identitas tidak berlaku lagi di mode ini, termasuk di development.
- Hanya cookie `ctd.sid` yang diteruskan, bukan cookie lain.
- Cookie `localhost` berlaku lintas port, jadi di development (frontend :3001, backend :3000) cookie-nya ikut terkirim. Di production, ini memerlukan satu alamat untuk frontend dan API (lihat *Rekomendasi arsitektur*).
- Sesi yang baru dikonfirmasi disimpan 15 detik, supaya tidak setiap request Handover memanggil `/auth/me`. Konsekuensinya, setelah logout API Handover masih menerima sesi itu paling lama 15 detik.
- `HANDOVER_BACKEND_URL` (opsional) untuk alamat internal backend dari server frontend.
- Catatan lama di D1 lokal yang dibuat oleh "operator bawaan" tidak bisa diubah oleh user backend (id berbeda). Itu hanya data development.

**Yang masih tersisa (tim backend):**
- Data Handover masih disimpan di D1 (SQLite Cloudflare), bukan di PostgreSQL backend. Backend sudah punya model `Handover` di `schema.prisma`, tapi belum ada endpoint-nya. Ini juga tercatat sebagai P1 #10 di rencana kesiapan production.
- Aturan shift (#8) masih dicek di aplikasi saja, karena backend belum punya data shift user.

### 5. Data demo menimpa data setiap kali daftar dimuat ✅

**Sebelumnya:**
- `GET /api/handovers` mengisi ±48 catatan demo **setiap kali dipanggil**, di semua environment.
- Dua catatan memakai `ON CONFLICT DO UPDATE`, sehingga handover demo yang sudah diterima kembali ke status "belum diterima".

**Sekarang:** data demo hanya diisi di development, sekali per jalannya server, hanya kalau belum ada, dan tidak pernah menimpa (`DO NOTHING`).

### 6. Info "dikonfirmasi oleh" hilang ✅

**Sebelumnya:** `parseHandoverContent` tidak menyalin `confirmedBy` dan `confirmedAt`, jadi info itu hilang setiap kali catatan disimpan.

**Sekarang:** info tetap tersimpan, dan pengirim tidak bisa mengisinya sendiri lewat draf.

### 7 dan 8. Aturan akses Handover ✅

Aturan dari tim:

| Aksi | Siapa yang boleh |
| :--- | :--- |
| Membuat handover | Anggota shift pengirim atau shift penerima handover itu |
| Menghapus catatan atau tugas | Pengirim atau penerima, **dan** anggota shift pengirim/penerima |
| Menerima handover tanpa email penerima | Semua orang |
| Orang yang sedang cuti | Tidak boleh membuat atau menghapus |

**Batasan yang masih ada:**
- Aturan shift baru dicek di aplikasi, belum di API, karena API belum tahu identitas sebenarnya (lihat #4).
- User yang shift-nya belum diketahui tidak diblokir. User dari backend belum punya data shift dan tercatat "Belum dijadwalkan" di Master Data, jadi kalau diblokir tidak ada yang bisa membuat handover. Begitu shift diisi di Master Data, aturan berlaku otomatis.

### 24. 401 dari API Handover ✅

Ditemukan pada pemeriksaan kedua setelah #4. Handover memakai `fetch` sendiri, bukan `ApiClient`, jadi 401 dari API Handover tidak lewat handler logout. Klien hanya menampilkan pesan. Ada dua penyebab yang perlu dibedakan:
- **Sesi berakhir di tempat lain:** app seharusnya ikut logout, tapi user tetap di halaman dengan pesan error.
- **Sesi masih hidup, tapi cookie tidak sampai ke server frontend** (production dengan domain terpisah): user disuruh "masuk kembali". Setelah login, hasilnya tetap 401, berulang tanpa akhir.

**Sekarang** (`useHandoverWorkflow.ts`, `recheckSession` di `auth.tsx`): setiap 401 dari API Handover membuat app memeriksa sesi langsung ke backend dengan satu `GET /auth/me`.
- Sesi berakhir → app logout dan pindah ke `/login`.
- Sesi masih hidup → tampil pesan *"Anda masih login, tetapi sesi tidak sampai ke server handover. Hubungi administrator: aplikasi dan API harus disajikan di satu alamat."*

Selain itu, jawaban yang bukan JSON (misalnya halaman error HTML dari proxy) tidak lagi memunculkan pesan error parsing ke user.

### 26. Request ganda saat login ✅

Ditemukan dengan menghitung semua request di browser. Saat login, `/auth/me` terkirim 4×, `/roles` 4×, `/users` 2×, dan `/auth/csrf` 2×. Penyebabnya tiga:
1. **Halaman dimuat ulang penuh setelah login** (`window.location.href`). Data tim yang sudah mulai dimuat di halaman login dibuang, lalu pengecekan sesi dan data tim dimulai lagi di dokumen baru. Sekarang halaman login pindah dengan `router.replace` (navigasi di dalam app), dan data yang sudah dimuat ikut terbawa.
2. **Tab menerima pesan BroadcastChannel-nya sendiri.** Pesan BroadcastChannel juga sampai ke objek channel lain di tab yang sama, jadi setiap login, logout, dan sesi berakhir memicu `/auth/me` + `/auth/csrf` tambahan di tab itu sendiri. Sekarang pesannya membawa id tab, dan pesan sendiri diabaikan. Tab lain tetap menerimanya.
3. **`/roles` diambil 2× setiap kali data tim dimuat**, sekali untuk label peran personel dan sekali untuk daftar peran. Sekarang keduanya memakai satu request (`backendPeopleAndRoles`).

**Hasil pengukuran** (Chrome headless, backend tiruan auth, endpoint lain dijawab dengan data kosong yang valid):

| Situasi | Sebelum | Sesudah |
| :--- | :--- | :--- |
| Login sampai dashboard tampil | 15 request (`/auth/me` 4, `/roles` 4, `/users` 2, `/auth/csrf` 2) | **9**, semua tunggal kecuali `/auth/me` 3× (cek awal halaman login, cek cookie setelah login, pengecekan sesi oleh app) |
| Dashboard dibiarkan 70 detik | 1 `/tickets` (refresh per menit) | sama |
| Pindah 6 menu | 0 `/auth/me`, 2 `/api/handovers` | sama |
| Event focus/visibility 3× | 0 `/auth/me` | sama |
| Logout lalu 10 detik di `/login` | 1 logout + 1 `/auth/me` | sama |
| Sesi berakhir di tempat lain, 80 detik | 2 `/auth/me`, lalu `/login` dan tidak ada request lagi | sama |
| Logout di tab A | Tab B ikut ke `/login` dengan 1 `/auth/me` | sama |

### 27. TanStack Query dan Zod ✅

Dipasang dengan versi dipatok: `@tanstack/react-query` 5.105.0 dan `zod` 4.6.7. `npm audit` tetap 0 kerentanan. Backend dan database tidak disentuh.

**TanStack Query, satu cache untuk semua data server.** Sebelumnya ada empat mekanisme cache buatan sendiri (`useResource`, `useBackendTeam`, `useBackendTickets`, cache lookup tiket), masing-masing dengan aturan retry dan reset sendiri:
- `lib/query-client.ts` adalah satu-satunya aturan retry. Network, timeout, 429 (mengikuti `Retry-After`), dan 5xx dicoba ulang paling banyak 3 kali (5, 15, 45 detik). 4xx lain, 501, dan jawaban yang bentuknya salah tidak dicoba ulang.
- `QueryProvider` dipasang di root layout, jadi juga mencakup halaman login.
- `useResource` ditulis ulang di atas `useQuery` dengan antarmuka yang sama. Lima halaman (Dashboard, Tiket, Monitoring, Reports, Team Roster) tidak perlu diubah. Data tetap diambil ulang setiap halaman dibuka, sambil menampilkan data lama.
- `useBackendTeam`, `useBackendTickets`, dan lookup tiket sekarang memakai `useQuery`. Pemuatan tiket penuh tidak dicoba ulang otomatis, karena retry 429 per halaman sudah ada dan mengulang 37 request akan menghabiskan jatah bersama.
- Setiap key query memuat id user (`useSessionUserId`), dan `bindSessionData` mengosongkan seluruh cache saat user berganti. Ini juga menutup celah lama: cache `useResource` dulu tidak pernah dibersihkan saat akun berganti tanpa reload.

**Zod, jawaban backend diperiksa saat tiba** (`lib/api/schemas.ts`), bukan dipercaya dengan `as`. Yang diperiksa: login, `/auth/me`, `/auth/csrf`, `/tickets` (daftar, terbaru, simpan, hitungan), `/users`, `/roles`, `/ticket-categories`, `/ticket-severities`, dan `/auth/me` di server Handover.
- Field tambahan dari backend tetap dipertahankan, dan field yang boleh kosong boleh tidak dikirim. Id angka diubah ke string.
- Jawaban yang bentuknya salah menjadi error `INVALID_RESPONSE` dengan pesan *"Jawaban server untuk daftar tiket tidak sesuai format yang diharapkan."*, bukan crash. Console hanya mencatat path dan pesan, tidak pernah nilainya.
- Endpoint yang belum ada di backend (`/master/*`, `/monitoring/*`, `/reports/*`, `/roster/*`) sengaja belum diberi skema.
- Handover workflow tidak diubah: logikanya kompleks dan sudah teruji.

**Verifikasi:**
- Typecheck bersih, lint 0 error di file yang disentuh, dan build production berhasil dengan bundle bersih.
- 5 tes baru (`tests/query-and-schemas.test.mjs`) dan 16 tes Handover lulus. Tidak ada tes yang gagal baru dibanding `HEAD`.
- Di browser (build production dengan backend tiruan), ketujuh halaman tampil tanpa satu pun error console.
- `/tickets` yang bentuknya salah memunculkan pesan yang jelas, tanpa crash.
- Jumlah request di semua skenario sama dengan pengukuran #26, dan logout antar-tab tetap jalan.
- Uji end-to-end Handover **belum diulang** di putaran ini. API Handover butuh runtime Cloudflare (`cloudflare:workers`), yang hanya ada di dev server, sedangkan dev server sedang dipakai di port 3000. Bagian Handover yang berubah di putaran ini hanya pembacaan `/auth/me` di server, dan itu tercakup unit test `requestActor`.

### Audit browser build production di runtime Cloudflare (31 Oktober)

**Cara uji:** build production dijalankan dengan `wrangler dev` di workerd, yaitu runtime yang sama dengan production, memakai D1 lokal sementara yang terpisah dari database lokal tim. Backend tiruan auth dipakai, dan endpoint lain dijawab dengan 350 tiket supaya paging ikut teruji. Setiap request dan response dicatat: status, tipe, ukuran, waktu, header keamanan, `Cache-Control`, validitas JSON, request ganda, host tujuan, error console, pelanggaran CSP, cookie, dan isi storage. Alur yang dijalani: login, delapan menu, detail tiket, buat/baca/centang/hapus handover, JSON rusak, id tidak ada, reload, dan logout.

#### 28. Render server gagal di setiap halaman ✅ (regresi dari #26)

**Gejala:** `/login` dan semua halaman app dikirim server dengan boundary yang dialihkan ke browser (`<!--$!-->`, digest `722281218`), dan browser mencatat *Minified React error #419*. Halaman tetap tampil karena React merender ulang di browser, tetapi render server terbuang di setiap pemuatan halaman.

**Penyebab:** `TAB_ID` dari perbaikan #26 dibuat dengan `crypto.randomUUID()` saat modul dimuat. Cloudflare Workers melarang nilai acak di scope global (*"Disallowed operation called within global scope"*). Ini tidak terlihat di dev server, yang berjalan di Node. Build `HEAD` di workerd terbukti bersih, dan pesan aslinya didapat dengan mencatat error SSR di build pengujian.

**Perbaikan:** id tab dibuat saat pertama kali dipakai (`thisTab()` di `auth.tsx`). Tidak ada lagi kode lain yang membuat nilai acak, timer, atau I/O di scope global.

#### 29. Zod memicu pelanggaran CSP ✅

Zod v4 mencoba `new Function` untuk mempercepat parsing. CSP aplikasi (tanpa `'unsafe-eval'`) menolaknya dan melaporkan pelanggaran `script-src eval`, meskipun Zod menangkap error-nya. **Perbaikan:** `z.config({ jitless: true })` di `lib/api/schemas.ts`. Hasilnya 0 pelanggaran CSP.

#### 30. `/auth/me` dan `/auth/csrf` ganda setelah login ✅

Halaman login dan app punya `AuthProvider` masing-masing, jadi app mengecek ulang sesi yang baru dicek satu detik sebelumnya. **Perbaikan:** hasil login yang berumur kurang dari 10 detik dipakai satu kali (`auth-api.ts`). Urutan login sekarang: cek sesi (401), login, cek cookie, users, roles, dan 4 halaman tiket.

#### Hasil audit setelah perbaikan

| Aspek | Hasil |
| :--- | :--- |
| Error halaman (pageerror) | 0 |
| Pelanggaran CSP | 0 |
| JSON tidak valid | 0. Semua jawaban backend sesuai skema. |
| Request gagal yang bermasalah | 0. `_rsc` yang `ERR_ABORTED` adalah prefetch yang dibatalkan saat pindah menu cepat (normal). `POST /auth/logout` tercatat `ERR_ABORTED` oleh Playwright karena `keepalive`, padahal backend menjawab 204 dan cookie terhapus. |
| Status error | Hanya yang memang diharapkan: 401 `/auth/me` di halaman login, serta 400/404 dari uji sengaja. |
| Header keamanan dokumen | CSP dengan nonce, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP` |
| Cache | Aset statis `max-age=31536000, immutable`. Semua `/api/handovers` `no-store`. |
| Host yang dihubungi | Situs sendiri, API, dan Google Fonts. Tidak ada yang lain. |
| Cookie | `ctd.sid` HttpOnly, SameSite=Lax. Hilang setelah logout. |
| Storage | Tidak ada sandi, token, atau cookie sesi. Cache tiket di sessionStorage terhapus saat logout. |
| Handover API | Buat 201, baca 200, centang 200, JSON rusak 400 dengan pesan, id tidak ada 404, hapus 200 |
| Reload dalam 3 menit | 0 request tiket (memakai salinan sessionStorage) |
| Login sampai dashboard tampil | sekitar 1 detik (lokal) |

**Catatan, bukan bug:**
- Browser selalu menulis *"Failed to load resource: 401"* di console untuk `/auth/me` di halaman login. Itu cara browser melaporkan setiap 4xx dan tidak bisa dihilangkan dari frontend.
- Ukuran aset tanpa kompresi: CSS satu file 431 KB, JavaScript sekitar 4,3 MB dalam 212 file. Cloudflare mengompresinya saat dikirim. Ini peluang optimasi nanti, bukan masalah fungsi.
- Cache tiket di sessionStorage sekitar 165 KB per 350 tiket, jadi sekitar 1,7 MB untuk 3.649 tiket. Ini tercatat sebagai butir 15 di rencana kesiapan production dan selesai bersama #16.
- Google Fonts adalah ketergantungan eksternal (sudah ada sebelumnya).

### 25. Kode mati yang memanggil `/api/handovers` ke backend (info)

`handoverService` di `app/lib/api.ts` dan `shiftLogService` di `app/services/shift-log.ts` tidak dipakai di mana pun. `handoverService` mengirim `/api/handovers` lewat `ApiClient`, yang mengarah ke **backend**, bukan ke route Next. Kalau suatu saat dipakai, request-nya akan salah alamat, dan jawaban 401 dari backend bisa me-logout user. Sebaiknya dihapus saat merapikan kode. Tidak diubah sekarang karena tidak berpengaruh.

### 9. Daftar tiket di catatan Handover tidak divalidasi ✅

**Sebelumnya:** `openTickets` dan `closedTickets` dari browser disimpan apa adanya, dengan field dan tipe apa pun, jadi klien bisa memalsukan daftar tiket di catatan.

**Temuan saat memperbaiki:** aplikasi sendiri **tidak pernah** mengirim daftar tiket. Tiket terbuka di catatan diambil dari referensi `ticket:<id>` pada tugas, lalu dicocokkan dengan daftar tiket live. Daftar tiket tersimpan hanya ada di data demo.

**Sekarang:**
- Draf dari browser tidak boleh membawa daftar tiket. Saat membuat handover, daftar itu dibuang. Saat revisi, yang dipakai adalah daftar yang sudah tersimpan di catatan itu.
- Daftar yang dibaca dari catatan lama hanya mempertahankan field yang dikenal (id, subjek, status, dan sejenisnya) dengan tipe dan panjang yang benar. Entri tanpa id atau subjek dibuang.

### 10. Audit trail membengkak ✅

**Sebelumnya:** mencentang lalu membatalkan centang tugas berulang kali menambah baris audit terus-menerus, sampai catatan melewati 100 KB dan tidak bisa diubah lagi (413).

**Sekarang:** centang lalu batal centang oleh orang yang sama pada tugas yang sama saling meniadakan.

### 11. Filter PIC dengan banyak nama ✅

**Sebelumnya:** setiap nama memakai dua parameter SQL, sehingga lebih dari ±45 nama melewati batas 100 parameter per query D1 (error 500).

**Sekarang:** semua nama dikirim sebagai **satu** parameter berisi array JSON dan dibaca dengan `json_each`. Jumlah nama tidak lagi memengaruhi jumlah parameter. Nama ganda digabung, dan jumlahnya dibatasi 200 nama.

### 22. Filter PIC dipotong di 500 karakter ✅

Ditemukan saat memperbaiki #11. Parameter `pic` dipotong di 500 karakter, jadi nama terakhir bisa terpotong di tengah (misalnya "agnes si") dan tetap dicocokkan sebagian. Batasnya sekarang 5.000 karakter.

### 12. Draf Handover tercampur antar user ✅

Kunci draf di `localStorage` sekarang memakai id user login. Draf lama dipindahkan ke user pertama yang membuka Handover.

### 13 dan 14. Perbaikan tampilan form Handover ✅

- Shift yang menyerahkan dan yang menerima dipilih dari Subuh / Pagi / Malam.
- PIC pengirim dan penerima dipilih dari roster Master Data. Keduanya bisa memilih **lebih dari satu orang**, dan orang yang cuti tidak ditampilkan.
- Teks "Draf tersimpan otomatis di perangkat ini" dihapus. Peringatan saat draf gagal disimpan tetap ada.
- Dropdown sekarang dibuka **ke atas** kalau tidak muat di bawah, dan daftar pilihan ganda bisa setinggi 380px. Sebelumnya hanya 2–3 nama yang terlihat.

---

## 15. `/roles` dan `/users` di-fetch berulang saat logout ✅

**Penyebab:** sebuah loop.
1. Logout mengosongkan data tim dan menandainya "belum dimuat".
2. Komponen yang masih tampil (±0,4 detik sebelum pindah ke `/login`) memuat ulang `/users` dan `/roles`.
3. Backend menjawab 401, handler 401 menjalankan logout lagi, data direset lagi, dan kembali ke langkah 2.

**Perbaikan** di `app/hooks/useBackendTeam.ts` dan `app/lib/session-data.ts`:
- Saat tidak ada user, data tim ditandai "sudah selesai" sehingga tidak dimuat ulang.
- Jawaban request yang datang terlambat (milik user sebelumnya) diabaikan.

**Hasil uji di browser** (login, buka Master Data, logout, hitung request selama 4 detik):

| | Request setelah logout |
| :--- | :--- |
| Sebelum | `/users` 1×, `/roles` 2× (semua 401) |
| Sesudah | **0** |

## 16. Semua tiket diambil sekaligus ⏳ — risiko production

**Kondisi sekarang** (diukur terhadap backend lokal):

| | Nilai |
| :--- | :--- |
| Jumlah tiket | 3.649 |
| Request per pemuatan penuh | 37 (100 tiket per request, 4 paralel) |
| Waktu (lokal, tanpa jaringan) | 0,58 detik |
| Ukuran data | ±3 MB |
| Satu halaman (100 tiket) | ±17 ms, ±84 KB |

**Kenapa semua tiket diambil:** grafik dashboard (volume, MoM, SLA, rekap per user, trafik per shift, distribusi), filter dan pencarian tabel tiket, tiket terbuka untuk Handover, dan pencarian cepat semuanya **dihitung di browser**. Backend baru punya `/tickets/summary`, dan isinya hanya total serta jumlah per status.

**Kapan pemuatan penuh terjadi:**

| Kejadian | Request |
| :--- | :--- |
| Login | Semua tiket (37) |
| Reload dalam 3 menit | 0 (memakai salinan di tab) |
| Reload setelah 3 menit | Semua tiket (37) |
| Logout lalu login | Semua tiket (37). Disengaja: data orang sebelumnya dibuang |
| Setiap 60 detik (tab terlihat) | 1 request: 100 tiket yang terakhir berubah. Aman |

**Kenapa jadi masalah di production:**
- Ukuran dan jumlah request naik lurus dengan jumlah tiket. Sekitar 10.000 tiket berarti ±100 request dan ±8 MB per login.
- Backend membatasi **100 request/menit per IP**. Sekitar 10.000 tiket, satu pemuatan saja sudah menabrak batas itu (429).
- Operator di kantor yang sama biasanya berbagi satu IP publik, sehingga juga berbagi jatah request.
- Browser makin berat menggambar dashboard, dan backend menerima puluhan query setiap kali ada yang login.

**Rekomendasi:**
1. **Backend (perlu tim backend, harus lebih dulu):** endpoint ringkasan untuk dashboard, misalnya jumlah per hari, kategori, severity, user, dan shift. Tahap ini yang benar-benar menghilangkan "ambil semua".
2. **Frontend, setelah tahap 1:** dashboard memakai endpoint ringkasan, dan halaman Tiket memakai paging dari server (`page`, `status`, `open_from`/`open_to`, `user_id` sudah didukung backend).
3. **Sementara tahap 1 dikerjakan:** naikkan batas request khusus `/tickets`.

**Kenapa frontend belum diubah duluan** (dicek 31 Oktober): seluruh aplikasi (AppShell, dashboard, halaman Tiket, laporan, Handover) memakai **satu** daftar tiket lengkap yang sama, dimuat sekali dan dipakai bersama. Kalau hanya halaman Tiket dipindah ke paging server, jumlah request tidak berkurang, karena shell tetap memuat semua tiket untuk dashboard. Request malah bertambah. Menampilkan halaman pertama lebih dulu juga tidak tepat untuk dashboard, karena grafik SLA dan rekap akan sempat menunjukkan angka yang salah dari data sebagian. Jadi perubahan frontend baru berguna setelah endpoint ringkasan ada.

## 17. Rahasia `.env` backend terlihat saat screen share ⏳

Saat screen share di Discord, `backend/.env` terlihat lengkap dengan password database dan `SESSION_SECRET`. Untuk development lokal ini tidak terlalu berbahaya. **Jangan** pakai nilai yang sama di staging atau production, dan ganti nilainya kalau sudah terlanjur dipakai di sana.

## 18. Logout tidak menunggu backend ✅

**Gejala:** setelah klik "Keluar Sesi", user kadang masih bisa masuk ke aplikasi, seolah tidak benar-benar logout.

**Penyebab:**
- Data user di browser langsung dihapus, lalu halaman pindah ke `/login` setelah 400 ms, **tanpa menunggu** jawaban `POST /auth/logout`. Hasil request itu juga tidak dicek.
- Kalau logout gagal di server (token CSRF hilang atau kedaluwarsa sehingga 403, jaringan putus, backend lambat), sesi di backend **masih hidup**. Halaman `/login` lalu memanggil `/auth/me`, mendapat 200, dan user langsung masuk lagi.
- Halaman pindah dengan `location.href`, jadi tombol Back masih kembali ke halaman aplikasi.

**Perbaikan** (`app/lib/auth.tsx`, `app/lib/auth-api.ts`, `app/components/layout/Sidebar.tsx`):
- Logout **menunggu** backend mengakhiri sesi (204, atau 401 kalau sesinya memang sudah berakhir). Baru setelah itu data di browser dihapus dan halaman pindah ke `/login`.
- Kalau backend menolak dengan 403 karena token CSRF hilang atau usang, token diambil ulang dan logout dicoba sekali lagi.
- Kalau logout tetap gagal, user **tetap login** dan melihat pesan *"Sesi belum bisa ditutup di server. Periksa koneksi lalu coba lagi."* Aplikasi tidak lagi berpura-pura sudah logout.
- Halaman pindah dengan `location.replace`, jadi tombol Back tidak membuka aplikasi lagi.

### 20 dan 21. Celah kecil pada perbaikan logout ✅

Ditemukan saat memeriksa ulang perbaikan #18:
- **#20:** saat logout dicoba ulang karena 403, pengambilan ulang `/auth/csrf` tidak punya batas waktu. Kalau backend menggantung di situ, logout tidak pernah selesai dan tidak ada pesan apa pun. Sekarang request ini dibatasi 8 detik, sama seperti request logout.
- **#21:** logout yang ditolak karena batas 100 request/menit (429, misalnya saat rekan sekantor sedang memuat tiket) menampilkan *"Periksa koneksi"*, padahal koneksinya baik. Sekarang pesannya: *"Server sedang membatasi permintaan. Tunggu sekitar satu menit lalu coba keluar lagi."*

### 23. Panggilan `/auth/me` dari server Handover berbagi batas request ⏳

Efek samping #4. Pengecekan sesi Handover dikirim dari **server frontend**, bukan dari browser, sehingga di backend semuanya terlihat datang dari satu IP dan berbagi jatah 100 request/menit. Cache 15 detik membatasi paling banyak ±4 request/menit per user yang aktif di Handover. Dengan puluhan user aktif bersamaan, batas itu tetap bisa tercapai.

**Rekomendasi (BE / DevOps):** kecualikan `GET /auth/me` dari server frontend dari batas request, atau atur `TRUST_PROXY` agar backend membaca IP asli. Masalah ini hilang dengan sendirinya kalau Handover pindah ke backend (#4).

## 19. Sesi tidak dicek saat pindah halaman ✅

**Jawaban untuk pertanyaan "apakah setiap halaman di-`auth/me`?"** Sebelum perbaikan: **tidak**. `/auth/me` hanya dipanggil saat aplikasi pertama dibuka (atau saat tab lain login/logout). Kalau sesi berakhir di tempat lain (logout di perangkat lain, kedaluwarsa 12 jam, dicabut admin), tab yang masih terbuka tetap bisa dipakai. Halaman yang tidak memanggil backend, seperti Monitoring, Shift Log, dan Handover, terus berjalan **tanpa sesi**. Sesi baru ketahuan berakhir saat ada request ke backend yang dijawab 401.

**Perbaikan, tanpa spam `/auth/me`:**
- Setiap **pindah halaman** dan setiap **kembali ke tab**, sesi dicek dengan satu `GET /auth/me`, tanpa ikut memanggil `/auth/csrf`.
- Pengecekan **dilewati** kalau dalam 60 detik terakhir ada jawaban sukses dari backend, karena jawaban apa pun dari backend (tiket, users, refresh tiap menit) sudah membuktikan sesi masih hidup. Hasilnya, aplikasi yang sedang aktif hampir tidak pernah mengirim `/auth/me` tambahan.
- Paling banyak satu pengecekan berjalan pada satu waktu.
- Kalau server tidak bisa dihubungi, user **tidak** di-logout. Logout hanya terjadi kalau server menjawab 401.
- Setiap 401 dari request mana pun tetap langsung me-logout, seperti sebelumnya.

**Batasan:** setelah sesi diakhiri di tempat lain, perlu paling lama sekitar 1 menit sampai tab ini ikut keluar. Itu imbal balik dari tidak membanjiri `/auth/me`. Tab di browser yang sama langsung ikut keluar lewat BroadcastChannel.

### Pemeriksaan ulang #15, #18, #19 (31 Oktober)

Diff di 6 file dibaca ulang baris per baris:
- **#15:** penanda generasi membuang jawaban yang datang terlambat, dan request baru tidak terhalang request lama.
- **#18:** backend menjalankan `AuthGuard` sebelum `CsrfGuard`, jadi sesi yang sudah berakhir dijawab 401 (dianggap selesai), bukan 403.
- **#19:** sinyal "sesi terkonfirmasi" hanya datang dari `ApiClient`, yang selalu mengarah ke backend. Handover memakai `fetch` sendiri ke route Next, sehingga tidak ikut dihitung.

Hasilnya benar, dengan dua celah kecil (#20, #21) yang sudah ditutup.

### Hasil uji #18 dan #19

Diuji di browser (Chrome headless) terhadap backend asli:

| Skenario | Hasil |
| :--- | :--- |
| Pindah ke 6 menu berturut-turut | **0** request `/auth/me` tambahan |
| Logout saat server menolak (request disimulasikan gagal) | Tetap di dashboard, pesan error tampil, sesi di server masih hidup (200), konsisten dengan tampilan |
| Sesi diakhiri dari tempat lain, lalu ±1 menit kemudian pindah halaman | Terdeteksi (`/tickets` dan `/auth/me` dijawab 401), diarahkan ke `/login` |
| Logout normal | Sesi di server berakhir (`/auth/me` → 401), Back tetap di `/login`, 0 request `/roles` atau `/users` |

---

## Rekomendasi arsitektur untuk production

Sajikan frontend dan API di **satu alamat**, misalnya `https://ctd.perusahaan.id` untuk aplikasi dan `https://ctd.perusahaan.id/api` yang diteruskan ke NestJS.

| | Langsung ke backend (sekarang) | Satu alamat dengan `/api` |
| :--- | :--- | :--- |
| CORS | Perlu diatur | Tidak perlu |
| Cookie sesi | Bisa bermasalah kalau beda domain | Paling aman |
| Identitas Handover (#4) | Tidak jalan (cookie tidak sampai ke server frontend) | Jalan |
| Pekerjaan | Tidak ada | Konfigurasi reverse proxy (DevOps) |

Untuk development lokal, cara sekarang (frontend :3001 ke backend :3000) sudah cukup.

## Yang perlu dikerjakan tim backend / DevOps

1. Endpoint Handover di backend memakai model `Handover` yang sudah ada (#4). Identitas sudah ikut sesi login, tinggal penyimpanannya.
2. Endpoint ringkasan tiket untuk dashboard (#16). Ini membuka pekerjaan frontend untuk #16.
3. Sementara itu, naikkan batas request untuk `/tickets` (#16).
4. Data shift user, supaya aturan shift Handover bisa dicek untuk semua orang dan di API (#8).
5. Production: satu alamat untuk frontend dan API (reverse proxy). **Wajib** agar identitas Handover (#4) jalan.
6. `GET /auth/me` dari server frontend dikecualikan dari batas request, atau `TRUST_PROXY` diatur (#23).
7. Jangan pakai ulang password database dan `SESSION_SECRET` dari `.env` lokal (#17).

## Commit terkait

Branch `refactor/frontend-tailwind-migration`:

| Commit | Isi |
| :--- | :--- |
| `6ab8686` | Kode tiket dari backend, pilihan tiket dari backend di form, periode rekap user |
| `32fd3b4` | Panduan koneksi, `check:backend`, `dev:backend`, `.env.example` masuk git |
| `3aa80f1` | Koreksi password seed di panduan (`admin123`) |
| `1b8dddb` | Perbaikan audit Handover dan aturan shift (#5, #6, #7, #8, #10, #12) |
| `b5b38f6` | Shift dan PIC Handover jadi pilihan (#13) |
| `bcc2689` | Beberapa PIC pengirim, dropdown dibuka ke atas (#13, #14) |
| `32da48e` | Loop `/roles` saat logout (#15), logout menunggu backend (#18, #20, #21), pengecekan sesi saat pindah halaman (#19), identitas Handover dari sesi backend (#4, #24), daftar tiket Handover (#9), filter PIC (#11, #22), request ganda saat login (#26), TanStack Query dan Zod (#27), hasil audit browser (#28, #29, #30) |

## Cara mengecek ulang

```bash
cd frontend
npm run check:backend -- --id <email> --password admin123   # sambungan FE → BE → DB
npm run test:handover                                        # 16 tes Handover
```

Uji end-to-end #4, #9, #11, dan logout (31 Oktober) dijalankan di Chrome headless terhadap backend tiruan auth (`output/master-data-round2/scripts/fake-backend.cjs`) di :3000 dan `npm run dev:backend` di :3001:

| Skenario | Hasil |
| :--- | :--- |
| Tanpa login, `GET /api/handovers` | 401 |
| Login lewat form, `GET /api/handovers` | 200, pemanggil = user backend (id 11, email dari backend) |
| Filter PIC dengan 81 nama | 200 |
| Membuat handover dengan daftar tiket palsu | 201, pembuat = user backend, daftar tiket dibuang |
| Pembuat menghapus handover-nya | 200 |
| Logout dari menu profil | Pindah ke `/login`, backend menjawab 204 |
| `GET /api/handovers` setelah logout (melewati cache 15 detik) | 401 |
| #24: cookie tidak sampai ke server Handover, sesi masih hidup | Pesan konfigurasi tampil, user tetap login |
| #24: sesi diakhiri langsung di backend, lalu pindah ke Shift Log lewat menu | App logout ke `/login` lewat satu `GET /auth/me` |
