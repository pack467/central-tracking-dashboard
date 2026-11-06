from pathlib import Path
from PIL import Image,ImageChops
import json
root=Path('output/mobile-round4')
old=json.loads((root/'baseline.json').read_text())['rows']
new=json.loads((root/'after.json').read_text())['rows']
results=[]
for width in [1024,1366,1440,1920,2560]:
    before=next(r for r in old if r['width']==width and r['kind']=='dashboard')['data']['panels']
    after=next(r for r in new if r['width']==width and r['kind']=='dashboard')['data']['panels']
    a=Image.open(root/'before'/f'dashboard-{width}.png').convert('RGB')
    b=Image.open(root/'after'/f'dashboard-{width}.png').convert('RGB')
    for first in before:
        if first['title']=='List Monitoring Shift': continue
        second=next(p for p in after if p['title']==first['title'])
        crop=lambda im,p:im.crop((round(p['x']),round(p['y']),round(p['x']+p['w']),round(p['y']+p['h'])))
        aa,bb=crop(a,first),crop(b,second)
        if aa.size!=bb.size:
            results.append({'width':width,'panel':first['title'],'sizeBefore':aa.size,'sizeAfter':bb.size,'pass':False})
            continue
        d=ImageChops.difference(aa,bb);r,g,bl=d.split();hist=ImageChops.lighter(ImageChops.lighter(r,g),bl).histogram();total=aa.width*aa.height
        pct=sum(hist[1:])/total*100;tol=sum(hist[17:])/total*100
        results.append({'width':width,'panel':first['title'],'size':aa.size,'positionBefore':[first['x'],first['y']],'positionAfter':[second['x'],second['y']],'exactPct':pct,'tolerance16Pct':tol,'pass':pct<0.5})
        if pct>=0.5:d.save(root/f'pixel-difference-{width}-{len(results)}.png')
(root/'desktop-pixels.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
