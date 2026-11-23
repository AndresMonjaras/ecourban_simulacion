import sys,io,math,copy; sys.path.insert(0,'.'); import glb,numpy as np
from PIL import Image
SRC='/home/omarbolanos/Documentos/REPOSITORIOS/ecourban_simulacion/experiencia-ecourban/public/models/persona-articulada.glb'
OUT=sys.argv[1]
j,b=glb.load(SRC); j=copy.deepcopy(j)
HEAD=[j['nodes'][k]['name'] for k in j['skins'][0]['joints']].index('Head')
# ---------- geometria de gorra (espacio de bind, igual que la malla del cuerpo)
C=np.array([0,1.768,0.018]); R=np.array([0.112,0.112,0.13])
def edge_y(z): return 1.775+(z-0.13)*0.24
def crown_pt(th,s):  # th: angulo alrededor de Y (0 = frente +Z), s: 0 borde .. 1 tope
    d=np.array([math.sin(th),0,math.cos(th)])
    # buscar angulo polar del borde
    def P(phi): return C+np.array([R[0]*math.sin(phi)*d[0],R[1]*math.cos(phi),R[2]*math.sin(phi)*d[2]])
    lo,hi=0.0,math.pi
    for _ in range(40):
        m=(lo+hi)/2; p=P(m)
        if p[1]>edge_y(p[2]): lo=m
        else: hi=m
    return P(lo*(1-s)**0.9 if False else lo*(1-s))
NT,NS=48,12
V=[];F_black=[];F_green=[]
grid=np.zeros((NS+1,NT),int)
for i in range(NS+1):
    for k in range(NT):
        th=2*math.pi*k/NT; grid[i,k]=len(V); V.append(crown_pt(th,i/NS))
for i in range(NS):
    for k in range(NT):
        a,b_,c,d=grid[i,k],grid[i,(k+1)%NT],grid[i+1,(k+1)%NT],grid[i+1,k]
        F_black+= [(a,c,b_),(a,d,c)]
# interior (cara interna oscura) para que no se vea hueca desde abajo
off=len(V)
for i in range(NS+1):
    for k in range(NT): V.append(V[grid[i,k]]+(C-V[grid[i,k]])*0.03)
for i in range(NS):
    for k in range(NT):
        a,b_,c,d=[off+x for x in (grid[i,k],grid[i,(k+1)%NT],grid[i+1,(k+1)%NT],grid[i+1,k])]
        F_black+= [(a,b_,c),(a,c,d)]
# visera
NB=17; L=0.085; th_max=math.radians(58); tilt=-0.18; thick=0.006
top=[];bot=[]
for k in range(NB):
    th=-th_max+2*th_max*k/(NB-1); p=crown_pt(th,0.0)
    dirv=np.array([math.sin(th)*0.55,0,math.cos(th)]); dirv/=np.linalg.norm(dirv)
    l=L*max(0.0,math.cos(th*1.45))**0.7+0.004
    q=p+dirv*l+np.array([0,tilt*l,0]); q[1]-= 0.004*abs(math.sin(th))*0  # curvatura leve
    q[1]-=0.01*(abs(th)/th_max)**2
    for pt,lst,dy in ((p,top,0),(q,top,0)): pass
    top.append((len(V),len(V)+1)); V+= [p+np.array([0,0.001,0]),q]
    bot.append((len(V),len(V)+1)); V+= [p+np.array([0,-thick+0.001,0]),q+np.array([0,-thick,0])]
for k in range(NB-1):
    (a,b_),(c,d)=top[k],top[k+1]; F_black+= [(a,d,b_),(a,c,d)]
    (a,b_),(c,d)=bot[k],bot[k+1]; F_green+= [(a,b_,d),(a,d,c)]
    F_black+= [(top[k][1],bot[k+1][1],bot[k][1]),(top[k][1],top[k+1][1],bot[k+1][1])]  # canto
# emblema verde al frente de la copa
ec=crown_pt(0,0.33); n=(ec-C)/R**2; n/=np.linalg.norm(n); up=np.array([0,1,0]); up=up-n*up.dot(n); up/=np.linalg.norm(up); rt=np.cross(up,n)
e0=len(V); w,h=0.018,0.014
for sx,sy in ((-1,-1),(1,-1),(1,1),(-1,1)): V.append(ec+n*0.0025+rt*sx*w+up*sy*h)
F_green+= [(e0,e0+1,e0+2),(e0,e0+2,e0+3)]
# boton superior negro ya cubierto por la copa
V=np.array(V,np.float32)
def normals(V,F):
    N=np.zeros_like(V)
    for f in F:
        a,b_,c=V[list(f)]; nn=np.cross(b_-a,c-a); N[list(f)]+=nn
    l=np.linalg.norm(N,axis=1,keepdims=True); return N/np.maximum(l,1e-9)
# primitivas con vertices propios (normales no compartidas entre materiales)
prims=[]
for F,mat in ((F_black,'Gorra_Negro'),(F_green,'Gorra_Verde')):
    used=sorted({i for f in F for i in f}); remap={o:n for n,o in enumerate(used)}
    PV=V[used]; FF=np.array([[remap[i] for i in f] for f in F],np.uint16)
    prims.append((PV,normals(PV,FF),FF,mat))
# ---------- texturas nuevas
def png(path):
    bio=io.BytesIO(); Image.open(path).save(bio,'PNG',optimize=True); return bio.getvalue()
newimg={0:png('work/new_0.png'),1:png('work/new_1.png')}
# ---------- reconstruir buffer
img_bv={im['bufferView']:i for i,im in enumerate(j['images'])}
out=bytearray()
def add(data):
    while len(out)%4: out.append(0)
    o=len(out); out.extend(data); return o
for vi,bv in enumerate(j['bufferViews']):
    data=b[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
    if vi in img_bv and img_bv[vi] in newimg: data=newimg[img_bv[vi]]
    bv['byteOffset']=add(data); bv['byteLength']=len(data)
def view(data,target=None):
    o=add(data); v={'buffer':0,'byteOffset':o,'byteLength':len(data)}
    if target: v['target']=target
    j['bufferViews'].append(v); return len(j['bufferViews'])-1
def accessor(arr,ctype,typ,target,minmax=False):
    a={'bufferView':view(arr.tobytes(),target),'componentType':ctype,'count':len(arr),'type':typ}
    if minmax: a['min']=arr.min(0).tolist(); a['max']=arr.max(0).tolist()
    j['accessors'].append(a); return len(j['accessors'])-1
mats={}
for name,col in (('Gorra_Negro',[0.012,0.012,0.014,1]),('Gorra_Verde',[0.03,0.30,0.07,1])):
    j['materials'].append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':col,'metallicFactor':0,'roughnessFactor':0.85},'doubleSided':True}); mats[name]=len(j['materials'])-1
gp=[]
for PV,NV,FF,mat in prims:
    n=len(PV)
    J=np.zeros((n,4),np.uint8); J[:,0]=HEAD; W=np.zeros((n,4),np.float32); W[:,0]=1
    gp.append({'attributes':{'POSITION':accessor(PV,5126,'VEC3',34962,True),'NORMAL':accessor(NV.astype(np.float32),5126,'VEC3',34962),
        'JOINTS_0':accessor(J,5121,'VEC4',34962),'WEIGHTS_0':accessor(W,5126,'VEC4',34962)},'indices':accessor(FF.reshape(-1),5123,'SCALAR',34963),'material':mats[mat]})
j['meshes'].append({'name':'Gorra_EcoUrban','primitives':gp})
j['nodes'].append({'name':'Gorra_EcoUrban','mesh':len(j['meshes'])-1,'skin':0})
arm=next(n for n in j['nodes'] if n.get('name')=='Armature'); arm['children'].append(len(j['nodes'])-1)
j['buffers']=[{'byteLength':0}]
while len(out)%4: out.append(0)
j['buffers'][0]['byteLength']=len(out)
glb.save(OUT,j,bytes(out))
print('verts gorra',sum(len(p[0]) for p in prims),'tris',sum(len(p[2]) for p in prims))
