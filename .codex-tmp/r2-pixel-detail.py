from PIL import Image,ImageChops
from pathlib import Path
from collections import Counter
root=Path('output/mobile-round2')
for w in [1280,1920]:
 a=Image.open(root/'before'/f'dashboard-{w}.png').convert('RGB');b=Image.open(root/'after'/f'dashboard-{w}.png').convert('RGB')
 d=ImageChops.difference(a,b); data=list(d.get_flattened_data()); counts=Counter(i//w//100*100 for i,p in enumerate(data) if max(p)>0)
 print(w,counts.most_common(12),d.getbbox())
 if w==1920:
  for y,n in counts.most_common(4):
   a.crop((0,y,w,min(y+200,a.height))).save(root/f'before-{w}-{y}.png');b.crop((0,y,w,min(y+200,a.height))).save(root/f'after-{w}-{y}.png')
