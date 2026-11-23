import json,struct,numpy as np
CT={5126:np.float32,5123:np.uint16,5121:np.uint8,5125:np.uint32,5122:np.int16,5120:np.int8}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def load(p):
    d=open(p,'rb').read(); l=struct.unpack('<I',d[12:16])[0]; j=json.loads(d[20:20+l])
    o=20+l; bl=struct.unpack('<I',d[o:o+4])[0]; b=d[o+8:o+8+bl]; return j,b
def acc(j,b,i):
    a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]; dt=CT[a['componentType']]; n=NC[a['type']]
    off=bv.get('byteOffset',0)+a.get('byteOffset',0); st=bv.get('byteStride',0); isz=np.dtype(dt).itemsize*n
    if st and st!=isz:
        raw=np.frombuffer(b,np.uint8,a['count']*st,off).reshape(a['count'],st)[:,:isz].copy()
        r=raw.view(dt).reshape(a['count'],n)
    else: r=np.frombuffer(b,dt,a['count']*n,off).reshape(a['count'],n)
    if a.get('normalized'): r=r.astype(np.float32)/np.iinfo(dt).max
    return r
def img(j,b,i):
    bv=j['bufferViews'][j['images'][i]['bufferView']]; o=bv.get('byteOffset',0); return b[o:o+bv['byteLength']]
def save(p,j,b):
    js=json.dumps(j,separators=(',',':')).encode(); js+=b' '*((4-len(js)%4)%4); b=b+b'\0'*((4-len(b)%4)%4)
    tot=12+8+len(js)+8+len(b)
    open(p,'wb').write(struct.pack('<III',0x46546C67,2,tot)+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(b),0x004E4942)+b)
