"""Rig Mixamo (67 joints, mismos nombres/jerarquia/orden que persona-articulada.glb) ajustado al
modelo generado de alta resolucion, SIN deformar su malla: la pose T del modelo es la pose de bind.

- Malla, UV, normales, texturas y material del modelo generado: sin cambios (solo se hornea la
  rotacion del nodo y una escala uniforme).
- Joints: colocados en las articulaciones medidas del modelo (lineas centrales por secciones).
- Pesos: por region (torso / brazo / pierna / cabeza) y parametro a lo largo de cada cadena,
  con transiciones suaves en articulaciones.

Uso: python3 -I rig_generado.py <modelo_generado.glb> <salida.glb>
"""
import sys, os, json, copy, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glb, manos, textura, numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
DST = '/home/omarbolanos/Documentos/REPOSITORIOS/ecourban_simulacion/experiencia-ecourban/public/models/persona-articulada.glb'
ESCALA_APP = 0.94            # escalaAltura del perfil de la app
PIERNA_CANONICA = 0.83       # cadera->tobillo de la pose canonica (LONG_MUSLO + LONG_PANTORRILLA ~ 0.83)

jd, bd = glb.load(DST); js, bs = glb.load(SRC)
JN = [jd['nodes'][k]['name'] for k in jd['skins'][0]['joints']]
prim = js['meshes'][0]['primitives'][0]; A = prim['attributes']
V = glb.acc(js, bs, A['POSITION']).astype(np.float64); N = glb.acc(js, bs, A['NORMAL']).astype(np.float64)
x_, y_, z_, w_ = js['nodes'][0].get('rotation', [0, 0, 0, 1])
R = np.array([[1 - 2 * (y_ * y_ + z_ * z_), 2 * (x_ * y_ - z_ * w_), 2 * (x_ * z_ + y_ * w_)],
              [2 * (x_ * y_ + z_ * w_), 1 - 2 * (x_ * x_ + z_ * z_), 2 * (y_ * z_ - x_ * w_)],
              [2 * (x_ * z_ - y_ * w_), 2 * (y_ * z_ + x_ * w_), 1 - 2 * (x_ * x_ + y_ * y_)]])
V = V @ R.T; N = N @ R.T
V[:, 1] -= V[:, 1].min()
# manos: surcos entre dedos mas marcados + oclusion por color de vertice (solo vertices de las manos)
I3 = glb.acc(js, bs, prim['indices']).reshape(-1, 3).astype(np.int64)
if os.environ.get('MANOS', '1') == '1':
    V, toc, OCC = manos.ajustar_manos(V, I3); N = manos.normales_locales(V, I3, N, toc)
else:
    OCC = None
X, Y, Z = V.T

def sm(a, b, t):
    u = np.clip((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u)
def slice_center(axis, val, mask, tol):
    s = mask & (np.abs(V[:, axis] - val) < tol)
    P = V[s]; return (P.min(0) + P.max(0)) / 2, s.sum()

# ------------------------------------------------ articulaciones medidas (unidades del modelo, pose T)
J = {}
# hombro: pivote del brazo (x, descenso bajo la linea central) y altura de la clavicula, en unidades del modelo
ARM_X = float(os.environ.get('ARM_X', 0.130)); ARM_DROP = float(os.environ.get('ARM_DROP', 0.015)); SH_Y = float(os.environ.get('SH_Y', 0.760))
Y_CADERA, Y_RODILLA, Y_TOBILLO = 0.4986, 0.255, 0.052          # cabeza de femur, rodilla, tobillo
for s_, sx in (('Left', 1), ('Right', -1)):
    side = (X * sx > 0.0)
    for nm, yy in (('UpLeg', Y_CADERA), ('Leg', Y_RODILLA), ('Foot', Y_TOBILLO + 0.02)):
        m = side & (np.abs(X) < 0.17) & (np.abs(X) > (0.0 if nm != 'UpLeg' else 0.02))
        c, _ = slice_center(1, yy, m, 0.004)
        J[s_ + nm] = np.array([c[0], yy, c[2]])
    J[s_ + 'Foot'][1] = Y_TOBILLO; J[s_ + 'Foot'][2] = -0.029
    J[s_ + 'ToeBase'] = np.array([J[s_ + 'Foot'][0], 0.0116, 0.0406])
    zf = Z[side & (Y < 0.05) & (np.abs(X) < 0.2)].max()
    J[s_ + 'Toe_End'] = np.array([J[s_ + 'Foot'][0], 0.0116, zf - 0.008])
    # brazo: linea central por secciones en x
    def arm_pt(xx):
        m = side & (Y > 0.74) & (np.abs(X) > 0.09)
        c, n = slice_center(0, sx * xx, m, 0.004); return np.array([sx * xx, c[1], c[2]])
    J[s_ + 'Shoulder'] = np.array([sx * 0.025, SH_Y, -0.016])
    J[s_ + 'Arm'] = arm_pt(ARM_X) - np.array([0, ARM_DROP, 0]); J[s_ + 'ForeArm'] = arm_pt(float(os.environ.get('CODO_X', 0.255))); J[s_ + 'Hand'] = arm_pt(0.394)
    xmax = np.abs(X[side & (Y > 0.74)]).max()
    hand_dir = np.array([sx, 0, 0]); h = J[s_ + 'Hand']
    for f, dz in (('Index', 0.013), ('Middle', 0.004), ('Ring', -0.006), ('Pinky', -0.015)):
        base = np.array([sx * 0.440, h[1] + 0.002, h[2] + dz]); L = (xmax - 0.440) * (0.95 if f != 'Pinky' else 0.8)
        for k in range(4): J[f'{s_}Hand{f}{k + 1}'] = base + hand_dir * L * k / 3
    tb = np.array([sx * 0.405, h[1] - 0.008, h[2] + 0.018])
    for k in range(4): J[f'{s_}HandThumb{k + 1}'] = tb + np.array([sx * 0.012, -0.002, 0.012]) * k
torso = (np.abs(X) < 0.13)
def spine_pt(yy):
    c, _ = slice_center(1, yy, torso, 0.004); return np.array([0.0, yy, c[2]])
J['Hips'] = spine_pt(Y_CADERA); J['Spine'] = spine_pt(0.580); J['Spine1'] = spine_pt(0.649); J['Spine2'] = spine_pt(0.736)
J['Neck'] = spine_pt(0.823); J['Head'] = spine_pt(0.870)
J['HeadTop_End'] = np.array([0.0, Y.max() - 0.012, J['Head'][2] + 0.01])
for s_, sx in (('Left', 1), ('Right', -1)): J[s_ + 'Eye'] = np.array([sx * 0.021, 0.925, 0.105])
# la app orienta cada hueso por direccion: la cadena columna->cabeza copia la inclinacion (dz/dy) de cada
# segmento del rig Mixamo original, para que la pose canonica no eche la cabeza hacia atras
_ibm = glb.acc(jd, bd, jd['skins'][0]['inverseBindMatrices']).reshape(-1, 4, 4)
_ow = {nm: np.linalg.inv(_ibm[i].T)[:3, 3] for i, nm in enumerate(JN)}
_ch = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'HeadTop_End']
for p_, c_ in zip(_ch, _ch[1:]):
    d = _ow[c_] - _ow[p_]; J[c_][2] = J[p_][2] + (J[c_][1] - J[p_][1]) * d[2] / d[1]
for s_, sx in (('Left', 1), ('Right', -1)): J[s_ + 'Eye'][2] = J['Head'][2] + 0.09
missing = [n for n in JN if n not in J]; assert not missing, missing

# ------------------------------------------------ escala: pierna (cadera->tobillo) = canonica / escala de la app
leg = np.mean([np.linalg.norm(J[s + 'UpLeg'] - J[s + 'Leg']) + np.linalg.norm(J[s + 'Leg'] - J[s + 'Foot']) for s in ('Left', 'Right')])
S = PIERNA_CANONICA / ESCALA_APP / leg
print(f'escala {S:.4f} | altura interna {Y.max() * S:.3f} m | altura mostrada en app {Y.max() * S * ESCALA_APP:.3f} m | cadera {J["Hips"][1] * S:.4f}')

# ------------------------------------------------ pesos (en unidades del modelo)
n = len(V); Wb = {}
def add(b, w):
    w = np.asarray(w, np.float64)
    Wb[b] = Wb.get(b, 0) + w
AX = np.abs(X); left = X > 0
# 1) partes: brazo (a), pierna (l), resto torso/cabeza (t)
a = sm(0.110, 0.165, AX) * sm(0.755, 0.800, Y)                 # transicion hombro/axila
a = np.where(AX > 0.18, (Y > 0.70).astype(float), a)
l = sm(0.530, 0.400, Y) * (1 - a)
t = 1 - a - l
# 2) torso por altura (cadena Hips..Head)
ks = [J[k][1] for k in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head')]; names = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head']
yy = np.clip(Y, ks[0], ks[-1])
for i in range(len(ks) - 1):
    u = np.clip((yy - ks[i]) / (ks[i + 1] - ks[i]), 0, 1); u = u * u * (3 - 2 * u)
    inseg = (yy >= ks[i]) & (yy <= ks[i + 1]) if i < len(ks) - 2 else (yy >= ks[i])
    seg = inseg & ~((yy == ks[i + 1]) & (i < len(ks) - 2))
    add(names[i], t * seg * (1 - u)); add(names[i + 1], t * seg * u)
# hombro: la parte alta lateral del torso (trapecio, hombro de la camiseta) sigue en parte al hueso Shoulder
SH_W = float(os.environ.get('SH_W', 0.85))
SA_ANCHO = float(os.environ.get('SA_ANCHO', 0.035)); SA_TOP = float(os.environ.get('SA_TOP', 0.005))
shs = {s_: sm(0.05, 0.12, AX) * sm(0.70, 0.79, Y) * sm(0.875, 0.845, Y) * msk * SH_W for s_, msk in (('Left', left), ('Right', ~left))}
keep = 1 - shs['Left'] - shs['Right']
for b_ in names: Wb[b_] = Wb[b_] * keep
for s_ in shs: add(s_ + 'Shoulder', shs[s_] * t)
# 3) brazos por x (pose T: brazos horizontales)
for s_, msk in (('Left', left), ('Right', ~left)):
    w = a * msk
    xs = [abs(J[s_ + k][0]) for k in ('Shoulder', 'Arm', 'ForeArm', 'Hand')]
    # transicion clavicula -> brazo repartida sobre el deltoides; la parte alta sigue mas a la clavicula
    top_ = np.clip((Y - J[s_ + 'Arm'][1]) / 0.06, 0, 1) * SA_TOP
    u_sa = sm(ARM_X - 0.03 + top_, ARM_X + SA_ANCHO + top_, AX)                                  # Shoulder -> Arm
    u_e = sm(xs[2] - 0.022, xs[2] + 0.022, AX)                  # codo
    u_w = sm(xs[3] - 0.012, xs[3] + 0.010, AX)                  # muneca
    add(s_ + 'Shoulder', w * (1 - u_sa)); add(s_ + 'Arm', w * u_sa * (1 - u_e)); add(s_ + 'ForeArm', w * u_e * (1 - u_w)); add(s_ + 'Hand', w * u_w)
# 4) piernas por altura
for s_, msk in (('Left', left), ('Right', ~left)):
    w = l * msk
    u_h = sm(J[s_ + 'Leg'][1] + 0.03, J[s_ + 'Leg'][1] - 0.03, Y)    # rodilla
    u_a = sm(J[s_ + 'Foot'][1] + 0.035, J[s_ + 'Foot'][1] - 0.005, Y)  # tobillo / cana del tenis
    u_t = sm(J[s_ + 'ToeBase'][2] - 0.015, J[s_ + 'ToeBase'][2] + 0.025, Z) * u_a
    add(s_ + 'UpLeg', w * (1 - u_h)); add(s_ + 'Leg', w * u_h * (1 - u_a)); add(s_ + 'Foot', w * u_a * (1 - u_t / np.maximum(u_a, 1e-9) * (u_a > 0))); add(s_ + 'ToeBase', w * u_t)
    # cadera: la parte alta de la pierna del short reparte con Hips
    hipmix = sm(0.40, 0.53, Y) * msk * l
    add('Hips', hipmix * 0.0)
# normalizar y quedarse con 4
bones = list(Wb.keys()); M = np.stack([np.clip(np.broadcast_to(Wb[b], (n,)), 0, None) for b in bones], 1).astype(np.float32)
top = np.argsort(-M, 1)[:, :4]; Wt = np.take_along_axis(M, top, 1); ssum = Wt.sum(1, keepdims=True)
assert (ssum > 1e-6).all(), 'vertices sin peso'
Wt /= ssum; Jt = np.vectorize(lambda i: JN.index(bones[i]))(top).astype(np.uint8)
print('huesos con peso:', len(bones), '| vertices', n)

# ------------------------------------------------ jerarquia Mixamo con reposo en la pose T del modelo
parent = {}
for i, nd in enumerate(jd['nodes']):
    for c in nd.get('children', []): parent[c] = i
nodes = copy.deepcopy(jd['nodes'][:68])
name_of = {i: nd.get('name') for i, nd in enumerate(jd['nodes'])}
Jw = {k: v * S for k, v in J.items()}
for i in range(67):
    nm = nodes[i]['name']; p = parent.get(i); pnm = name_of.get(p)
    pw = Jw[pnm] if pnm in Jw else np.zeros(3)
    nodes[i]['translation'] = (Jw[nm] - pw).tolist(); nodes[i].pop('rotation', None); nodes[i].pop('scale', None)
ibm = np.zeros((67, 4, 4), np.float32)
for i, nm in enumerate(JN):
    m = np.eye(4); m[:3, 3] = -Jw[nm]; ibm[i] = m.T  # column-major
# ------------------------------------------------ GLB
out = bytearray(); views = []; accs = []
def add_view(data, target=None):
    while len(out) % 4: out.append(0)
    v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}
    if target: v['target'] = target
    out.extend(data); views.append(v); return len(views) - 1
def accessor(arr, ctype, typ, target=None, minmax=False):
    a_ = {'bufferView': add_view(np.ascontiguousarray(arr).tobytes(), target), 'componentType': ctype, 'count': len(arr), 'type': typ}
    if minmax: a_['min'] = arr.min(0).tolist(); a_['max'] = arr.max(0).tolist()
    accs.append(a_); return len(accs) - 1
UV = glb.acc(js, bs, A['TEXCOORD_0']).astype(np.float32); IDX = glb.acc(js, bs, prim['indices']).reshape(-1).astype(np.uint32)
skin = copy.deepcopy(jd['skins'][0]); skin['inverseBindMatrices'] = accessor(ibm.reshape(-1, 16), 5126, 'MAT4')
attrs = {'POSITION': accessor((V * S).astype(np.float32), 5126, 'VEC3', 34962, True), 'NORMAL': accessor(N.astype(np.float32), 5126, 'VEC3', 34962),
         'TEXCOORD_0': accessor(UV, 5126, 'VEC2', 34962), 'JOINTS_0': accessor(Jt, 5121, 'VEC4', 34962), 'WEIGHTS_0': accessor(Wt.astype(np.float32), 5126, 'VEC4', 34962)}
if OCC is not None:
    col = np.repeat(np.round(np.clip(OCC, 0, 1) * 255).astype(np.uint8)[:, None], 4, 1); col[:, 3] = 255
    attrs['COLOR_0'] = accessor(col, 5121, 'VEC4', 34962); accs[attrs['COLOR_0']]['normalized'] = True
ind = accessor(IDX, 5125, 'SCALAR', 34963)
images = []
base_src = js['textures'][js['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
for k_, im in enumerate(js['images']):
    v = js['bufferViews'][im['bufferView']]; o = v.get('byteOffset', 0); data = bs[o:o + v['byteLength']]; mime = im['mimeType']
    if k_ == base_src and os.environ.get('TEXTURA', '1') == '1':   # mancha azul de manga pintada sobre la piel del brazo
        from PIL import Image; import io as _io
        tx = textura.limpiar_azul_brazos(np.asarray(Image.open(_io.BytesIO(data)).convert('RGB')), UV, V, IDX.reshape(-1, 3).astype(np.int64))
        b_ = _io.BytesIO(); Image.fromarray(tx).save(b_, 'PNG'); data = b_.getvalue(); mime = 'image/png'
    images.append({'name': im.get('name'), 'mimeType': mime, 'bufferView': add_view(data)})
nodes.append({'name': 'Integrante_Generado', 'mesh': 0, 'skin': 0}); nodes[67]['children'] = [66, 68]
j = {'asset': {'version': '2.0', 'generator': 'ecourban rig Mixamo sobre modelo generado (numpy)'}, 'scene': 0, 'scenes': copy.deepcopy(jd['scenes']),
     'nodes': nodes, 'skins': [skin], 'meshes': [{'name': 'Integrante_Generado', 'primitives': [{'attributes': attrs, 'indices': ind, 'material': 0}]}],
     'materials': copy.deepcopy(js['materials']), 'textures': copy.deepcopy(js['textures']), 'samplers': copy.deepcopy(js.get('samplers', [{}])),
     'images': images, 'accessors': accs, 'bufferViews': views}
if js.get('extensionsUsed'): j['extensionsUsed'] = js['extensionsUsed']
while len(out) % 4: out.append(0)
j['buffers'] = [{'byteLength': len(out)}]
glb.save(OUT, j, bytes(out))
json.dump({'escala': S, 'alturaCaderaReposo': float(Jw['Hips'][1]), 'joints': {k: v.tolist() for k, v in Jw.items()}}, open(os.path.splitext(OUT)[0] + '_rig.json', 'w'), indent=1)
print('ok', OUT, len(out))
