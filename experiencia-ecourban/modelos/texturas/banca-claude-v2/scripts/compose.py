import numpy as np, os, sys
from PIL import Image
B="fuente-2048"
def load(n): return np.asarray(Image.open(f"{B}/{n}").convert("RGB")).astype(np.float32)/255
def save(a,path,mode="RGB"):
    Image.fromarray((np.clip(a,0,1)*255+0.5).astype(np.uint8),mode).save(path,optimize=True,compress_level=9)
os.makedirs("2048",exist_ok=True); os.makedirs("1024",exist_ok=True)
def down(a,n,normal=False):
    im=Image.fromarray((np.clip(a,0,1)*255+0.5).astype(np.uint8)).resize((n,n),Image.LANCZOS)
    r=np.asarray(im).astype(np.float32)/255
    if normal:
        v=r*2-1; v/=np.maximum(np.linalg.norm(v,axis=2,keepdims=True),1e-6); r=v*0.5+0.5
    return r
for tag in ("verde","grafito"):
    base=load(f"banca-claude-{tag}-basecolor-bake.png"); nor=load(f"banca-claude-{tag}-normal-bake.png"); ro=load(f"banca-claude-{tag}-roughness-bake.png")[...,0]
    mask=ro>0.02; m=ro[mask].mean(); r2=np.where(mask,np.clip(m+(ro-m)*1.5,0.05,1),m)   # variación de rugosidad x1.5
    print(tag,"rough mean %.3f range in %.3f-%.3f -> %.3f-%.3f"%(m,ro[mask].min(),ro[mask].max(),r2[mask].min(),r2[mask].max()))
    mr=np.stack([np.ones_like(r2),r2,np.zeros_like(r2)],-1)
    for n,res in (("2048",2048),("1024",1024)):
        f=(lambda a,nm=False:a) if res==2048 else (lambda a,nm=False:down(a,res,nm))
        save(f(base),f"{n}/banca-claude-{tag}-basecolor-v2.png"); save(f(nor,True),f"{n}/banca-claude-{tag}-normal-v2.png"); save(f(mr),f"{n}/banca-claude-{tag}-metalrough-v2.png")
ro=load("banca-claude-acero-roughness-bake-1024.png")[...,0]; mask=ro>0.02; m=ro[mask].mean(); r2=np.where(mask,ro,m)
print("acero rough %.3f %.3f-%.3f"%(m,ro[mask].min(),ro[mask].max()))
mr=np.stack([np.ones_like(r2),r2,np.ones_like(r2)],-1)
for n,res in (("2048",1024),("1024",512)):
    a=mr if res==1024 else down(mr,512)
    save(a,f"{n}/banca-claude-acero-metalrough-v2.png")
