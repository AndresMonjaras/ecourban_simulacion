import sys,math; sys.path.insert(0,'.'); import glb,numpy as np
SRC='/home/omarbolanos/Documentos/REPOSITORIOS/ecourban_simulacion/experiencia-ecourban/public/models/persona-articulada.glb'
j,b=glb.load(SRC); jn=[j['nodes'][k]['name'] for k in j['skins'][0]['joints']]
IBM=glb.acc(j,b,j['skins'][0]['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
JP={n:np.linalg.inv(IBM[i])[:3,3] for i,n in enumerate(jn)}
for n in ['Hips','Spine2','Neck','Head','HeadTop_End','LeftShoulder','LeftArm','LeftForeArm','LeftHand','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase']: print(n,JP[n].round(3))
T=1024; POS=np.zeros((T,T,3),np.float32); NOR=np.zeros((T,T,3),np.float32); DOM=np.full((T,T),-1,np.int16); COV=np.zeros((T,T),bool)
p=j['meshes'][0]['primitives'][0]; A=p['attributes']
P=glb.acc(j,b,A['POSITION']); N=glb.acc(j,b,A['NORMAL']); UV=glb.acc(j,b,A['TEXCOORD_0']); J=glb.acc(j,b,A['JOINTS_0']); W=glb.acc(j,b,A['WEIGHTS_0']); I=glb.acc(j,b,p['indices']).reshape(-1,3)
dom=J[np.arange(len(J)),W.argmax(1)]
X=UV[:,0]*T; Y=UV[:,1]*T
for tri in I:
    xs,ys=X[tri],Y[tri]
    x0,x1=max(0,int(math.floor(xs.min()))-1),min(T-1,int(math.ceil(xs.max()))+1); y0,y1=max(0,int(math.floor(ys.min()))-1),min(T-1,int(math.ceil(ys.max()))+1)
    den=(ys[1]-ys[2])*(xs[0]-xs[2])+(xs[2]-xs[1])*(ys[0]-ys[2])
    if abs(den)<1e-12: continue
    gx,gy=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
    l0=((ys[1]-ys[2])*(gx-xs[2])+(xs[2]-xs[1])*(gy-ys[2]))/den; l1=((ys[2]-ys[0])*(gx-xs[2])+(xs[0]-xs[2])*(gy-ys[2]))/den; l2=1-l0-l1
    e=-0.6/ max(1,abs(den))**0.5  # small dilation
    m=(l0>=e)&(l1>=e)&(l2>=e)
    if not m.any(): continue
    pos=l0[...,None]*P[tri[0]]+l1[...,None]*P[tri[1]]+l2[...,None]*P[tri[2]]
    nor=l0[...,None]*N[tri[0]]+l1[...,None]*N[tri[1]]+l2[...,None]*N[tri[2]]
    k=np.argmax(np.stack([l0,l1,l2]),0); d=dom[tri][k]
    POS[y0:y1+1,x0:x1+1][m]=pos[m]; NOR[y0:y1+1,x0:x1+1][m]=nor[m]; DOM[y0:y1+1,x0:x1+1][m]=d[m]; COV[y0:y1+1,x0:x1+1][m]=True
np.savez_compressed('work/texmap.npz',POS=POS,NOR=NOR,DOM=DOM,COV=COV,jn=np.array(jn),JP=np.array([JP[n] for n in jn]))
print('covered',COV.mean())
