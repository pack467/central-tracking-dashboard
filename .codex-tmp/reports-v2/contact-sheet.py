from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
from collections import Counter
import json
out=Path('.codex-tmp/reports-v2');items=[1,2,3,4,21,77];thumbw=420;thumbh=630
sheet=Image.new('RGB',(thumbw*3,thumbh*2),(230,233,238));draw=ImageDraw.Draw(sheet)
for k,n in enumerate(items):
 im=Image.open(out/f'word-reference-{n}.png').convert('RGB');im.thumbnail((thumbw-16,thumbh-34));x=(k%3)*thumbw+(thumbw-im.width)//2;y=(k//3)*thumbh+28;sheet.paste(im,(x,y));draw.text(((k%3)*thumbw+12,(k//3)*thumbh+8),f'Word reference — page {n}',fill='black')
sheet.save(out/'word-reference-contact-sheet.png')
f=json.loads(Path('frontend/.report-qa/word-week39.json').read_text(encoding='utf8'))
counts=Counter(t['project'] for t in f['tickets']);normal=Counter(f['sourceProjectAliases'].get(t['project'],t['project']) for t in f['tickets']);mon=Counter(m['project'].strip().replace(' - grafana',' - Grafana') for m in f['monitoring']);duplicates={k:v for k,v in Counter(t['id'] for t in f['tickets']).items() if v>1}
audit={'sourceDocxSha256':f['sourceSha256'],'logo':{'source':'word/media/image3.png','destination':'frontend/public/reports/hutabyte-logo.png','sha256':'E12BF6D18A8CB6159016335B318ACBA1892CBFE9E4B6D3B66E0E8C84E01474A0','dimensions':[253,253],'modified':False},'colors':{'tableHeader':'#145F82','APH':'#145F82','B2B':'#E87331','EPC Core':'#186C24','EPC Tools':'#0F9ED5','MB':'#A02B93','SM':'#4EA72E','USIEM':'#0C394E'},'word':{'ticketRows':138,'monitoringRows':864,'rawProjectCounts':dict(counts),'normalizedProjectCounts':dict(normal),'monitoringCounts':dict(sorted(mon.items())),'duplicateTicketIdCounts':duplicates,'categorySourceDeclaredGrandTotal':138,'categorySourceRowTotalSum':139,'categorySourceCellSum':143,'monitoringSourceOverviewTotal':845,'unknownMonitoringVerdictRows':sum('verdict' not in m for m in f['monitoring'])},'pdfWeek36':{'pages':6,'ticketRows':17,'monitoringRows':0,'closedCount':6,'responsePercent':100,'averageDuration':'0:34','matchesSeedIDs':True},'referencePages':{'overview':1,'dailyAndDuration':2,'categoryMonitoringOverview':3,'ticketLog':4,'monitoringLog':21,'signatures':77},'signatureSource':{'Dimas Yudistira':{'part':'/media/image5.png','title':'Jr. Engineer','date':'2026-10-05'},'Nicholas Bima Nooka Putra':{'part':'/media/image7.png','title':'IT Services Lead','date':'2026-10-05'}}}
(out/'reference-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8');print('Saved audit JSON and contact sheet')
