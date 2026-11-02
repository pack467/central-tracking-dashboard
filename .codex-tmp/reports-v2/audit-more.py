from pathlib import Path
from docx import Document
from zipfile import ZipFile
import json,lxml.etree as E,collections
w=Path(r'C:\Users\GALIH\Downloads\[2026-39] Laporan Serah Terima Kerja Mingguan.docx');z=ZipFile(w)
print('\n'.join(z.namelist()))
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','c':'http://schemas.openxmlformats.org/drawingml/2006/chart','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
for name in ['word/header1.xml','word/_rels/header1.xml.rels','word/_rels/document.xml.rels','word/theme/theme1.xml']:
 b=z.read(name);Path('.codex-tmp/reports-v2/'+name.split('/')[-1]).write_bytes(b);print(name,b.decode()[:5000])
root=E.fromstring(z.read('word/document.xml'));print('drawing colors',collections.Counter(root.xpath('//a:srgbClr/@val',namespaces=ns)));print('dml text',root.xpath('//a:t/text()',namespaces=ns));print('image',root.xpath('//a:blip/@r:embed',namespaces=ns))
rows=json.loads(Path('.codex-tmp/reports-v2/word-tables.json').read_text(encoding='utf8'))
for i in [0,1,2]:print('SUMMARY TABLE',i,json.dumps(rows[i],ensure_ascii=False))
print('MON unique projects',collections.Counter(r[1] for r in rows[4][1:]));print('MON verdict',collections.Counter(r[5] for r in rows[4][1:]));print('MON updates',collections.Counter(r[6] for r in rows[4][1:]));print('TICKET statuses',collections.Counter(r[6] for r in rows[3][1:]));print('TICKET categories',collections.Counter(r[8] for r in rows[3][1:]));print('TICKET perProject',collections.Counter(r[3] for r in rows[3][1:]));print('TICKET IDs duplicates',[(k,v)for k,v in collections.Counter(r[0] for r in rows[3][1:]).items()if v>1]);print('TICKET dates',collections.Counter(r[1][:10] for r in rows[3][1:]));
z.extract('word/media/image3.png','.codex-tmp/reports-v2')
