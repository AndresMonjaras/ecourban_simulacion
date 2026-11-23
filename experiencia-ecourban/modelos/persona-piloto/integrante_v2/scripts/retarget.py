"""Retarget de la malla del integrante (v8, Rigify) al esqueleto Mixamo de persona-articulada.glb.

Etapa 1: re-pose LBS con los pesos propios de v8 (T-pose -> direcciones de hueso del destino, longitudes v8).
Etapa 2: warp thin-plate (TPS) que lleva las articulaciones re-posadas de v8 sobre las del destino.
Pesos: remapeo DEF-* -> joints Mixamo (suma de duplicados, top-4, normalizado).
"""
import sys, math, json
sys.path.insert(0, '.')
import glb, numpy as np

DST = '/home/omarbolanos/Documentos/REPOSITORIOS/ecourban_simulacion/experiencia-ecourban/public/models/persona-articulada.glb'
SRC = '/home/omarbolanos/Documentos/REPOSITORIOS/ecourban_simulacion/experiencia-ecourban/public/models/persona-ecourban-v8.glb'
PERP_TORSO_X = float(sys.argv[1]) if len(sys.argv) > 1 else 0.85
GIRTH = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0

jd, bd = glb.load(DST); js, bs = glb.load(SRC)
dn = [jd['nodes'][k]['name'] for k in jd['skins'][0]['joints']]
sn = [js['nodes'][k]['name'] for k in js['skins'][0]['joints']]
def jworld(j, b):
    ibm = glb.acc(j, b, j['skins'][0]['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    return np.linalg.inv(ibm)
DW = jworld(jd, bd); SW = jworld(js, bs)
P = {n: DW[i][:3, 3].astype(np.float64) for i, n in enumerate(dn)}
H = {n: SW[i][:3, 3].astype(np.float64) for i, n in enumerate(sn)}
Yax = {n: SW[i][:3, 1] / np.linalg.norm(SW[i][:3, 1]) for i, n in enumerate(sn)}

prim = js['meshes'][0]['primitives'][0]; A = prim['attributes']
V = glb.acc(js, bs, A['POSITION']).astype(np.float64)
N = glb.acc(js, bs, A['NORMAL']).astype(np.float64)
J = glb.acc(js, bs, A['JOINTS_0']).astype(int); W = glb.acc(js, bs, A['WEIGHTS_0']).astype(np.float64)

# ---- colas de huesos v8 (Rigify: cola = cabeza del siguiente en la cadena)
side = ['L', 'R']
toe_len = {}
for s in side:
    sx = 1 if s == 'L' else -1
    m = (J[:, 0] == sn.index(f'DEF-toe.{s}')) | (J[:, 0] == sn.index(f'DEF-foot.{s}'))
    toe_len[s] = V[m & (V[:, 0] * sx > 0), 2].max() - H[f'DEF-toe.{s}'][2]
TOP_V8 = V[:, 1].max()
tail = {}
for s in side:
    for a, b_ in [('thigh', 'thigh.{s}.001'), ('thigh.{s}.001', 'shin'), ('shin', 'shin.{s}.001'), ('shin.{s}.001', 'foot'), ('foot', 'toe'),
                  ('shoulder', 'upper_arm'), ('upper_arm', 'upper_arm.{s}.001'), ('upper_arm.{s}.001', 'forearm'), ('forearm', 'forearm.{s}.001'),
                  ('forearm.{s}.001', 'hand'), ('hand', 'f_middle.01')]:
        na = 'DEF-' + (a.format(s=s) if '{s}' in a else f'{a}.{s}'); nb = 'DEF-' + (b_.format(s=s) if '{s}' in b_ else f'{b_}.{s}')
        tail[na] = H[nb]
    tail[f'DEF-toe.{s}'] = H[f'DEF-toe.{s}'] + Yax[f'DEF-toe.{s}'] * toe_len[s]
for a, b_ in [('DEF-spine', 'DEF-spine.001'), ('DEF-spine.001', 'DEF-spine.002'), ('DEF-spine.002', 'DEF-spine.003'), ('DEF-spine.003', 'DEF-spine.004'),
              ('DEF-spine.004', 'DEF-spine.005'), ('DEF-spine.005', 'DEF-spine.006')]:
    tail[a] = H[b_]
tail['DEF-spine.006'] = H['DEF-spine.006'] + Yax['DEF-spine.006'] * (TOP_V8 - H['DEF-spine.006'][1]) / Yax['DEF-spine.006'][1]

# ---- segmento destino (direccion objetivo) por hueso v8
def M(s, n): return ('Left' if s == 'L' else 'Right') + n
tgt = {}
for s in side:
    tgt[f'DEF-thigh.{s}'] = (P[M(s, 'UpLeg')], P[M(s, 'Leg')]); tgt[f'DEF-thigh.{s}.001'] = tgt[f'DEF-thigh.{s}']
    tgt[f'DEF-shin.{s}'] = (P[M(s, 'Leg')], P[M(s, 'Foot')]); tgt[f'DEF-shin.{s}.001'] = tgt[f'DEF-shin.{s}']
    tgt[f'DEF-foot.{s}'] = (P[M(s, 'Foot')], P[M(s, 'ToeBase')]); tgt[f'DEF-toe.{s}'] = (P[M(s, 'ToeBase')], P[M(s, 'Toe_End')])
    tgt[f'DEF-shoulder.{s}'] = (P[M(s, 'Shoulder')], P[M(s, 'Arm')])
    tgt[f'DEF-upper_arm.{s}'] = (P[M(s, 'Arm')], P[M(s, 'ForeArm')]); tgt[f'DEF-upper_arm.{s}.001'] = tgt[f'DEF-upper_arm.{s}']
    tgt[f'DEF-forearm.{s}'] = (P[M(s, 'ForeArm')], P[M(s, 'Hand')]); tgt[f'DEF-forearm.{s}.001'] = tgt[f'DEF-forearm.{s}']
    tgt[f'DEF-hand.{s}'] = (P[M(s, 'Hand')], P[M(s, 'HandMiddle1')])
tgt['DEF-spine'] = (P['Hips'], P['Spine']); tgt['DEF-spine.001'] = (P['Spine'], P['Spine1']); tgt['DEF-spine.002'] = (P['Spine1'], P['Spine2'])
tgt['DEF-spine.003'] = (P['Spine2'], P['Neck']); tgt['DEF-spine.004'] = (P['Neck'], P['Head']); tgt['DEF-spine.005'] = tgt['DEF-spine.004']
tgt['DEF-spine.006'] = (P['Head'], P['HeadTop_End'])

def unit(v): return v / np.linalg.norm(v)
def fromto(a, b):
    a, b = unit(a), unit(b); v = np.cross(a, b); c = a.dot(b)
    if np.linalg.norm(v) < 1e-9: return np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K * (1 / (1 + c))
def frame(d, side_v):
    x = unit(d); z = unit(np.cross(x, side_v)); y = np.cross(z, x); return np.stack([x, y, z], 1)

R = {}
for b_ in tgt:
    R[b_] = fromto(tail[b_] - H[b_], tgt[b_][1] - tgt[b_][0])
for s in side:  # mano rigida alineando direccion y plano de la palma
    fs = frame(H[f'DEF-f_middle.01.{s}'] - H[f'DEF-hand.{s}'], H[f'DEF-f_index.01.{s}'] - H[f'DEF-f_pinky.01.{s}'])
    fd = frame(P[M(s, 'HandMiddle1')] - P[M(s, 'Hand')], P[M(s, 'HandIndex1')] - P[M(s, 'HandPinky1')])
    R[f'DEF-hand.{s}'] = fd @ fs.T
parent = {}
for s in side:
    ch = ['thigh.{s}', 'thigh.{s}.001', 'shin.{s}', 'shin.{s}.001', 'foot.{s}', 'toe.{s}']
    parent[f'DEF-thigh.{s}'] = 'DEF-spine'
    for a, b_ in zip(ch, ch[1:]): parent['DEF-' + b_.format(s=s)] = 'DEF-' + a.format(s=s)
    ch = ['shoulder.{s}', 'upper_arm.{s}', 'upper_arm.{s}.001', 'forearm.{s}', 'forearm.{s}.001', 'hand.{s}']
    parent[f'DEF-shoulder.{s}'] = 'DEF-spine.003'
    for a, b_ in zip(ch, ch[1:]): parent['DEF-' + b_.format(s=s)] = 'DEF-' + a.format(s=s)
    parent[f'DEF-pelvis.{s}'] = 'DEF-spine'
for a, b_ in zip(['spine', 'spine.001', 'spine.002', 'spine.003', 'spine.004', 'spine.005'], ['spine.001', 'spine.002', 'spine.003', 'spine.004', 'spine.005', 'spine.006']):
    parent['DEF-' + b_] = 'DEF-' + a
for n in sn:  # dedos/palmas/pelvis: rigidos con su hueso padre de mano o cadera
    if n not in R:
        par = 'DEF-hand.' + n[-1] if n[-2:] in ('.L', '.R') and 'pelvis' not in n else 'DEF-spine'
        R[n] = None; parent.setdefault(n, par)
T = {}
def solve(n):
    if n in T: return T[n]
    if R[n] is None:  # hereda transformacion rigida del padre
        T[n] = solve(parent[n]); return T[n]
    p = parent.get(n)
    head = H[n] if p is None else apply(p, H[n])
    T[n] = (R[n], head, H[n]); return T[n]
def apply(n, x):
    Rm, newh, oldh = solve(n); return (x - oldh) @ Rm.T + newh
for n in sn: solve(n)
# ---- etapa 1: LBS
Vp = np.zeros_like(V); Np = np.zeros_like(N)
for k in range(4):
    for ji in np.unique(J[:, k]):
        m = (J[:, k] == ji) & (W[:, k] > 0)
        if not m.any(): continue
        Rm, newh, oldh = T[sn[ji]]
        Vp[m] += W[m, k:k + 1] * ((V[m] - oldh) @ Rm.T + newh)
        Np[m] += W[m, k:k + 1] * (N[m] @ Rm.T)
Q = {n: apply(n, H[n]) for n in sn}
Qtail = {n: apply(n, tail[n]) for n in tail}

# ---- etapa 2: TPS articulaciones re-posadas v8 -> articulaciones destino
src_pts, dst_pts = [], []
def pair(a, b_): src_pts.append(a); dst_pts.append(b_)
pair(Q['DEF-spine'], P['Hips']); pair(Q['DEF-spine.001'], P['Spine']); pair(Q['DEF-spine.002'], P['Spine1']); pair(Q['DEF-spine.003'], P['Spine2'])
# cuello: mezcla entre la longitud v8 y la del destino; la cabeza conserva su escala v8 (escala 1)
HEAD_SCALE = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
NECK_MIX = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
neck_v8 = Q['DEF-spine.006'] - Q['DEF-spine.004']; neck_d = P['Head'] - P['Neck']
head_base = P['Neck'] + unit(neck_d) * (NECK_MIX * np.linalg.norm(neck_d) + (1 - NECK_MIX) * np.linalg.norm(neck_v8))
s_head = HEAD_SCALE
head_axis = unit(P['HeadTop_End'] - P['Head'])
head_top = head_base + head_axis * np.linalg.norm(Qtail['DEF-spine.006'] - Q['DEF-spine.006']) * s_head
pair(Q['DEF-spine.004'], P['Neck']); pair(Q['DEF-spine.006'], head_base); pair(Qtail['DEF-spine.006'], head_top)
for c_s, c_d in [(Q['DEF-spine.006'], head_base), (Qtail['DEF-spine.006'], head_top), ((Q['DEF-spine.006'] + Qtail['DEF-spine.006']) / 2, (head_base + head_top) / 2)]:
    for off in ([0.09, 0, 0], [-0.09, 0, 0], [0, 0, 0.1], [0, 0, -0.09]):
        pair(c_s + off, c_d + np.array(off) * s_head)
# torso: puntos laterales con escala lateral controlada
for a, b_ in [('DEF-spine.001', 'Spine'), ('DEF-spine.002', 'Spine1'), ('DEF-spine.003', 'Spine2')]:
    for off in ([0.15, 0, 0], [-0.15, 0, 0], [0, 0, 0.12], [0, 0, -0.12]):
        o = np.array(off); pair(Q[a] + o, P[b_] + o * np.array([PERP_TORSO_X, 1, 1]))
for s in side:
    sole_v8 = V[:, 1].min(); sole_d = -0.001
    for a, b_ in ((f'DEF-foot.{s}', 'Foot'), (f'DEF-toe.{s}', 'ToeBase')):
        pair(np.array([Q[a][0], sole_v8, Q[a][2]]), np.array([P[M(s, b_)][0], sole_d, P[M(s, b_)][2]]))
    pair(Q[f'DEF-thigh.{s}'], P[M(s, 'UpLeg')]); pair(Q[f'DEF-shin.{s}'], P[M(s, 'Leg')]); pair(Q[f'DEF-foot.{s}'], P[M(s, 'Foot')])
    pair(Q[f'DEF-toe.{s}'], P[M(s, 'ToeBase')]); pair(Qtail[f'DEF-toe.{s}'], P[M(s, 'Toe_End')])
    pair(Q[f'DEF-shoulder.{s}'], P[M(s, 'Shoulder')]); pair(Q[f'DEF-upper_arm.{s}'], P[M(s, 'Arm')]); pair(Q[f'DEF-forearm.{s}'], P[M(s, 'ForeArm')])
    pair(Q[f'DEF-hand.{s}'], P[M(s, 'Hand')]); pair(Q[f'DEF-f_middle.01.{s}'], P[M(s, 'HandMiddle1')])
    pair(Q[f'DEF-f_index.01.{s}'], P[M(s, 'HandIndex1')]); pair(Q[f'DEF-f_pinky.01.{s}'], P[M(s, 'HandPinky1')])
    # grosor de extremidades: anillo de puntos perpendiculares en el centro de cada segmento largo
    for a, b_, c, d in [(Q[f'DEF-thigh.{s}'], Q[f'DEF-shin.{s}'], P[M(s, 'UpLeg')], P[M(s, 'Leg')]), (Q[f'DEF-shin.{s}'], Q[f'DEF-foot.{s}'], P[M(s, 'Leg')], P[M(s, 'Foot')]),
                        (Q[f'DEF-upper_arm.{s}'], Q[f'DEF-forearm.{s}'], P[M(s, 'Arm')], P[M(s, 'ForeArm')]), (Q[f'DEF-forearm.{s}'], Q[f'DEF-hand.{s}'], P[M(s, 'ForeArm')], P[M(s, 'Hand')])]:
        ax_s = unit(b_ - a); ax_d = unit(d - c); Rr = fromto(ax_s, ax_d)
        rad = 0.06 if np.linalg.norm(b_ - a) > 0.3 else 0.045
        u1 = unit(np.cross(ax_s, [0, 0, 1]) if abs(ax_s[2]) < 0.9 else np.cross(ax_s, [1, 0, 0])); u2 = np.cross(ax_s, u1)
        for t in (0.3, 0.7):
            cs = a + (b_ - a) * t; cd = c + (d - c) * t
            for o in (u1, -u1, u2, -u2):
                pair(cs + o * rad, cd + Rr @ o * rad * GIRTH)
    # puntos medios de huesos largos (mantienen los segmentos rectos)
    for a, b_, c, d in [(Q[f'DEF-thigh.{s}'], Q[f'DEF-shin.{s}'], P[M(s, 'UpLeg')], P[M(s, 'Leg')]), (Q[f'DEF-shin.{s}'], Q[f'DEF-foot.{s}'], P[M(s, 'Leg')], P[M(s, 'Foot')]),
                        (Q[f'DEF-upper_arm.{s}'], Q[f'DEF-forearm.{s}'], P[M(s, 'Arm')], P[M(s, 'ForeArm')]), (Q[f'DEF-forearm.{s}'], Q[f'DEF-hand.{s}'], P[M(s, 'ForeArm')], P[M(s, 'Hand')])]:
        pair((a + b_) / 2, (c + d) / 2)
S = np.array(src_pts); D = np.array(dst_pts); n = len(S)
def U(r): return r  # nucleo biharmonico 3D: phi(r)=r
K = U(np.linalg.norm(S[:, None] - S[None], axis=2)); Pm = np.hstack([np.ones((n, 1)), S])
L = np.zeros((n + 4, n + 4)); L[:n, :n] = K + np.eye(n) * 1e-4; L[:n, n:] = Pm; L[n:, :n] = Pm.T
Y = np.zeros((n + 4, 3)); Y[:n] = D
coef = np.linalg.solve(L, Y)
def tps(X):
    out = np.empty_like(X)
    for i in range(0, len(X), 20000):
        x = X[i:i + 20000]; k = U(np.linalg.norm(x[:, None] - S[None], axis=2))
        out[i:i + 20000] = k @ coef[:n] + np.hstack([np.ones((len(x), 1)), x]) @ coef[n:]
    return out
Vf = tps(Vp)
e = 1e-4; Jac = np.stack([(tps(Vp + np.array(d) * e) - Vf) / e for d in np.eye(3)], 2)  # (n,3,3) columnas = d/dx_i
Nf = np.einsum('nij,nj->ni', np.linalg.inv(Jac).transpose(0, 2, 1), Np)
Nf /= np.linalg.norm(Nf, axis=1, keepdims=True)
print('residuo TPS en controles:', np.abs(tps(S) - D).max().round(5), '| escala cabeza', round(s_head, 3), '| det jac min', np.linalg.det(Jac).min().round(3))

# ---- remapeo de pesos
def mix(nm):
    s = 'Left' if '.L' in nm else 'Right'
    b_ = nm[4:].replace('.L', '').replace('.R', '')
    tbl = {'thigh': 'UpLeg', 'thigh.001': 'UpLeg', 'shin': 'Leg', 'shin.001': 'Leg', 'foot': 'Foot', 'toe': 'ToeBase', 'shoulder': 'Shoulder',
           'upper_arm': 'Arm', 'upper_arm.001': 'Arm', 'forearm': 'ForeArm', 'forearm.001': 'ForeArm', 'hand': 'Hand',
           'palm.01': 'Hand', 'palm.02': 'Hand', 'palm.03': 'Hand', 'palm.04': 'Hand'}
    if nm.startswith('DEF-spine') or nm.startswith('DEF-pelvis'):
        return {'DEF-spine': 'Hips', 'DEF-spine.001': 'Spine', 'DEF-spine.002': 'Spine1', 'DEF-spine.003': 'Spine2', 'DEF-spine.004': 'Neck',
                'DEF-spine.005': 'Neck', 'DEF-spine.006': 'Head'}.get(nm, 'Hips')
    if b_ in tbl: return s + tbl[b_]
    f, k = b_.split('.')  # f_index.01 / thumb.01
    f = {'f_index': 'Index', 'f_middle': 'Middle', 'f_ring': 'Ring', 'f_pinky': 'Pinky', 'thumb': 'Thumb'}[f]
    return f'{s}Hand{f}{int(k)}'
remap = np.array([dn.index(mix(nm)) for nm in sn])
Wd = np.zeros((len(V), len(dn)))
for k in range(4): np.add.at(Wd, (np.arange(len(V)), remap[J[:, k]]), W[:, k])
top = np.argsort(-Wd, 1)[:, :4]; Wt = np.take_along_axis(Wd, top, 1); Wt /= Wt.sum(1, keepdims=True)
order = np.argsort(top, 1)  # no requerido; se mantiene orden por peso
np.savez_compressed('work/retarget.npz', V=Vf.astype(np.float32), N=Nf.astype(np.float32), J=top.astype(np.uint8), W=Wt.astype(np.float32))
print('bbox destino nuevo', Vf.min(0).round(3), Vf.max(0).round(3))
print('joints usados', sorted({dn[i] for i in np.unique(top[Wt > 0])}))
