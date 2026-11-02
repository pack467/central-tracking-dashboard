# Migrasi URL Central Tracking Dashboard

Implementasi dilakukan tanpa commit dan tanpa dependency baru. Perubahan Reports, font, CSS, loading/error, dan dependency yang sudah ada saat pekerjaan dimulai dipertahankan. Diagnosis disampaikan sebelum implementasi.

## Diagnosis

- Runtime yang terpasang adalah **vinext 1.0.0-beta.2**, Vite 8.0.13, React 19.2.6, Tailwind 4.2.1. Ini implementasi API App Router Next.js, bukan paket `next`. Karena itu perintah build yang benar pada repository ini adalah `npm run build` → `vinext build`; tidak mengganti runtime atau memasang Next.js.
- `app/page.tsx` awalnya client component besar: `activeNav` memilih sembilan tampilan tanpa mengubah pathname. `/reports` dan `/profile` juga punya wrapper tersendiri. `/login`, `/team`, `/about`, `/offline`, `/error`, dan API handover sudah berupa route.
- Konfigurasi awal tidak mempunyai basePath/i18n/middleware/proxy khusus navigasi. Sidebar/mobile, notifikasi, pencarian global, badge shift, dan panel roster menghubungkan halaman melalui callback.
- Reports mempunyai empat tab yang berbagi rentang, proyek, model laporan, KPI/chart/tabel, preview, dan ekspor. Monitoring mempunyai Jadwal/History; Tickets mempunyai Queue/Escalations; Runbooks mempunyai SOP/Kredensial/Link/Kontak Eskalasi. Roster mempunyai Table/Weekly/Monthly. Detail tiket/anggota dan SOP dapat ditautkan.
- Modal pencatatan, edit/create, handover, konfirmasi, dropdown, toast, panel roster, sidebar ciut, serta klien aktif tetap state. Scroll utama adalah `window`; beberapa tabel/panel mempunyai scroll internal.
- Autentikasi sebelumnya berbasis localStorage dan sesi operator demo bawaan. Tidak ada guard server yang dapat dipindahkan. Guard client ditambahkan untuk kondisi logout eksplisit; mekanisme login dan sesi demo tetap sama. Ini tidak memperkenalkan autentikasi server/API baru.

## Peta URL final

| Tampilan | Path |
|---|---|
| Dashboard | `/dashboard` |
| Tickets Queue / Escalations | `/tickets`, `/tickets/escalations` |
| Detail tiket | `/tickets/[ticketId]` |
| Monitoring Jadwal / History | `/monitoring`, `/monitoring/history` |
| Shift Log | `/shift-log` |
| Reports Ringkasan / Ticket log / Monitoring log / PDF | `/reports`, `/reports/ticket-log`, `/reports/monitoring-log`, `/reports/pdf-preview` |
| Roster Table / Weekly / Monthly | `/team-roster`, `?view=weekly`, `?view=monthly` |
| Detail anggota | `/team-roster/[memberId]` |
| Runbooks SOP / Kredensial / Link / Kontak Eskalasi | `/runbooks`, `/runbooks/credentials`, `/runbooks/links`, `/runbooks/escalation` |
| Detail SOP | `/runbooks/[runbookId]` |
| Halaman penuh | `/notifications`, `/profile`, `/login` |
| Route lama yang dipertahankan | `/team`, `/about`, `/offline`, `/error`, `/error/[code]`, `/api/handovers`, `/api/handovers/[id]` |

Path/slug operasional menggunakan huruf kecil dan tanpa trailing slash. ID detail stabil di-encode, bukan nama orang. `/notifications` memang halaman penuh yang berbeda dari dropdown notifikasi.

## Query dan default

Default berikut **tidak ditulis** di URL. Urutan mengikuti urutan kolom query yang tercantum. Proyek/sistem mengikuti data klien aktif dan diserialisasi menjadi slug, contohnya `SM/ActiveMQ` → `sm-activemq`.

| Halaman | Query | Default / nilai |
|---|---|---|
| Dashboard | `chart,mom,day,line,date,project,shift,status,priority,page,size` | `stacked-project,trajectory,"",all,"",All,All,All,All,1,10`; chart alternatif `trajectory`, mom `project`; size `0/10/20/30/50/100` mengikuti kontrol lama |
| Tickets | `list,q,status,priority,project,date,type,shift,sort,page,size` | `queue,"",All,All Severities,All Projects,"",All Types,Semua Shift,newest,1,10`; status active/closed/pending/escalated; priority critical/high/medium/low; sort newest/oldest/priority/aging; size 10/30/50/100 |
| Monitoring (kedua tab) | `project,system,status,health,q,verdict,date,page,size` | proyek/sistem kosong, status `Semua` (all), health `all`, q kosong, verdict `all`, date kosong, page 1, size 10; status alternatif `needs-attention/upcoming`, health `urgent/healthy`, verdict `ok/nok` |
| Shift Log | `date,shift,page,size` | kosong/kosong/1/10; shift subuh/pagi/malam; pencarian PIC tetap lokal karena nama pribadi |
| Reports (semua tab) | `from,to,range,project,q,page` | latestDataDate−6/latestDataDate/period/all/kosong/1; tanggal YYYY-MM-DD; proyek dari data; `range=empty` hanya saat rentang dikosongkan lewat kontrol lama |
| Team Roster | `view,week,month,q,role,shift,status,page,size` | table/2026-W35/2026-08/kosong/All/All/All/1/10; size juga `all`; role operator-noc/shift-lead/incident-coordinator/l2-specialist/infrastructure-engineer; shift subuh/pagi/malam/leave; status active/on-break/off-duty/on-leave |
| Runbooks (semua tab) | `q,category,project` | kosong/All/All; kategori tervalidasi dari SOP/jenis kredensial/jenis link; proyek EPC Core, SM/ActiveMQ, B2B, USIEM, UNEM, DM, MB |
| Notifications | `q,date,status,category,sort,page,size` | kosong/kosong/all/all/newest/1/10; status unread/read; category sla/monitoring/ticket/serah-terima/temuan; sort oldest/severity |
| Login / Team publik | `next` / `from` | tujuan internal aman; next tidak valid kembali `/dashboard` |

Tanggal umum menerima tanggal tunggal, `YYYY-MM-DD..YYYY-MM-DD`, atau `today` sesuai kontrol lama. Minggu ISO dan bulan kalender divalidasi. Enum/nilai tidak valid kembali ke default; parameter asing dibuang; rentang Reports terbalik ditukar; URL dibandingkan dengan serialisasi kanonik sebelum satu `replace` sehingga tidak berulang.

Pencarian operasional seperti `aph`, `monitoring`, dan kode tiket boleh masuk `q`. Nama, email, teks catatan, kredensial, dan teks bebas tetap hanya berada di memori input serta tetap dapat menyaring data lokal. Ini penyesuaian yang diperlukan untuk memenuhi aturan privasi URL; pencarian pribadi tidak dapat dibagikan melalui URL.

Filter/search/sort/size memakai replace; pencarian debounce 300 ms. Tab/mode/minggu/halaman paginasi/detail memakai push. Perubahan query menggunakan `scroll:false`. Hook dibatasi per segmen agar halaman yang sedang keluar tidak mengkanonikalkan query halaman tujuan. Link tab Reports membawa query yang sama; seluruh pembaca dan ekspor memakai hasil parser/model Reports yang sama.

## Penyesuaian terhadap usulan

- Menambahkan path tab Tickets Escalations, Monitoring History, dan tiga tab tambahan Runbooks karena isinya memang berbeda.
- Tidak menambahkan `dir`: kontrol Tickets yang sudah ada menggabungkan arah/urutan dalam `sort=newest|oldest|priority|aging`; tidak membuat kontrol atau logika baru.
- `list=escalations` hanya menjaga asal daftar saat detail tiket dibuka dari tab Escalations, sehingga penutupan kembali ke tab dan filter semula.
- `range=empty` mempertahankan perilaku tombol hapus periode Reports: periode kosong tetap invalid dan ekspor disabled, tanpa memasukkan tanggal invalid ke URL.
- Roster memakai periode simulasi yang sudah ada, bukan menggantinya dengan tanggal hari ini: 24–30 Agustus 2026 sebenarnya **ISO W35**. Label default lama dipertahankan untuk visual. Deep link eksplisit `2026-W34` benar-benar menampilkan 17–23 Agustus. Default bulan tetap Agustus 2026.
- Detail SOP adalah ekspansi SOP pada daftar persisten, sesuai tampilan lama, bukan drawer baru.

## Struktur dan state persisten

`app/(app)/layout.tsx` memuat `AppShell`, Auth/Toast/Client/Notification provider dan data operasional. `tickets/layout.tsx`, `reports/layout.tsx`, `team-roster/layout.tsx`, `runbooks/layout.tsx` menjaga daftar/shared view tetap ter-mount ketika tab/detail berpindah. Setiap `page.tsx` adalah server wrapper tipis dengan metadata; setiap segmen mempunyai `loading.tsx`; error/not-found memakai desain error yang ada. Template animasi dipindah ke `(app)/template.tsx` sehingga animasi halaman tidak mereset shell.

Shell menyimpan tiket, verdict/catatan checkpoint, jam, data anggota, workflow handover, overlay, sidebar ciut, panel kanan, klien aktif, notifikasi, dan data provider. `activeNav` sekarang merupakan nilai turunan pathname; `setActiveNav` dan pemilih halaman berbasis state di root dihapus. Callback kompatibilitas yang tersisa hanya mengarah ke router atau membuka aksi/modal; Sidebar/mobile/tab dan navigasi yang terlihat menggunakan anchor Link.

Pola detail konsisten memakai **path + layout daftar persisten**, tanpa fallback query ID. Filter ikut dibawa saat membuka dan menutup. Data tidak ditemukan ditampilkan setelah kesiapan data client melalui modal 404 yang mempunyai fokus/Escape/tautan kembali. Runbooks SOP mempunyai readiness sendiri. Semua path detail dapat di-hard-reload.

Penyimpanan yang dipertahankan: `ctd.tickets.v4`, `ctd.checkpoints`, `ctd.acknowledged`, `ctd.sidebarCollapsed`, `ctd.shiftPanelOpen`, `ctd.activeClientId`, `ctd.notifications.v6`, `ctd.auth_token`, `ctd.auth_user`, `ctd.is_logged_out`, preferensi presence, `ctd.runbooks.sop/creds/links`, dan draft `ctd.handoverDraft.v1:<actorId>`. State edit roster tetap mengikuti perilaku lama (memori/simulasi). Tidak ditemukan preferensi page-size tersimpan yang perlu dimigrasikan.

Klien aktif tetap `ClientContext` + localStorage `ctd.activeClientId`. Pada tahap berikutnya dapat memakai slug stabil seperti `/clients/[clientId]/...` atau `?client=tritronik`, dengan validasi izin server dan URL sebagai sumber utama. Saat ini URL laporan sengaja tetap bergantung klien aktif; reproduksi lintas browser diuji dengan storageState sama.

## Redirect, loading, metadata, runtime

- `/` → `/dashboard` 307; casing/trailing slash/`/monitor`/`/reports/overview` → path kanonik 308, satu langkah termasuk gabungan kasus.
- Kompatibilitas root `?nav=...`, `?tab=...`, `?page=<label>`; Reports `?tab=summary|tickets|monitoring|preview` dan alias nama path. Fragment profile/profil serta nama halaman lama ditangani client karena hash tidak dikirim ke server.
- `proxy.ts` + fungsi bersama `canonical-route.ts`; raw Worker dan middleware Vite menjalankan fungsi yang sama sebelum normalisasi slash vinext. Ini diperlukan agar produksi `/MONITORING/` tetap satu redirect.
- `next` menolak URL eksternal, `//`, backslash, karakter kontrol, slash ter-encode berbahaya, dan loop login. Tamu logout eksplisit diarahkan ke login dan kembali ke tujuan aman.
- Metadata judul tab/detail + root template dan robots noindex/nofollow. Satu h1 per halaman; fokus heading saat halaman baru siap; detail tetap memakai pengelolaan fokus modal.
- Scroll reset antar halaman, query tidak mengubah scroll, posisi Back/Forward dipulihkan. Membuka/menutup detail mempertahankan posisi daftar.
- AppSplash awal tetap ada dan tidak muncul ulang antar route. Jam awal deterministik lalu mengikuti jam live mencegah mismatch hydration. Timer splash memakai performance.now agar tes jam beku tidak mengubah durasinya.
- vinext beta.2/Rolldown salah mengarahkan dynamic import namespace Link ke entry chunk produksi. Plugin kecil `build/vinext-navigation-compat.ts` mengubah import relatif Link menjadi namespace statis saat build, tanpa mengedit node_modules atau mengganti navigasi/prefetch. Perlu ditinjau ulang saat vinext diperbarui.
- vinext menyelesaikan SSR subtree halaman sebelum konteks client shell. RouteView menyediakan snapshot skeleton SSR/hydration yang sama, lalu memuat view client. Metadata/shell tetap SSR; isi operasional sekarang diverifikasi setelah hydration melalui Playwright, bukan melalui pencarian isi bisnis dalam HTML SSR.
- `public/favicon.ico` memuat bytes PNG ikon yang sudah ada untuk memenuhi fallback favicon browser tanpa 404.

## File dan skrip penting

- Baru: `app/(app)/**` (layout/page/loading/error/not-found), `components/routing/{AppShell,RouteView,RouteEffects}.tsx`, `hooks/useUrlQuery.ts`, `lib/{routes,query-state,canonical-route}.ts`, `proxy.ts`, `build/vinext-navigation-compat.ts`, `tests/{routing-query.test,routing-browser}.mjs`.
- Root page/layout/template, login wrapper, sidebar/mobile/nav popover, panel roster, CommandPalette, view/section filter, tabel dan link detail disesuaikan. Tidak menambah CSS atau inline style pada migrasi; perubahan CSS yang terlihat di Git sudah ada sebelumnya.
- Script npm baru: typecheck, test:routing-query, test:routing-browser. Tes rendered-html lama yang masih mengharapkan starter Sites diganti dengan tes compiled Worker untuk shell, metadata, redirect dan 404.
- URL `/` dalam tes monitoring-pending-avatar, next-checkpoint-metric, profile-rings-all-pages, roster-tim-panel, sidebar-profile-status, route-transition diubah ke `/dashboard`. Tes shift-panel-sidebar-toggle menunjuk AppShell, dan route-transition menunjuk template dalam group. Assertion lama yang mencari isi bisnis dalam SSR belum semuanya dijalankan/dikonversi; suite routing-browser menjadi verifikasi tampilan hydrated. Script `test:handover` sebelumnya menunjuk file yang tidak tersedia (`tests/handover.test.mjs`).
- Playwright/PNG/pixelmatch memakai library runtime Codex yang sudah tersedia, bukan dependency package baru. `CTD_TOOL_NODE_MODULES` dapat menunjuk runtime alternatif. `CTD_TEST_URL` memilih server; `CTD_SKIP_PIXEL=1` dan `CTD_TEST_FILTER` memilih subset.
- Produksi diuji lewat compiled Cloudflare Worker (`wrangler dev --config dist/server/wrangler.json --port 3001`) dengan salinan D1 terisolasi. Dev tetap memakai localhost:3000. StorageState identik dipetakan origin-nya saat mengganti port; jam dan timezone identik.

## Bukti visual dan keterbatasan baseline

Screenshot desktop awal ketujuh halaman valid. Capture mobile awal memiliki kesalahan pemilihan menu sehingga enam file sebenarnya menampilkan Tickets. Saya melaporkan kesalahan ini dan merekonstruksi kode awal dalam checkout sementara dari snapshot sebelum perubahan (serta HEAD untuk file yang tidak punya perubahan awal).

Rekonstruksi dibandingkan terhadap seluruh baseline desktop: enam halaman 0%, Monitoring 0,04938%. Capture mobile rekonstruksi memeriksa h1/halaman sebelum menyimpan. Mobile Tickets memakai screenshot asli; enam lainnya memakai baseline rekonstruksi. Jadi enam pembanding mobile merupakan rekonstruksi yang divalidasi, bukan capture asli sebelum migrasi. Screenshot/diff tersedia di `output/routing/{before,reconstructed,after}`; metode ada di `output/rebuild-routing-baseline.mjs` dan `output/capture-reconstructed-baseline.mjs`.

## Hasil pemeriksaan

Lint seluruh repository belum lulus: masih ada error historis unused variables, explicit any, state-in-effect, dan aksesibilitas pada komponen yang sudah ada. Tidak menonaktifkan aturan lint untuk menyembunyikannya. Snapshot aplikasi awal mempunyai 175 error; aplikasi hasil migrasi 146 error, dengan **tidak ada kenaikan jumlah error per file/rule** dari migrasi setelah perbaikan. Jumlah seluruh repository saat ini 154 error (termasuk tes/types lama). Karena itu kriteria “lint seluruh proyek lulus” belum terpenuhi.

| Pemeriksaan | Hasil |
|---|---|
| `npm test`: vinext production build + compiled Worker | Lulus; 29 route; 3/3 tes |
| `npm run typecheck` | Lulus |
| `npm run test:routing-query` | 5/5 lulus |
| `npm run test:reports` | 15/15 lulus, termasuk CSV dan PDF |
| Shift panel/sidebar regression | 1/1 lulus |
| Lint modul/route baru, Reports, Monitoring History | 0 error; 1 warning dependency memo yang sudah ada pada Monitoring History |
| Lint plugin kompatibilitas vinext (`--no-ignore`) | Lulus |
| Lint seluruh proyek | **Belum lulus: 154 error lama** |
| Playwright produksi | **36/36 lulus** |
| Hard reload | Semua 19 contoh halaman/tab/mode; sidebar, judul dan satu h1 benar |
| Sidebar SPA / history / Ctrl+klik | Lulus; identity shell/topbar tetap sama; fokus heading benar |
| Query | Lulus; invalid/default dibersihkan, idempotent, debounce replace dan pagination/mode push |
| Reports | Lulus; filter antar tab/refresh; URL ke konteks baru memberi teks UI dan bytes CSV identik |
| Detail tiket/anggota/SOP | Lulus; hard reload, ID salah, kembali ke daftar; daftar tiket tetap DOM yang sama |
| Scroll | Lulus; query tetap, path reset, Back memulihkan posisi |
| Loading lambat | Lulus; RouteProgress + skeleton terlihat, selesai; splash tidak muncul ulang; fokus heading setelah lazy load |
| Monitoring state | Lulus; OK/NOK dan dua catatan bertahan antar halaman/reload; sidebar/panel dan jam bertahan |
| Redirect/404 | Lulus di compiled Worker produksi; 307/308 satu respons; URL asing 404 |
| Login next | Lulus; logout eksplisit menuju login lalu tujuan semula; ketiga next berbahaya kembali Dashboard |
| Console/hydration | Lulus, error kosong; satu respons 404 memang tes URL asing |

| Halaman | Pixel diff 1280 | Pixel diff 390 |
|---|---:|---:|
| Dashboard | 0% | 0% |
| Tickets | 0% | 0% |
| Monitoring | 0,049744% | 0% |
| Shift Log | 0% | 0,009869% |
| Reports | 0% | 0,079740% |
| Team Roster | 0% | 0,071745% |
| Runbooks | 0% | 0,094073% |

Semua 14 pembandingan berada di bawah 0,5%. Batas keaslian baseline mobile tetap berlaku seperti dijelaskan sebelumnya. Bukti lengkap: `routing/production-verification.json`, `routing/final-browser.log`, `routing/final-build.log`, `routing/final-lint.json`, `routing/baseline-lint.json`, dan `routing/pixel-{1280,390}.json`.

## Tabel route output build

```text
Route (app)
┌ ? /
├ ? /about
├ λ /api/handovers
├ λ /api/handovers/:id
├ ? /dashboard
├ ? /error
├ ƒ /error/:code
├ ? /login
├ ? /monitoring
├ ? /monitoring/history
├ ? /notifications
├ ? /offline
├ ? /profile
├ ? /reports
├ ? /reports/monitoring-log
├ ? /reports/pdf-preview
├ ? /reports/ticket-log
├ ? /runbooks
├ ƒ /runbooks/:runbookId
├ ? /runbooks/credentials
├ ? /runbooks/escalation
├ ? /runbooks/links
├ ? /shift-log
├ ? /team
├ ? /team-roster
├ ƒ /team-roster/:memberId
├ ? /tickets
├ ƒ /tickets/:ticketId
└ ? /tickets/escalations

λ API  ƒ Dynamic  ? Unknown
```

`? Unknown` adalah keterbatasan klasifikasi static analysis vinext beta, bukan build gagal. Build juga memberi warning chunk di atas 500 kB yang melibatkan library PDF yang sudah ada.

Dev server tersedia kembali di `http://localhost:3000` melalui Vite, dengan plugin vinext yang sama. Tidak ada commit. Penghapusan rekursif snapshot rekonstruksi ditolak oleh review otomatis; `output/routing/baseline-project` dipertahankan dan junction node_modules sudah dilepas sehingga bukan tautan ke dependency checkout utama.
