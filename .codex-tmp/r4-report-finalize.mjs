import {readFileSync,writeFileSync,existsSync} from 'node:fs';import {resolve} from 'node:path';
const root='output/mobile-round4/',audit=JSON.parse(readFileSync(root+'source-audit.json','utf8')),path=root+'REPORT.md';
let report=readFileSync(path,'utf8');const marker='<!-- implementation-files -->';report=report.split(marker)[0];
const purposes={
 'MemoPreview.tsx':'Pratinjau 176px, daftar bullet, pengukuran clipping dan kondisi kosong.',
 'CategoryDistributionView.tsx':'Grid viewer, statistik, daftar kategori yang mengisi tinggi dan sorotan.',
 'DistributionDonut.tsx':'Baru: donut terukur, legenda, stat dan interaksi bersama khusus viewer.',
 'PanelViewer.tsx':'Wadah min-w-0, header mobile, fokus dan dukungan modal Detail bersarang.',
 'SeverityDistributionView.tsx':'Grid viewer, kartu 2×2, rasio dan tabel severity.',
 'UserRecapMobile.tsx':'Baru: daftar staf mobile, ekspansi, footer dan deteksi keyboard.',
 'UserRecapView.tsx':'Cabang mobile memakai data/sort yang sama; tabel desktop dipertahankan.',
 'HandoverHistoryControls.tsx':'Migrasi ikon filter luar ke prop icon.',
 'HandoverWizard.tsx':'Migrasi ikon filter luar ke prop icon.',
 'ClientSwitcher.tsx':'Ruang kode klien, ikon dan chevron di mobile.',
 'ReportPdfPreview.tsx':'Migrasi ikon filter luar ke prop icon.',
 'TicketReportView.tsx':'Ikon filter, ringkasan Shifter, NOK UI/ARIA, urutan mobile dan pager.',
 'DatePicker.tsx':'Struktur flex kalender–nilai–chevron dan geometri kontrol bersama.',
 'select-styles.ts':'Ukuran, font, padding, warna, focus dan state bersama.',
 'Select.tsx':'Struktur single/multi-select serta normalisasi override geometri pemanggil.',
 'DashboardSkeleton.tsx':'Urutan dan ukuran placeholder Memo/Monitoring mobile.',
 'NotificationsView.tsx':'Migrasi ikon filter luar ke prop icon.',
 'ReportsView.tsx':'Migrasi ikon; hapus override important DatePicker khusus Reports.',
 'TeamRosterView.tsx':'Migrasi ikon filter luar ke prop icon.',
 'TicketsView.tsx':'Migrasi ikon filter luar ke prop icon.',
 'useMobileLayout.ts':'Breakpoint narrow touch khusus pemilihan tampilan Rekap.'
};
report+=marker+'\n\n| File | Perubahan |\n| --- | --- |\n'+audit.changed.map(c=>'| ['+c.file+'](../../'+c.file+') | '+purposes[c.file.split('/').at(-1)]+' |').join('\n')+'\n';
if(existsSync(root+'exit-tests.json')){const exits=JSON.parse(readFileSync(root+'exit-tests.json','utf8'));if(exits.rows.length===16&&!exits.errors.length)report+='\nTambahan verifikasi keluar viewer: 16 kombinasi mobile/desktop, kategori/Rekap, Escape/kembali/tutup/browser Back lulus. Pada halaman yang memiliki overflow dokumen, roda dan PageDown bekerja; delapan kasus mobile juga lulus gestur sentuh. Halaman Tiket desktop yang dituju oleh Back muat dalam viewport, sehingga pergerakan scroll dokumen tidak berlaku pada dua kasus itu. Overflow html/body pulih, inert 0, aria-hidden pada app-root tidak tertinggal. Browser Back mengikuti perilaku URL replace yang sudah ada dan kembali ke halaman atau filter sebelumnya, bukan menambah riwayat panel baru. [Hasil](exit-tests.json).\n';}
report=report.replace(/<([a-zA-Z][a-zA-Z -]*)>/g,'&lt;$1&gt;');writeFileSync(path,report);
const links=[...report.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]);const missing=links.filter(link=>!existsSync(resolve(root,link)));console.log(JSON.stringify({files:audit.changed.length,links:links.length,missing},null,2));if(missing.length)process.exitCode=1;
