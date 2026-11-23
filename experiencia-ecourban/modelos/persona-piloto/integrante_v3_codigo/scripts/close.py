import sys;sys.path.insert(0,'.');import rend,numpy as np
from PIL import Image
g=sys.argv[1]; out=sys.argv[2]
rend.render(g,'v3/work/_h.png',views=(0,90,35,200),H=520,frame=(1.73,0.36))
rend.render(g,'v3/work/_f.png',views=(0,90,35,200),H=300,frame=(0.08,0.24))
rend.render(g,'v3/work/_m.png',views=(0,90),H=420,frame=(1.10,0.36))
a=[np.asarray(Image.open(f'v3/work/_{k}.png')) for k in 'hfm']
W=max(x.shape[1] for x in a); a=[np.pad(x,((0,0),(0,W-x.shape[1]),(0,0)),constant_values=217) for x in a]
Image.fromarray(np.vstack(a)).save(out)
