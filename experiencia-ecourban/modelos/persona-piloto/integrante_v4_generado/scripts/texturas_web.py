"""Recomprime solo las texturas de un GLB (geometria, UV, rig y pesos sin tocar).
base color -> JPEG q92 a su resolucion original; normal y metal/rugosidad -> PNG al lado indicado.
Uso: python3 -I texturas_web.py <entrada.glb> <salida.glb> [lado_normal_mr=2048]"""
import sys, os, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glb
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]; lado = int(sys.argv[3]) if len(sys.argv) > 3 else 2048
j, b = glb.load(src); m = j['materials'][0]
base = j['textures'][m['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
nuevo = {}
for i, im in enumerate(j['images']):
    I = Image.open(io.BytesIO(glb.img(j, b, i))).convert('RGB'); o = io.BytesIO()
    if i == base: I.save(o, 'JPEG', quality=92, subsampling=0); im['mimeType'] = 'image/jpeg'
    else: I.resize((lado, lado), Image.LANCZOS).save(o, 'PNG', optimize=True); im['mimeType'] = 'image/png'
    nuevo[im['bufferView']] = o.getvalue()
out = bytearray()
for k, v in enumerate(j['bufferViews']):
    data = nuevo.get(k) or b[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    while len(out) % 4: out.append(0)
    v['byteOffset'] = len(out); v['byteLength'] = len(data); out.extend(data)
while len(out) % 4: out.append(0)
j['buffers'] = [{'byteLength': len(out)}]
glb.save(dst, j, bytes(out)); print('ok', dst, len(out), {k: len(v) for k, v in nuevo.items()})
