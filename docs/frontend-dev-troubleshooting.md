# Pemecahan masalah dev server frontend

## Setiap pindah halaman atau ganti filter muncul layar "Menyiapkan dashboard"

**Gejala.** Klik menu atau ganti filter selalu menampilkan layar pemuatan "Menyiapkan dashboard" dan halaman dimuat ulang penuh. Seharusnya pindah halaman terjadi di dalam halaman yang sama, tanpa layar itu. Layar itu hanya wajar muncul saat halaman dibuka atau dimuat ulang manual (F5), dan sesudah login.

**Cara memastikan.** Buka tab Network di DevTools lalu klik satu menu. Kalau setelah permintaan `/tickets?_rsc` selalu ada permintaan dokumen `/tickets`, berarti router jatuh ke muat ulang penuh. Log dev server juga menunjukkan pasangan `GET /tickets?_rsc` lalu `GET /tickets`.

**Penyebab.** Router (vinext) membandingkan "ID kompatibilitas" yang dikirim server dengan yang dibawa JavaScript klien. Kalau berbeda, ia menganggap klien usang dan memuat ulang penuh pada setiap navigasi. Itu terjadi kalau dev server berada dalam keadaan tidak konsisten, misalnya setelah banyak perubahan konfigurasi atau cache dependensi Vite yang rusak. Kodenya sendiri tidak salah: kode yang sama berjalan normal di dev server yang baru dan bersih.

**Perbaikan.**
1. Hentikan dev server (`Ctrl+C`).
2. Hapus folder cache `frontend/node_modules/.vite` (aman, dibuat ulang otomatis).
3. Jalankan lagi `npm run dev` di folder `frontend`.
4. Muat ulang tab browser sekali (`Ctrl+Shift+R`), karena tab lama masih membawa JavaScript dari server sebelumnya.

**Pencegahan.**
- Satu dev server per folder. Jangan menjalankan dev server kedua dari salinan folder yang `node_modules`-nya ditautkan ke folder asli: keduanya memakai satu cache Vite (`node_modules/.vite`).
- Setelah mengubah `vite.config.ts` atau `.env.local`, restart dev server.
