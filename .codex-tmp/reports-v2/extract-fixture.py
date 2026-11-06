from pathlib import Path
from docx import Document
from zipfile import ZipFile
from collections import Counter
from datetime import datetime
import json,re,hashlib
src=Path(r'C:\Users\GALIH\Downloads\[2026-39] Laporan Serah Terima Kerja Mingguan.docx')
rows=json.loads(Path('.codex-tmp/reports-v2/word-tables.json').read_text(encoding='utf8'))
def dt(s):
 return datetime.strptime(s.strip(),'%d/%m/%Y %H:%M') if s.strip() else None
tickets=[]
for n,r in enumerate(rows[3][1:],start=1):
 created=dt(r[1]);closed=dt(r[5]); severity,_,category=r[8].strip().partition(' - ')
 t={'id':r[0],'date':created.date().isoformat(),'created':created.isoformat(timespec='minutes'),'subject':r[2],'project':r[3],'description':r[4],'status':r[6],'owner':r[7],'owners':[r[7]],'severity':severity,'category':category,'clientId':'tritronik','sourceRow':n,'sourceCells':r}
 if closed:t['completionTime']=closed.isoformat(timespec='minutes');t['resolutionMinutes']=(closed-created).total_seconds()/60
 tickets.append(t)
monitoring=[]
for n,r in enumerate(rows[4][1:],start=1):
 m={'id':f'word-w39-monitoring-row-{n:04}','date':datetime.strptime(r[0].strip(),'%d/%m/%Y').date().isoformat(),'time':r[2],'project':r[1],'owner':r[3],'task':r[4],'resultText':r[5],'note':'' if r[5]=='OK' else r[5],'newUpdate':r[6],'clientId':'tritronik','sourceRow':n,'sourceCells':r}
 if r[5].strip().upper() in ['OK','NOK']:m['verdict']=r[5].strip().lower()
 monitoring.append(m)
z=ZipFile(src);doc=Document(src)
print('signature pictures',[(c.text,c._tc.xpath('.//a:blip/@r:embed')) for c in doc.tables[5].rows[1].cells])
clickup={r[0].strip():int(r[4]) for r in rows[0][1:-1]}
fixture={'source':str(src),'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'period':{'start':'2026-09-27','end':'2026-10-03'},'week':{'week':39,'year':2026,'week_start_day':0},'identity':{'clientId':'tritronik','clientName':'Tritronik','clientCode':'TTN','author':'Dimas Yudistira','authorRole':'Jr. Engineer','approver':'Nicholas Bima Nooka Putra','approverRole':'IT Services Lead','date':'2026-10-05'},'tickets':tickets,'monitoring':monitoring,'sourceSummaryTables':{'duration':rows[0],'categories':rows[1],'monitoring':rows[2]},'sourceClickupCounts':clickup,'sourceProjectAliases':{'ERICA':'EPC Tools','Activity - APH':'APH','Activity - B2B':'B2B','Activity - SM':'SM','Activity - USIEM':'USIEM'},'notes':['Original log rows and project display strings retained unchanged in sourceCells and project. No ticket deduplication.', 'Monitoring synthetic id is QA row identity only; source has no IDs. No source ticket ID modified.', 'Monitoring cells without literal OK/NOK omit verdict and retain exact resultText. Never display an invented verdict.', 'resolutionMinutes is timestamp difference only, responseMinutes absent because the source log has no measured response field.', 'Word duration summary labels 2 tickets as DM but source has B2B2; sourceClickupCounts retains DM4 literally, do not silently remap external ClickUp data.', 'Original signature images are present only in ignored source extraction, not configured or copied to production.']}
Path('frontend/.report-qa').mkdir(exist_ok=True);Path('frontend/.report-qa/word-week39.json').write_text(json.dumps(fixture,ensure_ascii=False,indent=2),encoding='utf8')
print('Saved',len(tickets),'tickets',len(monitoring),'monitoring.','durations',Counter(t.get('resolutionMinutes') for t in tickets));print('negativeduration',[(t['id'],t.get('resolutionMinutes')) for t in tickets if t.get('resolutionMinutes',0)<0]);print('mon dates',Counter(m['date'] for m in monitoring));print('ClickUp',clickup)
