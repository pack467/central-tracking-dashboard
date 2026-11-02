from pathlib import Path
from collections import Counter
import json,re
import pdfplumber
import pypdfium2 as pdfium
from PIL import Image,ImageDraw
root=Path.cwd()
qa=root/'.codex-tmp/reports-v2'
summary=[]
for week in (36,39):
    path=root/f'output/pdf/[2026-{week}] Laporan Serah Terima Kerja Mingguan - diperbaiki.pdf'
    fixture=json.loads((root/f'frontend/.report-qa/{"pdf" if week==36 else "word"}-week{week}.json').read_text(encoding='utf-8'))
    rendered=pdfium.PdfDocument(str(path))
    thumbs=[]
    ids=[]
    monitoring_dates=[]
    monitoring_started=False
    checks=[]
    with pdfplumber.open(path) as doc:
        for i,p in enumerate(doc.pages):
            text=p.extract_text() or ''
            assert 'LAPORAN SERAH TERIMA KERJA HARIAN' in text,(week,i,'header')
            chars=[c for c in p.chars if c['text'].strip()]
            assert all(c['x0']>=47 and c['x1']<=548.5 and c['top']>=41 and c['bottom']<=825 for c in chars),(week,i,'bounds')
            footer=''.join(c['text'] for c in chars if c['top']>805)
            assert footer==str(i+1),(week,i,'footer',footer)
            body=[c for c in chars if 160<c['top']<792]
            idchars=[c for c in body if 'Courier' in c['fontname']]
            byline={}
            for c in idchars: byline.setdefault(round(c['top'],2),[]).append(c)
            ids.extend(''.join(c['text'] for c in sorted(cs,key=lambda c:c['x0'])) for cs in byline.values())
            starts=[w for w in p.extract_words() if w['text']=='Monitoring' and 160<w['top']<792 and w['x0']<120]
            start_y=None
            if '3. Monitoring Log' in text:
                monitoring_started=True
                start_y=min(w['top'] for w in starts)
            if monitoring_started:
                for w in p.extract_words():
                    if 48<=w['x0']<65 and 160<w['top']<792 and (start_y is None or w['top']>start_y) and re.fullmatch(r'\d{2}/\d{2}/\d{4}',w['text']): monitoring_dates.append(w['text'])
            if 'd. Tiket minggu ini berdasarkan kategori' in text: assert 'Grand Total' in text,(week,i,'matrix')
            png=qa/f'final{week}-{i+1:02}.png'
            page=rendered[i]
            bitmap=page.render(scale=1.5)
            im=bitmap.to_pil(); im.save(png)
            thumb=im.copy();thumb.thumbnail((298,421))
            frame=Image.new('RGB',(318,449),'#ddd');frame.paste(thumb,((318-thumb.width)//2,20));ImageDraw.Draw(frame).text((10,4),f'Week {week} / page {i+1}',fill='black');thumbs.append(frame)
            bitmap.close();page.close()
        expected=Counter(re.sub(r'\s+',' ',t['id']).strip() for t in fixture['tickets'])
        assert Counter(ids)==expected,(week,'IDs',Counter(ids)-expected,expected-Counter(ids))
        assert len(monitoring_dates)==len(fixture['monitoring']),(week,'monitoring rows',len(monitoring_dates))
        summary.append({'week':week,'pages':len(doc.pages),'rendered':len(thumbs),'ticketRows':len(ids),'monitoringRows':len(monitoring_dates),'headerFooterAndBounds':'pass'})
    for offset in range(0,len(thumbs),12):
        batch=thumbs[offset:offset+12]
        sheet=Image.new('RGB',(318*4,449*((len(batch)+3)//4)),'#bbb')
        for j,im in enumerate(batch):sheet.paste(im,((j%4)*318,(j//4)*449))
        sheet.save(qa/f'final{week}-sheet-{offset//12+1}.png')
    rendered.close()
    print(json.dumps(summary[-1]),flush=True)
# Internal QA only: image fitting without applying signatures to deliverable reports.
sig=pdfium.PdfDocument(str(root/'frontend/.report-qa/signature-layout-only.pdf'))
page=sig[len(sig)-1]; bitmap=page.render(scale=1.5);bitmap.to_pil().save(qa/'signature-images.png');bitmap.close();page.close();sig.close()
(qa/'final-validation.json').write_text(json.dumps(summary,indent=2))
