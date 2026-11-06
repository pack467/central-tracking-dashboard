from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
import json
root=Path('output/mobile-round3'); masks=json.loads((root/'desktop-masks.json').read_text()); audit=json.loads((root/'final-audit.json').read_text()); verified=json.loads((root/'screens-audit.json').read_text()) if (root/'screens-audit.json').exists() else {'rows':[]}; baseline=json.loads((root/'baseline.json').read_text())['rows']
results=[]
for row in masks:
 w=row['width'];route=row['route'];name=f'{route[1:]}-{w}.png';a=Image.open(root/('before' if route=='/shift-log' else 'desktop-reference')/name).convert('RGB');b=Image.open(root/'after'/name).convert('RGB');current=next((r for r in verified['rows'] if r.get('width')==w and r.get('route')==route),None) or next(r for r in audit['rows'] if r.get('width')==w and r.get('route')==route)
 size=(max(a.width,b.width),max(a.height,b.height));aa=Image.new('RGB',size);bb=Image.new('RGB',size);aa.paste(a);bb.paste(b);d=ImageChops.difference(aa,bb);mask=Image.new('1',size,1);draw=ImageDraw.Draw(mask)
 old=next((r for r in baseline if r.get('viewport')==w and r.get('route')==route),{})
 for rect in row['masks']+old.get('selects',[])+[c['rect'] for c in current.get('controls',[])]:
  draw.rectangle((max(0,int(rect['x'])-6),max(0,int(rect['y'])-6),int(rect['x']+rect['width'])+6,int(rect['y']+rect['height'])+6),fill=0)
 d.paste((0,0,0),(0,0),mask=mask.point(lambda p:0 if p else 255));r,g,bl=d.split();hist=ImageChops.lighter(ImageChops.lighter(r,g),bl).histogram();valid=mask.convert('L').histogram()[255];result={'width':w,'route':route,'before':a.size,'after':b.size,'exactPct':sum(hist[1:])/valid*100,'tolerance16Pct':sum(hist[17:])/valid*100,'bbox':d.getbbox()};results.append(result);d.save(root/f'pixel-{route[1:]}-{w}.png')
(root/'desktop-pixels.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
