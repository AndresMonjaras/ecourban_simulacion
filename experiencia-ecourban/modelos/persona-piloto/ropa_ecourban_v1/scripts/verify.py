import sys,io; sys.path.insert(0,'.'); import glb,numpy as np,json
from PIL import Image
a,ab=glb.load(sys.argv[1]); c,cb=glb.load(sys.argv[2])
ok=True
for i in range(len(a['accessors'])):
    x=glb.acc(a,ab,i); y=glb.acc(c,cb,i)
    if x.shape!=y.shape or not np.array_equal(x,y): print('DIFF accessor',i); ok=False
print('accessors originales identicos:',ok, len(a['accessors']),'->',len(c['accessors']))
print('nodos 0..%d identicos:'%(len(a['nodes'])-1), all(a['nodes'][i]==c['nodes'][i] for i in range(len(a['nodes'])) if a['nodes'][i].get('name')!='Armature'),
      '| Armature hijos', a['nodes'][67]['children'],'->',c['nodes'][67]['children'])
print('skins identicos:',a['skins']==c['skins'],'| nskins',len(c['skins']),'| joints',len(c['skins'][0]['joints']))
print('mallas originales identicas:',a['meshes']==c['meshes'][:len(a['meshes'])],'| nuevas:',[m['name'] for m in c['meshes'][len(a['meshes']):]])
print('materiales originales identicos:',a['materials']==c['materials'][:2],'| nuevos:',[m['name'] for m in c['materials'][2:]])
for i in range(3):
    x=np.asarray(Image.open(io.BytesIO(glb.img(a,ab,i)))); y=np.asarray(Image.open(io.BytesIO(glb.img(c,cb,i))))
    print('imagen',i,a['images'][i]['name'],y.shape,'texeles cambiados %.1f%%'%(100*(x!=y).any(-1).mean()),'alpha igual',np.array_equal(x[...,3],y[...,3]))
