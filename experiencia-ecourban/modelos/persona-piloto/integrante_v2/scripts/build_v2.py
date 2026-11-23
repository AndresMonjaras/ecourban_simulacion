"""Ensambla persona-articulada-integrante-v2.glb: nodos/skin/IBM del destino Mixamo + malla v8 retargeteada."""
import sys, copy, json
sys.path.insert(0, '.')
import glb, numpy as np
DST = "/home/omarbolanos/Documentos/REPOSITORIOS/ecourban_simulacion/experiencia-ecourban/public/models/persona-articulada.glb"; SRC = "/home/omarbolanos/Documentos/REPOSITORIOS/ecourban_simulacion/experiencia-ecourban/public/models/persona-ecourban-v8.glb"
OUT = sys.argv[1]
jd, bd = glb.load(DST); js, bs = glb.load(SRC)
r = np.load('work/retarget.npz')
prim = js['meshes'][0]['primitives'][0]; A = prim['attributes']
UV = glb.acc(js, bs, A['TEXCOORD_1']).astype(np.float32)  # el material v8 usa texCoord 1
IDX = glb.acc(js, bs, prim['indices']).reshape(-1)
out = bytearray(); views = []; accs = []
def add(data, target=None):
    while len(out) % 4: out.append(0)
    v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}
    if target: v['target'] = target
    out.extend(data); views.append(v); return len(views) - 1
def accessor(arr, ctype, typ, target=None, minmax=False):
    a = {'bufferView': add(np.ascontiguousarray(arr).tobytes(), target), 'componentType': ctype, 'count': len(arr), 'type': typ}
    if minmax: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    accs.append(a); return len(accs) - 1
ibm = glb.acc(jd, bd, jd['skins'][0]['inverseBindMatrices']).astype(np.float32)
j = {'asset': {'version': '2.0', 'generator': 'ecourban retarget v2 (numpy)'}, 'scene': 0, 'scenes': copy.deepcopy(jd['scenes'])}
nodes = copy.deepcopy(jd['nodes'][:68])  # 0..67: huesos Mixamo + Armature sin cambios
skin = copy.deepcopy(jd['skins'][0]); skin['inverseBindMatrices'] = accessor(ibm, 5126, 'MAT4')
idx_t = (5125, np.uint32) if IDX.max() > 65535 else (5123, np.uint16)
attrs = {'POSITION': accessor(r['V'], 5126, 'VEC3', 34962, True), 'NORMAL': accessor(r['N'], 5126, 'VEC3', 34962),
         'TEXCOORD_0': accessor(UV, 5126, 'VEC2', 34962), 'JOINTS_0': accessor(r['J'], 5121, 'VEC4', 34962),
         'WEIGHTS_0': accessor(r['W'], 5126, 'VEC4', 34962)}
ind = accessor(IDX.astype(idx_t[1]), idx_t[0], 'SCALAR', 34963)
# imagenes/texturas del v8 (sin recomprimir)
images = []
for im in js['images']:
    v = js['bufferViews'][im['bufferView']]; o = v.get('byteOffset', 0)
    images.append({'name': im.get('name'), 'mimeType': im['mimeType'], 'bufferView': add(bs[o:o + v['byteLength']])})
mat = copy.deepcopy(js['materials'][0]); mat['name'] = 'Integrante_EcoUrban'
for key in ('normalTexture',): mat[key].pop('texCoord', None)
for key in ('baseColorTexture', 'metallicRoughnessTexture'): mat['pbrMetallicRoughness'][key].pop('texCoord', None)
nodes.append({'name': 'Integrante_EcoUrban', 'mesh': 0, 'skin': 0})
nodes[67]['children'] = [66, 68]
j.update({'nodes': nodes, 'skins': [skin], 'meshes': [{'name': 'Integrante_EcoUrban', 'primitives': [{'attributes': attrs, 'indices': ind, 'material': 0}]}],
          'materials': [mat], 'textures': copy.deepcopy(js['textures']), 'samplers': copy.deepcopy(js.get('samplers', [{}])), 'images': images,
          'accessors': accs, 'bufferViews': views})
while len(out) % 4: out.append(0)
j['buffers'] = [{'byteLength': len(out)}]
glb.save(OUT, j, bytes(out))
print('ok', OUT, len(out))
