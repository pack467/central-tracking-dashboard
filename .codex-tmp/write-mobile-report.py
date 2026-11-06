from pathlib import Path
import json
from datetime import date
root=Path('output/mobile-redesign').resolve()
repo=Path('.').resolve()
read=lambda f:json.loads((root/f).read_text(encoding='utf-8'))
link=lambda label,path:f'[{label}](<{Path(path).resolve().as_posix()}>)'
before=read('before-stable/audit.json')['rows']
after=read('after-final/audit.json')['rows']
for phase in ['final-mobile','final-pagination','final-dashboard']:
 if (root/phase/'audit.json').exists():
  updates={(r['width'],r['route']):r for r in read(f'{phase}/audit.json')['rows']}
  after=[updates.get((r['width'],r['route']),r) for r in after]
base390=next(r for r in before if r['width']==390 and r['route']=='/dashboard')
new390=next(r for r in after if r['width']==390 and r['route']=='/dashboard')
reduction=(1-new390['height']/base390['height'])*100
pixels=read('pixels.json')
inter=read('interactions.json')
strict=read('strict-mode.json')
quality=read('loading-quality.json')
lint=read('lint-comparison.json')
def final_phase(row):
 if row['route']=='/dashboard' and (root/f'final-dashboard/dashboard-{row["width"]}.png').exists():return 'final-dashboard'
 if row['width']<=844:return 'final-mobile'
 if row['route']=='/master-data':return 'after-masterdata-stable'
 return 'after-final'
lines=[
'# Laporan perbaikan mobile — Central Tracking Dashboard',
'',
'23 Oktober 2026 · verifikasi lokal Chrome headless · Asia/Jakarta',
'',
f'Dashboard 390×844: **{base390["height"]:,}px → {new390["height"]:,}px, turun {reduction:.2f}%**. Backend tidak diubah. Tidak ada commit, dependency baru, file CSS baru, atau publikasi.',
'',
f'{link("Sebelum, layar pertama",root/"before-top.png")} · {link("Sesudah, layar pertama",root/"after-top.png")} · {link("Grafik durasi",root/"after-chart.png")} · {link("Sheet filter",root/"filter-sheet.png")}',
'',
'## Diagnosis sebelum perubahan',
'',
'Diukur sebelum mengedit aplikasi, pada 390×844, touch, DPR 3. Nilai di bawah memakai data selesai dimuat, bukan skeleton.',
'',
'| Komponen | Temuan terukur | Penyebab | Perbaikan |',
'|---|---|---|---|',
'| Halaman | 5.982px; scrollWidth/clientWidth 390/390 | Daftar dan filter terbuka, panel bertinggi minimum desktop | Daftar ringkas; filter sheet; distribusi bertab |',
'| Tiket Hari Ini | 1.191,5px, 10 tiket per halaman | Baris bertumpuk; kontrol pagination berlapis | 5 baris, ekspansi semua 33 tiket, pagination satu baris; 592,5px |',
'| Memo | 248px | Editor penuh selalu terlihat | Preview 3 baris; View membuka editor penuh; 169px |',
'| Monitoring | 400px | Daftar panjang, footer bertumpuk | 4 baris awal, ekspansi 13 item, target OK 40px; 348px |',
'| Volume | SVG 332×220, viewBox 1040×270 | Koordinat tetap diperkecil dengan preserveAspectRatio=none | Koordinat 1:1; batang 29px; target 40px; scroll ke tanggal terbaru |',
'| Resolusi | SVG 332×220, viewBox 1050×280, font DOM 8,5–10,5px | Teks ikut diskalakan; tinggi efektif sekitar 6,7–8,3px | SVG 340×220, viewBox 340×220, font 11px |',
'| Trafik | SVG 332×220, viewBox 860×280 | Plot tetap dan ruang anotasi desktop | SVG 340×220, viewBox 340×220, tick dikurangi; tooltip sentuh |',
'| Rekap staf | Panel 580px, 14 kartu dalam area scroll | Teks mikro 7,5–10px | 3 kartu awal, avatar 32px, mini KPI sejajar, ekspansi 14 staf |',
'| Distribusi | Kategori 476,75px + severity 497,5px | Dua panel vertikal dengan layout donut desktop | Dua tab/slide lebar penuh, donut di atas; severity grid 2×2 |',
'| Tipografi/target | 288 teks <11px; 48 elemen interaktif <40px | Ukuran mikro, tombol 24–36px | Dashboard ponsel/tablet: 0 teks <11px, 0 target utama <40px |',
'',
'CSS lama berada di luar layer Tailwind. Contohnya `.page-view-enter { width:100% }`, aturan `.topbar`, header panel, dan pagination menimpa utilitas responsif. Hook kelas yang berbenturan diganti pada JSX dan gaya yang diperlukan dipertahankan lewat utilitas. Stylesheet lama bersama tidak dihapus karena masih digunakan komponen lain.',
'',
'## Keputusan implementasi',
'',
'- Navigasi: komponen BottomNav yang sudah ada tetapi belum terhubung dipakai untuk <768px, menggantikan akses drawer ponsel. Item diambil dari `app/lib/routes.ts`. Hamburger lama tetap tersedia pada 768–940px; sidebar desktop dipertahankan. Lainnya berisi Reports, Team Roster, Master Data, Runbooks, profil, serta handover.',
'- Dashboard ringkas berlaku <1024px. Pada 640–1023px, area tiket dan memo/monitoring memakai dua kolom. Filter tetap inline mulai 768px. Semua perubahan ukuran desktop >=1024px dipertahankan.',
'- Header ponsel 52px + safe-area: logo, kode klien, shift, HH:mm, refresh; transisi menjadi tombol ikon. Tanggal lengkap tersedia melalui title/aria dan Lainnya. Semua state transition diuji pada 320px.',
'- Padding ponsel <400px benar-benar 12px kiri/kanan; 400–639px 16px. Gap kartu 12px. Konten terakhir memiliki ruang bagi nav 56px, FAB 52px, dan safe-area. Area pagination menyisakan jalur 52px agar select tidak tertutup FAB.',
'- BottomSheet tunggal dipakai oleh filter, Lainnya, dan klien: portal, batas 88dvh, handle, footer, focus trap, Esc, backdrop, swipe, fokus kembali, serta penutupan saat Back. Lock scroll memakai `:has([data-sheet-open])`; memo dan detail staf memakai pola atribut yang sama.',
'- `useContainerDimensions` yang telah dipakai Panel Viewer dipakai kembali. Hook sekarang juga mengamati grafik yang baru dipasang setelah skeleton, memakai callback ref yang tetap mendukung `.current`. Tidak ada fetch tambahan.',
'- Grafik batang menggulir horizontal, membuka tanggal terbaru, dan legenda dapat menyembunyikan seri hanya pada kartu ringkas. Plot garis 220px, garis 2,5px, titik sekitar 3px radius, font 11px. Tap/drag menampilkan tooltip dengan touch-action: pan-y. MoM juga memakai koordinat 1:1.',
'- Distribusi Kategori dan Severity memakai carousel dengan tombol berlabel jelas, scroll snap, serta satu DOM untuk setiap panel. Donut kategori 150px, daftar bar satu baris; severity memakai empat kartu 2×2.',
'- Filter menggunakan kontrol dan setter yang sama. Terapkan menutup sheet; perubahan tetap diterapkan langsung sesuai perilaku desktop. Kalender inline dalam sheet, bukan popover. Chip aktif menampilkan nilai dan jumlah filter.',
'- Identitas ShellContext dipisah agar HMR tidak menggandakan provider. Animasi route memakai initial snapshot yang konsisten sehingga reduced motion tidak menimbulkan peringatan hydration.',
'',
'## Verifikasi',
'',
f'- {sum(r["pass"] for r in inter["results"])}/{len(inter["results"])} skenario interaksi lulus; {len(inter["errors"])} console/page error pada pengujian interaksi.',
'- 20 siklus buka/tutup sheet biasa dan 20 siklus memo; Esc, tombol, backdrop, geser, Tab/Shift+Tab, Back, serta wheel/keyboard setelah penutupan lulus. Tidak ada inert atau overlay tertinggal.',
f'- Probe React.StrictMode terpisah: {len(strict.get("cycles",[]))} siklus, lulus={strict.get("pass")}; tidak ada portal ganda atau lock tertinggal. Runtime Vinext App Router proyek belum membungkus seluruh aplikasi dengan StrictMode secara otomatis.',
'- Navigasi delapan halaman, deep link Panel Viewer, item aktif termasuk Lainnya, pemilih klien, ekspansi tiket/monitoring/staf, detail staf, legenda, MoM, tooltip, dan memo lulus.',
'- Filter proyek APH menghasilkan “Menampilkan 12 dari 88 Tiket” di desktop dan 12 tiket di ponsel. Reset mengembalikan parameter sesuai perilaku sebelumnya. Kalender inline terukur tidak melewati lebar sheet.',
'- Emulasi inset top 44px/bottom 34px melalui variabel geometri: header 96px; konten terakhir berada di atas nav dan FAB. Variabel produksi memakai fallback env(safe-area-inset-*). Ini emulasi geometri, bukan pengujian perangkat iOS fisik.',
f'- CLS konten Dashboard setelah splash: **{quality["loading"].get("dashboardCls",0):.6f}**. Cold start termasuk font splash: {quality["loading"]["cls"]:.6f}. Pergeseran kecil pada cold start masih berasal dari pergantian font splash; seluruh perpindahan besar skeleton telah dihilangkan.',
f'- Scroll sintetis: {quality["scroll"]["duration"]:.0f}ms; {len(quality["scroll"]["longTasks"])} long task tercatat. Penilaian jank pada perangkat fisik belum dilakukan.',
'- Typecheck dan build lulus memakai skrip proyek (vinext build). Lint penuh masih gagal: **203 error lama dan 26 warning**. Perbandingan berkas yang disentuh: '+str(lint['totalBefore'])+' error sebelum, '+str(lint['totalAfter'])+' sesudah; tidak ada error baru. Berkas hook dan sheet baru lulus lint terarah. Error lint di luar cakupan tidak diubah.',
'',
f'{link("Interaksi",root/"interactions.json")} · {link("StrictMode",root/"strict-mode.json")} · {link("Loading/scroll",root/"loading-quality.json")} · {link("Lint comparison",root/"lint-comparison.json")} · {link("Typecheck",root/"final-typecheck.log")} · {link("Build",root/"final-build.log")} · {link("Lint penuh",root/"final-lint.log")}',
'',
'### Desktop pixel comparison',
'',
'Dashboard, Tickets, Monitoring, Shift Log, Reports, Team Roster, Master Data, Runbooks diperiksa pada 1280, 1440, 1920px. Ukuran screenshot sebelum/sesudah sama. Tabel memakai persen piksel yang berubah lebih dari 16/255 pada satu kanal untuk mengabaikan noise raster; kolom raw tetap disimpan dalam JSON.',
'',
'| Halaman | 1280 | 1440 | 1920 |',
'|---|---:|---:|---:|',
]
for route in ['dashboard','tickets','monitoring','shift-log','reports','team-roster','master-data','runbooks']:
 vals=[next(p for p in pixels if p['route']==route and p['width']==w) for w in [1280,1440,1920]]
 lines.append('| '+route+' | '+' | '.join(f'{v.get("tolerance16Percent",999):.5f}%' for v in vals)+' |')
noise=[p for p in pixels if p.get('exactPercent',0)>.5]
lines+=['',f'Raw Dashboard: '+', '.join(f'{p["width"]}: {p["exactPercent"]:.5f}%' for p in pixels if p['route']=='dashboard')+'.']
if noise:lines+=['Raw tanpa toleransi melewati 0,5% pada sampel Master Data 1280px: perubahan hanya 1–2 tingkat RGB pada raster kartu. Tidak ada perubahan geometri atau kode halaman Master Data. Jadi klaim <0,5% untuk seluruh halaman berlaku pada metrik bertoleransi di atas, bukan metrik raw nol toleransi.']
lines+=['',link('Seluruh nilai pixel comparison',root/'pixels.json'),'', '## Audit halaman lain — hanya dilaporkan','', '| Halaman (390px) | Teks <11px | Target <40px | Temuan dan saran |','|---|---:|---:|---|']
suggestions={
'/tickets':'TicketsView/TicketTable: New Ticket 36px, tab daftar/escalation 37px, metadata 9–10px. Naikkan target ke 40–44px; ringkas kartu dan toolbar.',
'/monitoring':'MonitoringView: tab status 24px, Guide 34px, metadata checkpoint kecil. Perbesar tab, sederhanakan label, pertahankan scroll lokal bila tabel melebar.',
'/shift-log':'ShiftLogView: date/select 38px, 31 target kecil, halaman panjang. Ringkas filter dalam sheet/accordion; metadata minimal 11px.',
'/reports':'ReportsView: tab 36px; label KPI dan ringkasan masih kecil. Naikkan target tab, gunakan legenda ringkas dan chart terukur saat pengerjaan terpisah.',
'/team-roster':'TeamRosterView/RosterTable: Shift Swaps dan Tambah Anggota 36px, pencarian 38px, role/status kecil. Naikkan area sentuh; buat kartu staf lebih ringkas.',
'/master-data':'MasterDataView: breadcrumb sekitar 17px tinggi, search/select 36px, metadata kecil. Perbesar area klik dan kontrol; padatkan kartu daftar.',
'/runbooks':'RunbooksView: tab sekitar 31px, counter/metadata kecil. Gunakan tab 40–44px dengan scroll lokal dan teks sekunder 11px.',
}
for r in after:
 if r['width']==390 and r['route'] in suggestions:
  lines.append(f'| {r["route"]} | {len(r["smallText"])} | {len(r["smallTargets"])} | {suggestions[r["route"]]} |')
lines+=['', 'Semua halaman audit memiliki scrollWidth = clientWidth = 390px. Tidak ditemukan overflow horizontal pada dokumen. Ruang nav/FAB berasal dari kerangka bersama; konten terakhir dapat digulir ke atas keduanya. Daftar isu di atas tidak diperbaiki pada komponen halaman. Scroll lokal pada tab/tabel dipertahankan. Audit ini mencakup tampilan awal, bukan seluruh alur CRUD.', '', '## File yang diubah', '']
changed=[]
for f in (root/'source-before').rglob('*'):
 if f.is_file():
  rel=f.relative_to(root/'source-before'); current=repo/'frontend'/rel
  if current.exists() and f.read_text(encoding='utf-8')!=current.read_text(encoding='utf-8'):changed.append(current)
changed += [repo/'frontend/app/hooks/useMobileLayout.ts',repo/'frontend/app/context/ShellContext.ts']
for f in sorted(set(changed)):lines.append('- '+link(str(f.relative_to(repo)),f))
lines+=['','Semua perubahan aplikasi berada di frontend. Script QA dan bukti ada di `.codex-tmp/` serta `output/mobile-redesign/`. Perubahan pengguna yang sudah ada dipertahankan.','','## Teks mobile baru','','Dashboard; Filter; Ubah; Reset; Terapkan; Lainnya; Pilih klien; Filter analitik; Lihat semua (n); Ringkas; Vol; MoM; Volume Tiket; Tiket MoM; Tren Durasi; Tren Trafik; Distribusi Kategori; Distribusi Severity; Kategori; Severity; 10/hal.; 15/hal.; 25/hal.; n tiket; n filter; kode klien; HH:mm. String panjang desktop tetap disimpan.','','## Screenshot dan matriks viewport','','Semua ukuran dalam CSS pixel; touch dan DPR 3 untuk lebar <=844px, DPR 1 untuk desktop.','','| Viewport | Tinggi sebelum → sesudah | ScrollWidth/clientWidth | Sebelum | Sesudah |','|---|---:|---|---|---|']
for b in before:
 if b['route']!='/dashboard':continue
 a=next(r for r in after if r['route']=='/dashboard' and r['width']==b['width'])
 width=b['width']
 height=dict([(320,568),(360,740),(375,667),(390,844),(412,915),(430,932),(768,1024),(844,390),(1024,768),(1280,800),(1440,900),(1920,1080)])[width]
 bp=root/'before-stable'/f'dashboard-{width}.png'
 ap=root/final_phase(a)/f'dashboard-{width}.png'
 lines.append(f'| {width}×{height} | {b["height"]} → {a["height"]}px | {a["scrollWidth"]}/{a["clientWidth"]} | {link("PNG",bp)} | {link("PNG",ap)} |')
lines+=['','Screenshot halaman lain:','']
for width in [390,1280,1440,1920]:
 lines.append(f'### {width}px')
 lines.append('')
 for r in after:
  if r['width']!=width or r['route']=='/dashboard':continue
  name=r['route'][1:];bp='before-shiftlog' if name=='shift-log' else 'before-masterdata-stable' if name=='master-data' and width>=1280 else 'before-stable'
  lines.append(f'- {name}: '+link('sebelum',root/f'{bp}/{name}-{width}.png')+' · '+link('sesudah',root/f'{final_phase(r)}/{name}-{width}.png'))
 lines.append('')
lines+=['Tahapan:', '', '- '+link('Tahap 1 — kerangka',root/'stage1/dashboard-390.png'),'- '+link('Tahap 2 — Dashboard',root/'stage2/dashboard-390.png'),'- '+link('Tahap 3 — audit DOM lengkap',root/'final-mobile/audit.json'),'','Batas verifikasi yang tersisa: lint proyek belum bersih; cold-start font splash tidak persis CLS 0; pixel raw Master Data memiliki noise 1–2 RGB; perangkat fisik belum diuji.']
(root/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(root/'REPORT.md')
