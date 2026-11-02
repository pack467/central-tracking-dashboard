from PIL import Image
from collections import Counter
im=Image.open('.codex-tmp/reports-v2/image9.png').convert('RGB')
print([(('#%02X%02X%02X'%c),n) for c,n in Counter(im.getdata()).most_common() if max(c)-min(c)>50][:12])
