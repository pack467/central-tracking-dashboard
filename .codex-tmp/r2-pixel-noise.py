from pathlib import Path
from PIL import Image,ImageChops
from collections import Counter
r=Path('output/mobile-round2');a=Image.open(r/'before/dashboard-1920.png').convert('RGB');b=Image.open(r/'desktop-check/dashboard-1920.png').convert('RGB');d=ImageChops.difference(a,b)
print(Counter(max(p) for p in d.get_flattened_data()))
