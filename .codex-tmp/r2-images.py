from pathlib import Path
from PIL import Image, ImageChops
import json,sys
root=Path('output/mobile-round2')
phase=sys.argv[1] if len(sys.argv)>1 else 'after'
data=json.loads((root/phase/'audit.json').read_text(encoding='utf-8'))
rows=[]
for row in data['rows']:
 if row['route']!='/dashboard': continue
 width=row['width']; path=root/phase/f'dashboard-{width}.png'; im=Image.open(path)
 if width==390:
  for i,p in enumerate(row['panels']):
   y=int(p['y']); im.crop((0,y,width,min(im.height,y+int(p['h'])+12))).save(root/phase/f'panel-{i}.png')
 if width>=1024:
  base=Image.open(root/'before'/path.name).convert('RGB'); current=im.convert('RGB')
  result={'width':width,'before':base.size,'after':im.size}
  if base.size==im.size:
   diff=ImageChops.difference(base,current); pix=list(diff.get_flattened_data())
   result['exactPercent']=sum(max(p)>0 for p in pix)/len(pix)*100
   result['tolerance16Percent']=sum(max(p)>16 for p in pix)/len(pix)*100
   result['tolerance1Percent']=sum(max(p)>1 for p in pix)/len(pix)*100
   result['tolerance2Percent']=sum(max(p)>2 for p in pix)/len(pix)*100
   result['maxChannelDifference']=max(max(p) for p in pix)
   diff.save(root/phase/f'diff-{width}.png')
  rows.append(result)
(root/phase/'pixels.json').write_text(json.dumps(rows,indent=2))
print(json.dumps(rows,indent=2))
