from PIL import Image, ImageChops
from pathlib import Path
import json
root=Path('output/mobile-redesign')
rows=[]
for width in [1280,1440,1920]:
 for route in ['dashboard','tickets','monitoring','shift-log','reports','team-roster','master-data','runbooks']:
  phase='before-shiftlog' if route=='shift-log' else 'before-masterdata-stable' if route=='master-data' else 'before-stable'
  after_phase='after-masterdata-stable' if route=='master-data' else 'after-final'
  a=Image.open(root/phase/f'{route}-{width}.png').convert('RGB')
  b=Image.open(root/after_phase/f'{route}-{width}.png').convert('RGB')
  result={'width':width,'route':route,'baseline':phase,'beforeSize':a.size,'afterSize':b.size}
  if a.size==b.size:
   pixels=list(ImageChops.difference(a,b).get_flattened_data())
   result.update(exactPercent=100*sum(max(p)>0 for p in pixels)/len(pixels),tolerance16Percent=100*sum(max(p)>16 for p in pixels)/len(pixels))
  rows.append(result)
print(json.dumps(rows,indent=2))
(root/'pixels.json').write_text(json.dumps(rows,indent=2))
