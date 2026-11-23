import numpy as np
from PIL import Image, ImageFilter
d=np.load('work/texmap.npz'); P=d['POS'];NR=d['NOR'];C=d['COV'];D=d['DOM'];jn=list(d['jn']);JP=d['JP']
jp=lambda n: JP[jn.index(n)]
T=1024; vv,uu=(np.mgrid[0:T,0:T]+.5)/T
src=Image.open('work/src_0.png'); A=np.asarray(src,np.float32)/255; rgb=A[...,:3].copy()
lum=rgb@[.299,.587,.114]; blur=np.asarray(Image.fromarray((lum*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10)),np.float32)/255
detail=np.clip(lum/np.maximum(blur,1e-3),0.8,1.18)
X,Y,Z=P[...,0],P[...,1],P[...,2]; AX=np.abs(X)
ids=lambda f:[jn.index(n) for n in jn if f(n)]
foot=np.isin(D,ids(lambda n:'Foot' in n or 'Toe' in n))
arm=np.isin(D,ids(lambda n:'Arm' in n or 'Hand' in n))
top=C&(uu<.5)&(vv>.5); bot=C&(uu>=.5)&(uu<.75)&(vv<.5)
shoes=bot&foot; pants=bot&~foot
hex2=lambda h:np.array([int(h[i:i+2],16) for i in (1,3,5)])/255
WHITE=hex2('#ecebe6'); BLUE=hex2('#8db9e3'); SHORT=hex2('#55574f'); RED=hex2('#c8202a'); BLACK=hex2('#1b1b1d'); SOLE=hex2('#f2f2ef')
SKIN=np.median(rgb[780:880, 525:630].reshape(-1,3)[::7],0)  # flat skin swatch
print('skin',(SKIN*255).round())
out=rgb.copy(); skinmask=np.zeros((T,T),bool)
def put(m,col,k=1.0):
    dd=1+(detail[m]-1)*k; out[m]=np.clip(col*dd[:,None],0,1)
# --- camiseta: proyeccion sobre eje del brazo para corte de manga corta
a0=jp('LeftArm'); a1=jp('LeftForeArm'); ax=a1-a0; L=np.linalg.norm(ax); ax/=L
Q=np.stack([AX,Y,Z],-1); t=((Q-a0)@ax)/L
sleeve_cut=0.42
armpart=top&(arm|(AX>0.20))&(t>-0.05)
skin_arm=top&armpart&(t>sleeve_cut)
neck_y=1.52; raglan=top&~armpart&(AX>0.075+(neck_y-Y)*0.95)&(Y>1.25)
put(top,WHITE,0.35)
put(top&armpart&~skin_arm,BLUE,0.35); put(raglan,BLUE,0.35)
put(skin_arm,SKIN,0.25); skinmask|=skin_arm
# --- short: hasta encima de rodilla
knee=jp('LeftLeg')[1]; hem=knee+0.07
legskin=pants&(Y<hem); shorts=pants&(Y>=hem)
put(shorts,SHORT,1.0); put(legskin,SKIN,0.2); skinmask|=legskin
# dobladillo ligeramente mas oscuro
put(shorts&(Y<hem+0.018),SHORT*0.82,0.6)
# cordon blanco al frente (cuelga bajo el borde de la camiseta)
front=NR[...,2]>0.3
for s in (-1,1):
    cx=s*0.02
    put(pants&front&(np.abs(X-cx)<0.0055)&(Y>0.80)&(Y<0.98),WHITE,0.3)
# --- tenis
put(shoes,WHITE,0.7)
toeZ=Z.max() if False else None
fz=Z[shoes]; zmin,zmax=fz.min(),fz.max()
rel=(Z-zmin)/(zmax-zmin)
put(shoes&(Y<0.022),SOLE,0.3)
put(shoes&(Y>=0.022)&(Y<0.032),RED,0.5)                      # franja roja sobre suela
put(shoes&(Y>=0.04)&(Y<0.085)&(rel>0.25)&(rel<0.62)&(np.abs(NR[...,0])>0.45),RED,0.6)  # panel lateral rojo
put(shoes&(rel<0.2)&(Y>0.035),BLACK,0.5)                      # talon negro
put(shoes&(NR[...,1]>0.55)&(rel>0.38)&(rel<0.75)&(Y>0.07),BLACK,0.5)  # zona de cordones/lengueta
put(shoes&(Y>0.13),SKIN,0.2); skinmask|=shoes&(Y>0.13)        # tobillo visible
res=np.dstack([out,A[...,3:4]])
Image.fromarray((res*255+.5).astype(np.uint8),'RGBA').save('work/new_0.png')
# normal plano en piel repintada
N=np.asarray(Image.open('work/src_1.png')).copy(); N[skinmask,0]=128;N[skinmask,1]=128;N[skinmask,2]=255
Image.fromarray(N,'RGBA').save('work/new_1.png')
print('texels top/pants/shoes/skin',top.sum(),pants.sum(),shoes.sum(),skinmask.sum())
