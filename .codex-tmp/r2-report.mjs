import {readFileSync,writeFileSync} from 'node:fs';import {resolve,join} from 'node:path';
const root=resolve('output/mobile-round2');
const read=name=>JSON.parse(readFileSync(join(root,name),'utf8'));
const before=read('before/audit.json'),after=read('delivery/audit.json'),pixels=read('delivery/pixels.json');
const interactions=read('interactions.json'),strict=read('strict-mode.json'),loading=read('loading-quality.json'),scrollModes=read('scroll-modes.json');
const baselineLint=read('baseline-lint.json'),finalLint=read('final-lint.json');
const count=(data,key)=>data.reduce((n,r)=>n+r[key],0);
const signatures=data=>data.flatMap(row=>row.messages.filter(m=>m.severity===2).map(m=>row.filePath+'|'+m.ruleId+'|'+m.message.split('\n')[0].replace(/\(at line \d+\)/g,'(at line #)')));
const old=signatures(baselineLint),remaining=[...old],added=[];
for(const item of signatures(finalLint)){const index=remaining.indexOf(item);if(index<0)added.push(item);else remaining.splice(index,1);}
const checks={baselineErrors:count(baselineLint,'errorCount'),finalErrors:count(finalLint,'errorCount'),baselineWarnings:count(baselineLint,'warningCount'),finalWarnings:count(finalLint,'warningCount'),newErrors:added,removedErrors:remaining,interactionsPassed:interactions.results.filter(r=>r.pass).length,interactionsTotal:interactions.results.length,strictModeCycles:strict.cycles.length,scrollModes,browserErrors:after.errors,cls:loading.quality.cls,dashboardCls:loading.quality.dashboardCls,pixels};
writeFileSync(join(root,'checks.json'),JSON.stringify(checks,null,2));
const fileLink=(label,path)=>`[${label}](<${resolve(path).replaceAll('\\','/')}>)`;
const link=(label,path)=>fileLink(label,join(root,path));
const clean=text=>(text??'').replaceAll('|',' / ').replaceAll('\n',' ').replace(/\s+/g,' ').trim();
const table=(heads,rows)=>['| '+heads.join(' | ')+' |','| '+heads.map(()=> '---').join(' | ')+' |',...rows.map(row=>'| '+row.join(' | ')+' |')].join('\n');
const dashboards=after.rows.filter(r=>r.route==='/dashboard');
const phone=after.rows.find(r=>r.route==='/dashboard'&&r.width===390);
const metricRows=dashboards.map(row=>{const old=before.rows.find(b=>b.route===row.route&&b.width===row.width);return [`${row.width}×${row.height}`,old.height,row.height,row.grids[0].columns,row.width<1024?row.smallText.length:'desktop dipertahankan',`${row.width===row.clientWidth?'0':'ADA'}px`,link('Sebelum',`before/dashboard-${row.width}.png`)+' · '+link('Sesudah',`delivery/dashboard-${row.width}.png`)];});
const suggestions={
 '/tickets':'Eyebrow, label KPI, kategori/severity masih 9–10px. Tombol New Ticket 36px, tab 37px, filter 32px. Chip status bergeser secara internal. Naikkan label ≥11px dan kontrol ≥40/44px pada tugas halaman Tickets tersendiri.',
 '/monitoring':'Label status/metadata sekitar 10px; tab filter 24px dan tombol Guide 34px. Deretan sistem bergeser secara internal. Gunakan filter 40px dan label ≥11px; rapikan tinggi kartu checkpoint.',
 '/shift-log':'Label tanggal/shift/shifter 10–10,5px, filter 38px dan tombol detail sekitar 28,5px. Daftar panjang menambah tinggi halaman. Gunakan label 11px, tombol 40/44px, dan ringkasan bertahap.',
 '/reports':'Label KPI/tabel masih kecil; tab 36px. Tabel rekap mempunyai scroll internal yang memang dibutuhkan. Gunakan tab 44px, header tabel 11px, dan prioritas kolom atau kartu ringkas.',
 '/team-roster':'Eyebrow, statistik dan metadata jadwal masih kecil; aksi anggota/shift di bawah 40px. Gunakan kartu anggota dengan nama penuh dan aksi 44px; batasi kolom jadwal saat sempit.',
 '/master-data':'Label 10–10,5px, breadcrumb sekitar 17px tinggi, pencarian/select 36px, tombol ikon 27px. Tab internal sekitar 641px pada viewport 390px. Gunakan tab 44px dengan petunjuk geser dan tombol ikon 40px.',
 '/runbooks':'Label kategori, metadata dan kontrol tab/aksi kecil tetap berasal dari halaman Runbooks. Naikkan label ≥11px serta tab/aksi 40/44px; cek judul panjang di kartu SOP.',
};
const otherRows=after.rows.filter(r=>r.width===390&&r.route!=='/dashboard').map(r=>[r.route,r.height,r.smallText.length,r.smallTargets.length,r.width===r.clientWidth?'Tidak':'Ada',suggestions[r.route],link('Screenshot',`delivery/${r.route.slice(1)}-390.png`)]);
const ellipsis=after.rows.filter(r=>r.route==='/dashboard'&&r.width<768).flatMap(r=>r.ellipsis.map(e=>[`${r.width}px`,clean(e.text),clean(e.title)||'View membuka memo penuh']));
const pixelRows=pixels.map(p=>[p.width,p.exactPercent.toFixed(6)+'%',p.tolerance1Percent.toFixed(6)+'%',p.tolerance2Percent.toFixed(6)+'%',p.maxChannelDifference,p.before.join('×')+' → '+p.after.join('×')]);
const files=[
 ['frontend/app/components/tickets/TicketReportView.tsx','Grid compact, ritme, daftar, pagination, grafik, tab dan ARIA.'],
 ['frontend/app/hooks/useScrollEdges.ts','ResizeObserver dan petunjuk fade sesuai arah yang masih dapat digeser.'],
 ['frontend/app/components/ui/HorizontalScroll.tsx','Scroll native tanpa scrollbar untuk legenda dan chip staf.'],
 ['frontend/app/lib/chart-layout.ts','Penjepitan dan penghindaran tabrakan label di plot.'],
 ['frontend/app/hooks/useMobileChrome.ts','Arah gulir, idle, visualViewport, fokus input, cleanup timer/listener.'],
 ['frontend/app/components/routing/AppShell.tsx','Padding 12/16px, ruang aman bawah, menghubungkan state chrome.'],
 ['frontend/app/components/layout/BottomNav.tsx','Jarak 8px, badge, keyboard, landscape singkat tanpa label.'],
 ['frontend/app/components/ui/FloatingNewTicketButton.tsx','Transisi arah gulir 200ms, tampil saat fokus, reduced motion.'],
 ['frontend/app/components/layout/Topbar.tsx','Slot shift/jam mobile berukuran tetap untuk mengurangi pergeseran.'],
 ['frontend/app/layout.tsx','Pressed state, touch manipulation, tap highlight transparan dan outline keyboard 2px, termasuk portal.'],
 ['frontend/app/components/ui/skeleton/DashboardSkeleton.tsx','Bentuk lima baris dan dimensi compact mengikuti panel baru.'],
 ['frontend/app/components/ui/skeleton/PanelSkeletonWrapper.tsx','Loading height responsif tanpa menambah inline layout baru.'],
 ['frontend/app/components/dashboard/MemoModal.tsx','Lifecycle fokus stabil saat parent merender ulang dan focus return tanpa scroll.'],
 ['frontend/app/components/dashboard/panel-viewer/PanelViewer.tsx','Lifecycle fokus viewer stabil dan cleanup saat ditutup.'],
 ['frontend/app/styles/tailwind/responsive.css','Hanya menghapus aturan padding dan hidden annotation yang sudah digantikan; tidak menambah CSS.'],
 ['frontend/tests/mobile-chart-layout.test.mjs','Tiga pengujian batas plot dan tabrakan label.'],
];
let report=`# Mobile Dashboard — putaran kedua

Implementasi lokal pada 26 Oktober 2026. Tidak ada commit, dependency baru, file CSS baru, perubahan seed/data, rumus KPI, filter global atau skema URL. Perubahan lokal milik pengguna yang sudah ada dipertahankan. Runtime proyek adalah Vinext dengan struktur Next.js App Router, React dan TypeScript.

Pengujian memakai Chrome headless, zona Asia/Jakarta, waktu tetap 26 Oktober 2026 pukul 20.17 WIB untuk pasangan screenshot. DPR 3 dan touch pada lebar ≤844px; DPR 1 untuk desktop. Screenshot disimpan dalam piksel CSS. Data fixture yang tampil tetap 88 tiket analitik dan 33 tiket pada panel hari ini.

## Diagnosis sebelum perubahan

- Dugaan dua kolom pada 412px tidak terkonfirmasi pada source yang ada saat tugas dimulai. Pada 360/390/412/430px, kartu sudah satu kolom dengan lebar **336/366/380/398px**. Dua kolom muncul pada 768/844px: **356+356 / 394+394px**, akibat kelas **sm:max-lg:grid-cols-2**. Kelas itu dihapus; satu kolom dipakai hingga 1023px. Desktop ≥1024px tetap memakai aturan awal. DOM tetap Tiket → Memo → Monitoring, tanpa CSS order.
- Tinggi baseline pada 390px: Tiket **592,5px**, memo **169px**, monitoring **348px**, Volume **378px**, staf **467px**. Tinggi Dashboard **3.845px**. Tidak ada font terlihat <11px di Dashboard baseline; dugaan ini memang tidak dibenarkan dengan mengubah seluruh font secara membabi buta.
- Volume: sumbu Y berada di SVG yang sama dengan plot geser. Ketika scroll dimulai pada tanggal terbaru, label di x≈38 ikut keluar layar. Wrapper lama setinggi 220px mempunyai scrollbar horizontal; label baseline+22 hampir menyentuh dasar SVG. Ruang label berkurang lagi oleh scrollbar native. Perbaikan memisahkan kolom sumbu 36px dari scroll dan memberi plot 252px serta margin bawah 36px.
- Skala lama berasal dari computeYTicks: puncak 44 dibulatkan ke **60**, bukan dikunci tepat 44. Tanggal akhir hanya 1–5 tiket sehingga banyak area kosong tetap wajar karena puncak berada di sebelah kiri, di luar viewport. Kini batas atas **49** untuk puncak 44, dengan 5 tick integer dan tanda minimum 6px untuk total positif yang sangat kecil. Data dan perbandingan antarseri tidak dinormalisasi diam-diam.
- Legenda sistem dan chip staf mempunyai overflow horizontal native. Scrollbar disembunyikan melalui utilitas; fade muncul hanya pada sisi yang masih dapat digeser. Simbol kecil di sisi chip merupakan bagian scrollbar browser, bukan ikon aplikasi yang perlu digandakan.
- Paginasi mobile memiliki **padding-right 52px**. Padding itu dihapus. Margin vertikal Filter 6px membuat celah nyata **18px** meski parent gap 12px; kini margin mobile nol sehingga celah nyata 12px.
- Anotasi Trafik sebelumnya justru disembunyikan pada telepon oleh CSS lama. Perhitungan desktop menjepit pusat anotasi ke 6–94%, tanpa memperhitungkan lebarnya. Anotasi mobile sekarang bertuliskan singkat **Lonjakan 25**, dengan lebar penuh diperhitungkan ketika dijepit.
- FAB 52×52px sebelumnya tidak membaca arah gulir. Sekarang memakai scroll pasif, requestAnimationFrame, idle 700ms dan transisi translate/opacity 200ms. Fokus keyboard memunculkannya kembali.

## Hasil implementasi

Panel compact memakai padding isi 14px, judul 15px semibold, isi 13px, teks sekunder minimal 11px, gap antarbagian 12px. Tiket menampilkan 5 baris seragam **84px**, lalu tombol 44px dan paginasi satu baris. Memo tetap pratinjau tiga baris dengan View. Monitoring menampilkan 5 check, judul panel lengkap, status 56×40px, penanda NOK merah 3px dan ringkasan satu baris.

Grafik garis menggunakan ukuran wadah dari ResizeObserver. Label ambang Target 60m/Breach 90m masuk ke plot; label max/min mencoba posisi di atas/bawah titik dan sisi plot, lalu menghindari garis, label SLA dan satu sama lain. Bila tidak ada tempat, label tambahan dilewati. Tooltip 220px dijepit ke lebar wadah dan layar; anotasi disembunyikan selama tooltip aktif. Target aktif tetap dapat diperiksa dengan touch dan panah keyboard, Home, End, Escape.

Volume memiliki kolom sumbu tetap 36px, plot 252px, area tanggal native horizontal dan awal di tanggal terbaru. Kolom diberi jarak sekitar 52px untuk target 44px dan sela sekitar 8px, dengan batang ≥24px. Total hanya ditampilkan pada puncak dan titik akhir pada compact. Legenda sistem tetap mengubah visibilitas seri di grafik itu saja.

Kategori memakai donut sekitar 140px di atas daftar baris 36px bila kartu <440px, dan berdampingan bila cukup lebar. Severity memakai empat kartu 2×2 dengan tinggi 108px. Tab dua sel 44px hanya menampilkan panel compact aktif, sehingga tinggi panel lain tidak meninggalkan ruang kosong. Kartu staf memakai avatar 32px, angka mono 16px, tiga kolom KPI, chip geser serta satu area kartu untuk membuka Detail.

Bottom nav memakai sela 8px, item minimal 56px lebar, tinggi bar 56px ditambah border/safe-area. Landscape pendek memakai isi 44px tanpa label. Saat input aktif dan visualViewport berkurang >max(140px,20%), nav dan FAB disembunyikan. Padding/spacer bawah menyediakan ruang aman terakhir. Pada uji dasar halaman, legenda berakhir sekitar y=${Math.round(interactions.results.find(r=>r.name.startsWith('FAB direction'))?.detail.last.bottom??0)}, sedangkan FAB mulai sekitar y=${Math.round(interactions.results.find(r=>r.name.startsWith('FAB direction'))?.detail.fab.top??0)}; tidak ada tumpang tindih.

Semua feedback sentuh memakai active background #243044, skala 0,98, highlight browser transparan, touch manipulation, dan outline keyboard solid 2px. Reduced motion mematikan transition-property; nilai duration yang masih tersimpan tidak menghasilkan animasi.

## Matriks viewport dan screenshot

${table(['Viewport','Tinggi sebelum','Tinggi sesudah','Kolom atas sesudah','Teks <11px','Overflow halaman','Screenshot'],metricRows)}

Pada 390px, tinggi bertambah **${phone.height-before.rows.find(r=>r.route==='/dashboard'&&r.width===390).height}px** untuk kontrol 44px, lima check monitoring, KPI staf yang terbaca dan daftar kategori 36px. Peningkatan tinggi berasal dari isi dan kontrol, bukan kolom kosong yang dipaksa setinggi tetangganya.

## Perbandingan desktop

${table(['Lebar','Raw: setiap beda kanal','Beda kanal >1/255','Beda kanal >2/255','Maks. beda kanal','Dimensi'],pixelRows)}

Perubahan bermakna pada toleransi 2/255 berada di bawah batas 0,5%. **Pembacaan raw harus dibedakan dari itu:** pada 1920px, dithering/rasterisasi SVG dapat membuat raw melebihi 0,5%, meski hampir seluruhnya hanya beda 1–2 tingkat kanal dan geometri/panel sama. Jika kriteria ditafsirkan raw tanpa toleransi sedikit pun, hasil 1920px belum dapat disebut lulus secara literal. PNG diff dan angka lengkap tersedia di ${link('pixels.json','delivery/pixels.json')}.

## Audit halaman lain — laporan saja, 390px

Hitungan berasal dari elemen terlihat dengan teks langsung dan ukuran komputasi; target kecil adalah elemen interaktif yang salah satu sisinya <40px. Jumlah elemen bukan jumlah masalah yang unik. Screenshot diambil setelah loading halaman selesai. Capture diagnosis awal beberapa halaman masih dapat menangkap skeleton; karena itu angka skeleton awal tidak dipakai sebagai pembanding klaim perbaikan isi halaman lain.

${table(['Halaman','Tinggi px','Teks <11px','Target <40px','Overflow halaman','Temuan dan saran','Bukti'],otherRows)}

Tidak ada overflow horizontal **halaman** pada tujuh halaman ini. Scroll tabel/chip internal dicatat sebagai scroll internal, bukan overflow body. Bottom nav, ruang aman FAB, pressed/focus dan deteksi keyboard berasal dari shell bersama; isi halaman tersebut tidak dirombak. Daftar panjang/tabel di Shift Log, Reports dan Master Data masih membutuhkan pekerjaan halaman tersendiri agar mengikuti tipografi Dashboard.

## Ellipsis / clamp yang disengaja

Judul panel terlihat utuh. Judul tiket tetap line-clamp dua baris dengan title penuh; meta memiliki title kategori dan nama. Monitoring tetap satu baris truncate sesuai permintaan, dengan title tugas penuh dan catatan NOK, serta aria-label tombol status yang juga menyebut tugas lengkap. Nama/jabatan staf mempunyai title dan membuka Detail lewat kartu. Memo mempunyai title penuh dan tombol View.

Elemen yang benar-benar terpotong pada pengukuran tiap telepon:

${table(['Viewport','Teks/komponen','Nilai penuh / akses'],ellipsis)}

## Verifikasi dan batas hasil

- Typecheck dan build akhir lulus: ${link('typecheck','final-typecheck.log')} · ${link('build','final-build.log')}.
- Lint penuh **belum lulus**: baseline ${checks.baselineErrors} error / ${checks.baselineWarnings} warning; akhir ${checks.finalErrors} error / ${checks.finalWarnings} warning. Error baru menurut perbandingan file/rule/pesan tanpa nomor baris: **${added.length}**. Tidak ada penonaktifan aturan lint. ${link('Perbandingan','checks.json')} · ${link('lint lengkap','final-lint.json')}.
- Tiga tes geometri lulus, termasuk semua sudut plot, tabrakan label SLA dan ruang yang tidak cukup: ${link('hasil','geometry-tests.log')}.
- ${checks.interactionsPassed}/${checks.interactionsTotal} kelompok pengujian browser lulus: scroll horizontal touch native, sumbu tetap, isolasi legenda, tooltip kedua tepi, keyboard grafik, segmented/tab, FAB arah/idle/fokus, visualViewport, pressed/focus/reduced motion dan landscape. ${link('interaksi','interactions.json')}.
- 20 siklus sheet cepat dan 20 siklus memo berhasil; viewer dan detail staf juga ditutup tanpa sisa overflow hidden, inert, aria-hidden atau overlay. StrictMode: **${strict.cycles.length} siklus lulus**. ${link('StrictMode','strict-mode.json')}.
- Tidak ada console error/hydration error baru pada capture browser akhir (${after.errors.length} tercatat). Tidak ada fetch tambahan yang ditambahkan.
- Tinggi wrapper skeleton → konten sama pada 390px: ${loading.after.panels.map((p,i)=>clean(p.title).split('Distribusi Kategori /')[0]+' '+loading.before.panels[i].wrapper+'→'+p.wrapper+'px').join('; ')}.
- **CLS nol literal belum tercapai.** Total cold load yang tercatat ${loading.quality.cls}; setelah splash ${loading.quality.dashboardCls}. Sisa berasal dari raster/metric teks pada startup, bukan perbedaan tinggi wrapper panel. Hasil scroll mencatat ${loading.scrollLongTasks.length} long task pada satu run development ini; ini bukan jaminan kinerja perangkat fisik. ${link('pengukuran loading dan scroll','loading-quality.json')} · ${link('skeleton','loading-390.png')}.
- **Pengecualian 320px:** padding halaman 12px membuat kartu 296px dan isi 268px; persyaratan isi/kartu ≥300px bersamaan dengan padding tersebut tidak mungkin dipenuhi. Tidak dipaksakan min-width yang menimbulkan scroll halaman.
- Target sekunder: status monitoring 56×40px, legenda 40px, segmented 40px, topbar 40px. Legenda sengaja 40px, melebihi tinggi 32–36px pada spesifikasi grafik, untuk memenuhi batas target sekunder. Landscape nav 44px adalah pengecualian yang diminta.
- Grafik garis memakai touch-action pan-y. **Pengecualian Volume:** scroll native horizontal harus mengizinkan pan-x dan pan-y (touch auto/manipulation), sehingga plot dapat digeser tanpa mengunci scroll vertikal halaman; memaksa pan-y di kolom batang akan mematikan swipe horizontal. Pengujian CDP touch membuktikan scroll horizontal bekerja.
- Font kecil desktop dan target desktop dipertahankan untuk memenuhi batas perubahan desktop. Audit desktop mencatat 286 elemen teks <11px pada Dashboard; itu tidak dipromosikan menjadi perubahan desktop di tugas ini.

## Teks mobile baru

- Segmented: **Semua / Pagi / Malam / Subuh**, menggantikan prefiks Shift yang berulang pada compact. Teks desktop tetap lengkap.
- Anotasi **Lonjakan {jumlah}**; label **Target 60m** dan **Breach 90m** kini terlihat di plot mobile.
- ARIA grafik: instruksi panah kiri/kanan untuk rincian dan label area Volume yang menjelaskan geser tanggal. Label dan hitungan lain mengikuti data/perilaku yang sudah ada.

## File implementasi

${table(['File','Perubahan'],files.map(([path,description])=>[fileLink(path,path),description]))}

Source QA dan semua bukti disimpan di output/mobile-round2 dan .codex-tmp/r2-*. Tidak ada commit, publish atau perubahan backend.
`;
report=report.replace('dugaan ini memang tidak dibenarkan dengan mengubah seluruh font secara membabi buta.','perubahan difokuskan pada hierarki dan keterbacaan.').replace('Data dan perbandingan antarseri tidak dinormalisasi diam-diam.','Skala tetap linear dan menggunakan nilai data asli.');
report+=`\n## Bukti tambahan\n\nSwipe turun menutup sheet; sesudahnya PageDown menggulir ke y=${scrollModes.keyboardY} dan gesture sentuh ke y=${scrollModes.touchY}, tanpa overflow lock atau inert tersisa. ${link('Pengujian scroll keyboard/touch','scroll-modes.json')}.\n\nTahap 1: ${link('screenshot 390px','stage1/dashboard-390.png')} · ${link('typecheck','stage1-typecheck.log')} · ${link('lint','stage1-lint.json')} · ${link('build','stage1-build.log')}.\n\nTahap 2: ${link('screenshot 390px','stage2/dashboard-390.png')} · ${link('typecheck','stage2-typecheck.log')} · ${link('lint','stage2-lint.json')} · ${link('build','stage2-build.log')}.\n\nTahap 3: ${link('screenshot 390px','after/dashboard-390.png')} · ${link('typecheck','stage3-typecheck.log')} · ${link('lint','stage3-lint.json')} · ${link('build','stage3-build.log')}.\n\nTahap 4/akhir: ${link('screenshot 390px','delivery/dashboard-390.png')} · ${link('typecheck','final-typecheck.log')} · ${link('lint','final-lint.json')} · ${link('build','final-build.log')}. Kegagalan lint sementara selama iterasi telah dibandingkan dengan baseline; hasil akhir tidak menambah error maupun warning.\n`;
writeFileSync(join(root,'REPORT.md'),report);
console.log(JSON.stringify({report:join(root,'REPORT.md'),...checks,pixels:undefined,browserErrors:after.errors.length},null,2));
