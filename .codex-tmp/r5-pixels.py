from pathlib import Path
from PIL import Image,ImageChops
import json
root=Path('output/mobile-round5');old=json.loads((root/'before.json').read_text())['rows'];new=json.loads((root/'after.json').read_text())['rows'];rows=[]
for w in [1024,1280,1440,1920]:
 a=Image.open(root/'before'/f'dashboard-{w}.png').convert('RGB');b=Image.open(root/'after'/f'dashboard-{w}.png').convert('RGB')
 assert a.size==b.size,(w,a.size,b.size)
 d=ImageChops.difference(a,b);r,g,bl=d.split();hist=ImageChops.lighter(ImageChops.lighter(r,g),bl).histogram();pct=sum(hist[1:])/(a.width*a.height)*100
 rows.append({'width':w,'scope':'whole Dashboard','size':a.size,'exactPct':pct,'pass':pct<.5})
 for p in next(x for x in old if x['width']==w)['dashboard']['panels']:
  q=next(p2 for p2 in next(x for x in new if x['width']==w)['dashboard']['panels'] if p2['title']==p['title']);assert all(abs(p[k]-q[k])<.02 for k in ['x','y','w','h']),(w,p,q)
  box=(round(p['x']),round(p['y']),round(p['x']+p['w']),round(p['y']+p['h']));dd=d.crop(box);rr,gg,bb=dd.split();hist=ImageChops.lighter(ImageChops.lighter(rr,gg),bb).histogram();pct=sum(hist[1:])/(dd.width*dd.height)*100
  rows.append({'width':w,'scope':p['title'],'exactPct':pct,'pass':pct<.5})
  if pct>=.5:dd.save(root/f'pixel-fail-{w}-{len(rows)}.png')
(root/'desktop-pixels.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
