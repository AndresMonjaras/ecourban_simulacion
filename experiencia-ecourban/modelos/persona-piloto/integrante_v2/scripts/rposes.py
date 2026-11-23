import sys;sys.path.insert(0,'.');import rend,numpy as np
from PIL import Image
M='/home/omarbolanos/Documentos/REPOSITORIOS/ecourban_simulacion/experiencia-ecourban/public/models/'
src={'orig':M+'persona-articulada.glb','v1':M+'persona-articulada-ropa-ecourban-v1.glb','v2':sys.argv[1]}
poses=sys.argv[2].split(',') ; views=tuple(int(x) for x in sys.argv[3].split(',')); out=sys.argv[4]; H=int(sys.argv[5]) if len(sys.argv)>5 else 360
rows=[]
for lab in sys.argv[6].split(',') if len(sys.argv)>6 else ['orig','v1','v2']:
    tiles=[]
    for p in poses:
        pos=np.fromfile(f'work/poses/{lab}_{p}.f32',np.float32).reshape(-1,3)
        f=f'work/_t.png'; rend.render(src[lab],f,views=views,H=H,pos_override=pos,frame=(0.9,1.95)); tiles.append(np.asarray(Image.open(f)))
    rows.append(np.hstack(tiles))
Image.fromarray(np.vstack(rows)).save(out)
