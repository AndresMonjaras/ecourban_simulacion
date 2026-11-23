import sys,io,math; sys.path.insert(0,'.'); import glb,numpy as np
from PIL import Image
def render(path,out,views=(0,180,90,45),H=480,tex_override=None,crop=None,pos_override=None,frame=None):
    j,b=glb.load(path)
    texs={}
    def tex(mi):
        m=j['materials'][mi]; t=m['pbrMetallicRoughness'].get('baseColorTexture')
        f=m['pbrMetallicRoughness'].get('baseColorFactor',[1,1,1,1])
        if t is None: return None,np.array(f[:3]),0
        src=j['textures'][t['index']]['source']
        if tex_override is not None and src==0: arr=tex_override
        else:
            if src not in texs: texs[src]=np.asarray(Image.open(io.BytesIO(glb.img(j,b,src))).convert('RGB'),np.float32)/255
            arr=texs[src]
        return arr,np.array(f[:3]),t.get('texCoord',0)
    prims=[]
    for ni,n in enumerate(j['nodes']):
        if 'mesh' not in n: continue
        for p in j['meshes'][n['mesh']]['primitives']:
            A=p['attributes']; P=glb.acc(j,b,A['POSITION']).astype(np.float64); t,f,tc=tex(p.get('material',0)); key='TEXCOORD_%d'%tc
            UV=glb.acc(j,b,A[key]) if key in A else np.zeros((len(P),2))
            N=glb.acc(j,b,A['NORMAL']); I=glb.acc(j,b,p['indices']).reshape(-1,3) if 'indices' in p else np.arange(len(P)).reshape(-1,3)
            prims.append((P,UV,N,I,t,f))
    if pos_override is not None:
        off=0; np2=[]
        for q in prims:
            n=len(q[0]); np2.append((pos_override[off:off+n].astype(np.float64),)+q[1:]); off+=n
        prims=np2
    allP=np.vstack([q[0] for q in prims]); lo,hi=allP.min(0),allP.max(0); c=(lo+hi)/2
    sc=H*0.92/(hi[1]-lo[1]); W=int(H*0.6)
    if frame is not None:  # (centro_y, altura_visible): encuadre fijo, suelo comparable
        c=np.array([c[0],frame[0],c[2]]); sc=H/frame[1]
    tiles=[]
    for ang in views:
        a=math.radians(ang); R=np.array([[math.cos(a),0,math.sin(a)],[0,1,0],[-math.sin(a),0,math.cos(a)]])
        img=np.ones((H,W,3))*0.85; zb=np.full((H,W),-1e9)
        L=np.array([0.3,0.5,0.8]); L/=np.linalg.norm(L)
        for P,UV,N,I,t,f in prims:
            Q=(P-c)@R.T; NN=N@R.T
            X=Q[:,0]*sc+W/2; Y=H/2-Q[:,1]*sc; Z=Q[:,2]
            for tri in I:
                xs,ys=X[tri],Y[tri]
                x0,x1=int(max(0,math.floor(xs.min()))),int(min(W-1,math.ceil(xs.max()))); y0,y1=int(max(0,math.floor(ys.min()))),int(min(H-1,math.ceil(ys.max())))
                if x1<x0 or y1<y0: continue
                den=(ys[1]-ys[2])*(xs[0]-xs[2])+(xs[2]-xs[1])*(ys[0]-ys[2])
                if abs(den)<1e-9: continue
                gx,gy=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
                l0=((ys[1]-ys[2])*(gx-xs[2])+(xs[2]-xs[1])*(gy-ys[2]))/den
                l1=((ys[2]-ys[0])*(gx-xs[2])+(xs[0]-xs[2])*(gy-ys[2]))/den
                l2=1-l0-l1; m=(l0>=-1e-4)&(l1>=-1e-4)&(l2>=-1e-4)
                if not m.any(): continue
                z=l0*Z[tri[0]]+l1*Z[tri[1]]+l2*Z[tri[2]]
                sub=zb[y0:y1+1,x0:x1+1]; m&=z>sub
                if not m.any(): continue
                sub[m]=z[m]
                n=(l0[...,None]*NN[tri[0]]+l1[...,None]*NN[tri[1]]+l2[...,None]*NN[tri[2]])[m]
                sh=0.45+0.55*np.clip(np.abs(n@L),0,1)
                if t is not None:
                    u=(l0*UV[tri[0],0]+l1*UV[tri[1],0]+l2*UV[tri[2],0])[m]; v=(l0*UV[tri[0],1]+l1*UV[tri[1],1]+l2*UV[tri[2],1])[m]
                    th,tw=t.shape[:2]; col=t[np.clip((v%1*th).astype(int),0,th-1),np.clip((u%1*tw).astype(int),0,tw-1)]*f
                else: col=np.tile(f,(m.sum(),1))
                img[y0:y1+1,x0:x1+1][m]=col*sh[:,None]
        tiles.append(img)
    out_img=np.hstack(tiles)
    if crop: out_img=out_img[crop[0]:crop[1]]
    Image.fromarray((np.clip(out_img,0,1)*255).astype(np.uint8)).save(out)
if __name__=='__main__': render(sys.argv[1],sys.argv[2])
