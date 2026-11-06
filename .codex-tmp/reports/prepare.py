from zipfile import ZipFile, ZIP_DEFLATED
from pathlib import Path
import re
source = Path(r'C:\Users\GALIH\Downloads\[2026-39] Laporan Serah Terima Kerja Mingguan.docx')
with ZipFile(source) as z:
    document = z.read('word/document.xml').decode('utf-8-sig')
    section = re.findall(r'<w:sectPr\b[^>]*>.*?</w:sectPr>', document, re.S)[-1]
    section = re.sub(r'<w:footerReference\b[^>]*/>', '', section)
    document = re.sub(r'(<w:body\b[^>]*>).*?(</w:body>)', lambda m: m[1] + '<w:p/>' + section + m[2], document, flags=re.S)
    header = z.read('word/header1.xml').decode('utf-8-sig')
    def paragraph(m):
        text = ''.join(re.findall(r'<w:t\b[^>]*>(.*?)</w:t>', m[0], re.S))
        if text.startswith('Week ') or text.startswith('27 '):
            return re.sub(r'(<w:t\b[^>]*>).*?(</w:t>)', lambda t: t[1] + t[2], m[0], flags=re.S)
        return m[0]
    header = re.sub(r'<w:p\b[^>]*>.*?</w:p>', paragraph, header, flags=re.S)
    with ZipFile('.codex-tmp/reports/template.docx', 'w', ZIP_DEFLATED) as out:
        for name in z.namelist():
            data = z.read(name)
            if name == 'word/document.xml': data = document.encode('utf-8')
            if name == 'word/header1.xml': data = header.encode('utf-8')
            out.writestr(name, data)

