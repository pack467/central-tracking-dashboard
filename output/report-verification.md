# Verifikasi perbaikan laporan mingguan

Tanggal pemeriksaan: 7 Oktober 2026.

## Perubahan utama

- `frontend/app/lib/weekly-report-pdf.ts`: kop A4 vektor dan logo asli; tanggal Indonesia lengkap; footer nomor saja; grafik kelompok dan tabel data; matriks kategori; tabel log berulang; tata letak tanda tangan dengan gambar PNG opsional.
- `frontend/app/lib/weekly-report.ts`: agregasi dari baris sumber, normalisasi kategori/proyek monitoring, ID dan baris per agen dipertahankan, adapter jumlah gabungan Hutabyte/klien.
- `frontend/app/lib/weekly-report-config.ts`: urutan dan warna proyek, alias, severity, opsi proyek kosong/catatan kaki/footer, serta awal minggu Minggu.
- `frontend/app/components/views/ReportsView.tsx`, `frontend/app/components/reports/ReportSignatoryFields.tsx`, `frontend/app/components/reports/ReportContent.tsx`: integrasi pengaturan nama/jabatan/tanggal/gambar, matriks kategori, palet proyek, label gabungan, serta tampilan monitoring tanpa memaksakan hasil NOK untuk nilai yang belum diketahui.
- `frontend/tests/weekly-report.test.mjs`: 15 pengujian, termasuk tanggal, matriks, monitoring, adapter gabungan, ID dengan whitespace sumber dan pembuatan PDF.
- `frontend/public/reports/hutabyte-logo.png` dan `frontend/public/reports/README.md`: logo asli dan dokumentasi konfigurasi terbaru.

Perubahan UI/dependensi dari pekerjaan sebelumnya tetap dipertahankan.

## Keputusan

- Minggu ini = Minggu–Sabtu; rentang eksplisit 5–11 September tetap dipertahankan.
- Judul kop tetap LAPORAN SERAH TERIMA KERJA HARIAN.
- Label terakhir menjadi Total Ticket Hutabyte x Tritronik; klien lain memakai nama klien masing-masing. Angka gabungan dipakai langsung, tidak ditambah kembali dengan jumlah tiket lokal.
- Adapter `combined_ticket_counts` diprioritaskan; `clickup_counts` tetap didukung untuk kompatibilitas.
- Tanggal penandatangan bawaan = tanggal pembuatan di Jakarta; dapat diubah terpisah.
- PDF contoh tidak memakai gambar tanda tangan. Week 36 memakai contoh nama dari Word untuk menunjukkan tata letak; ekspor website mengikuti identitas pada pengaturan dokumen.
- Dokumen Word asli tetap identik (SHA-256 terverifikasi).

## Hasil pemeriksaan

| Pemeriksaan | Hasil |
| --- | --- |
| Unit test laporan | 15 lulus, 0 gagal, 0 dilewati |
| ESLint pada fitur laporan | Lulus |
| TypeScript pada fitur laporan dan dependensinya | Lulus |
| Production build Vinext | Lulus; ada peringatan ukuran chunk >500 kB |
| Week 36 | 6 halaman; 17 tiket; grafik/tabel/log cocok; durasi 0:34; SLA 100%; monitoring 0 |
| Week 39 | 93 halaman; 138 tiket; grafik/tabel/log cocok; monitoring 864 |
| Seluruh 99 halaman | Berhasil dirender; diperiksa melalui lembar kontak dan halaman detail |
| Ekstraksi ID PDF | Semua ID/baris tiket cocok dengan sumber, termasuk ID berulang |
| Ekstraksi baris monitoring PDF | Tepat 864 baris Week 39, 0 Week 36 |
| Kop, footer, batas teks | Terverifikasi di setiap halaman |
| Catatan panjang | Seluruh 7.150 karakter tetap ada setelah pagination |
| Pratinjau browser | PDF 6 halaman berhasil dirender; tidak ada console error |
| Pengaturan seluler 390 px | Input tertata satu kolom, tidak ada overflow halaman horizontal |
| Gambar tanda tangan | Cabang PNG dirender dalam area sel pada PDF QA internal |

## Data yang belum pasti

Sumber Word memberi label DM pada baris yang memuat 2 tiket Hutabyte dan angka gabungan 4, sedangkan 2 tiket Hutabyte tersebut berada di B2B pada log. Klarifikasi terbaru menetapkan makna/nama kolom gabungan, tetapi belum menetapkan pemetaan proyek angka 4. Angka itu tidak dipindahkan secara diam-diam; B2B dan Grand Total gabungan tetap — sampai pemetaan tersedia.

Sumber Week 39 juga tidak menyediakan pengukuran response time per tiket; SLA tetap —. Total monitoring 864 dihitung dari seluruh baris sumber, tidak menyalin angka ringkasan Word yang tidak sesuai. Data gabungan untuk data test website belum tersedia, sehingga kolom itu — dan dapat diisi lewat adapter.

## Perapian tabel dan grafik

Teks tabel harian menjadi 8–9 pt, baris 22 pt, header teal dengan padding yang lebih lega, kolom tanggal sejajar kelompok grafik, serta legenda terpusat. Semua tabel memakai baris berselang dan Grand Total berlatar terang. Ringkasan monitoring memakai lebar penuh area konten. Grafik diberi ruang di atas maksimum data. Pagination mengikuti ukuran tabel baru; hasil diperiksa ulang untuk semua 99 halaman.

