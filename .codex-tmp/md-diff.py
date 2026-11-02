from pathlib import Path
from PIL import Image, ImageChops
import json
root=Path('output/master-data-round1');rows=[]
for p in (root/'before').glob('*.png'):
 if p.name.startswith('master-data'):continue
 q=root/'after'/p.name
 if not q.exists():continue
 a=Image.open(p).convert('RGB');b=Image.open(q).convert('RGB')
 if a.size!=b.size:
  rows.append({'file':p.name,'beforeSize':a.size,'afterSize':b.size,'dimensionMismatch':True});continue
 diff=ImageChops.difference(a,b); channel=ImageChops.lighter(ImageChops.lighter(diff.getchannel('R'),diff.getchannel('G')),diff.getchannel('B'));hist=channel.histogram();exact=sum(hist[1:]);significant=sum(hist[17:]);total=a.width*a.height
 rows.append({'file':p.name,'exactPercent':round(exact/total*100,6),'over16Percent':round(significant/total*100,6)})
 if exact:diff.save(root/'screens'/('diff-'+p.name))
(root/'pixel-diff.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows))
