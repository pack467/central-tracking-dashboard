from pathlib import Path
from zipfile import ZipFile
from PIL import Image
from collections import Counter
import io,json
z=ZipFile(r'C:\Users\GALIH\Downloads\[2026-39] Laporan Serah Terima Kerja Mingguan.docx')
for name in [x for x in z.namelist() if '/image' in x]:
 b=z.read(name);p=Path('.codex-tmp/reports-v2')/Path(name).name;p.write_bytes(b);im=Image.open(io.BytesIO(b));print(name,im.size,im.mode,Counter(im.convert('RGB').getdata()).most_common(12))
