from pathlib import Path
from docx import Document
from pypdf import PdfReader
import json,zipfile,collections,lxml.etree as E
w=Path(r'C:\Users\GALIH\Downloads\[2026-39] Laporan Serah Terima Kerja Mingguan.docx')
p=Path(r'C:\Users\GALIH\Downloads\[2026-36] Laporan Serah Terima Kerja Mingguan - ttn - 2026-09-05_2026-09-11 (2).pdf')
d=Document(w)
print('DOCX tables',len(d.tables))
for i,t in enumerate(d.tables):
 rows=[[c.text for c in r.cells] for r in t.rows]
 print('TABLE',i,'rows',len(rows),'cols',len(rows[0]),'header',rows[0]);print('first',rows[1:3]);print('last',rows[-2:])
Path('.codex-tmp/reports-v2/word-tables.json').write_text(json.dumps([[[c.text for c in r.cells] for r in t.rows] for t in d.tables],ensure_ascii=False,indent=2),encoding='utf8')
r=PdfReader(p);print('PDF pages',len(r.pages));pt=[pg.extract_text() for pg in r.pages];Path('.codex-tmp/reports-v2/current-week36.txt').write_text('\n\n'.join('PAGE '+str(i+1)+'\n'+v for i,v in enumerate(pt)),encoding='utf8');print('\n'.join(pt[:3]))
z=zipfile.ZipFile(w); ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','c':'http://schemas.openxmlformats.org/drawingml/2006/chart'}
root=E.fromstring(z.read('word/document.xml'));print('fillcounts',collections.Counter(root.xpath('//w:shd/@w:fill',namespaces=ns)))
for part in z.namelist():
 if part.startswith('word/charts/') and part.endswith('.xml'):
  cr=E.fromstring(z.read(part));print('CHART',part,'colors',cr.xpath('//a:srgbClr/@val',namespaces=ns),'schemes',cr.xpath('//a:schemeClr/@val',namespaces=ns));print('text',cr.xpath('//c:v/text()',namespaces=ns))
print('MEDIA',[x for x in z.namelist() if x.startswith('word/media/')]);print('HEADERS',[x for x in z.namelist() if x.startswith('word/header')]);
