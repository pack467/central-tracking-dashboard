from pathlib import Path
from pypdf import PdfReader
from PIL import Image
from zipfile import ZipFile
from collections import Counter
import pypdfium2 as pdfium,json,hashlib
rows=json.loads(Path('.codex-tmp/reports-v2/word-tables.json').read_text(encoding='utf8'));f=json.loads(Path('frontend/.report-qa/word-week39.json').read_text(encoding='utf8'))
ref=Path('frontend/public/reports/laporan-serah-terima-2026-39.pdf');r=PdfReader(ref)
print('reference pages',len(r.pages))
pages=set([0,1,2,len(r.pages)-1]);sections={}
for i,page in enumerate(r.pages):
 text=page.extract_text()
 for needle in ['Ticket log','Tiket di minggu ini','Monitoring Log','DISUSUN OLEH']:
  if needle in text:sections.setdefault(needle,[]).append(i+1);pages.add(i)
print('sections',sections)
render=pdfium.PdfDocument(ref)
for n in sorted(pages):
 im=render[n].render(scale=1.4).to_pil();im.save(f'.codex-tmp/reports-v2/word-reference-{n+1}.png')
print('rendered reference pages',sorted(x+1 for x in pages))
current=pdfium.PdfDocument(r'C:\Users\GALIH\Downloads\[2026-36] Laporan Serah Terima Kerja Mingguan - ttn - 2026-09-05_2026-09-11 (2).pdf')
for n in [0,1,2,4,5]:current[n].render(scale=1.4).to_pil().save(f'.codex-tmp/reports-v2/current-week36-{n+1}.png')
counter=Counter(t['sourceCells'][8].strip() for t in f['tickets']);print('actual categories',counter)
origrows=rows[1][1:-1];print('category stated totals',sum(int(x[-1].strip())for x in origrows),'matrix cells total',sum(int(c) for row in origrows for c in row[1:-1] if c.strip()),'grand',rows[1][-1][-1]);print('originalmonitoringsum',sum(int(x[1])for x in rows[2][1:-1]))
