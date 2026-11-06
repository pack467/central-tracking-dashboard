from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
import json
root=Path('output/mobile-round5');old=json.loads((root/'before.json').read_text())['rows'];new=json.loads((root/'after.json').read_text())['rows'];rows=[]
for w in [1024,1280,1440,1920]:
 first=next(r for r in old if r['width']==w);second=next(r for r in new if r['width']==w)
 a=Image.open(root/'before'/f'dashboard-{w}.png').convert('RGB');b=Image.open(root/'after'/f'dashboard-{w}.png').convert('RGB');assert a.size==b.size
 d=ImageChops.difference(a,b);mask=Image.new('L',a.size,255);draw=ImageDraw.Draw(mask)
 for record in [first,second]:
  p=record['dashboard'].get('fab')
  if p:draw.rectangle((int(p['x'])-8,int(p['y'])-8,int(p['x']+p['w'])+8,int(p['y']+p['h'])+8),fill=0)
 def pct(diff,valid):
  r,g,bb=diff.split();gray=ImageChops.lighter(ImageChops.lighter(r,g),bb);hist=ImageChops.multiply(gray,valid).histogram();area=valid.histogram()[255];return sum(hist[1:])/area*100
 row={'width':w,'fabBefore':first['dashboard'].get('fab'),'fabAfter':second['dashboard'].get('fab'),'rawPct':pct(d,Image.new('L',a.size,255)),'excludingFloatingButtonPct':pct(d,mask),'panels':[]}
 for p in first['dashboard']['panels'][:3]:
  box=(round(p['x']),round(p['y']),round(p['x']+p['w']),round(p['y']+p['h']));row['panels'].append({'title':p['title'],'excludingFloatingButtonPct':pct(d.crop(box),mask.crop(box))})
 rows.append(row)
(root/'desktop-overlay-audit.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
