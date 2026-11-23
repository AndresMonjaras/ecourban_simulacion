"""Integrante EcoUrban v3: modelo construido desde cero por codigo alrededor del esqueleto Mixamo
de persona-articulada.glb (sin modificar huesos, jerarquia, reposo ni inverseBindMatrices).

Cada pieza (camiseta, brazos, manos, short, piernas, tenis, cuello, cabeza, gorra) es un loft o
superficie parametrica en el espacio de bind del esqueleto; los pesos se asignan por construccion
segun la posicion a lo largo de la cadena de huesos. Colores por vertice (COLOR_0), sin texturas.
Proporciones de referencia: medidas del integrante en persona-ecourban-v8.glb (ver INFORME.md).

Uso: python3 -I genera_v3.py <salida.glb>
"""
import sys, os, json, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import glb, numpy as np

DST = '/home/omarbolanos/Documentos/REPOSITORIOS/ecourban_simulacion/experiencia-ecourban/public/models/persona-articulada.glb'
OUT = sys.argv[1]
jd, bd = glb.load(DST)
JN = [jd['nodes'][k]['name'] for k in jd['skins'][0]['joints']]
IBM = glb.acc(jd, bd, jd['skins'][0]['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
P = {n: np.linalg.inv(IBM[i])[:3, 3].astype(np.float64) for i, n in enumerate(JN)}
JI = {n: i for i, n in enumerate(JN)}

def hexc(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)]) / 255.0
def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)  # COLOR_0 es lineal
COL = {k: lin(hexc(v)) for k, v in dict(
    piel='#b48a72', piel_osc='#9c7360', labio='#9a5f55', pelo='#2a2522', ceja='#241d19',
    blanco='#e9e9e6', azul='#8fb6e0', short='#5c5e52', short_osc='#4a4c42', cordon='#f0f0ec',
    gorra='#1f1f21', verde='#2f7d3a', verde_osc='#1e5a28', suela='#f2f2ef', rojo='#c7202b', negro='#18181a',
    ojo_blanco='#f2efe9', iris='#3b2a20', pupila='#0d0b0a').items()}

def unit(v): return v / np.linalg.norm(v, axis=-1, keepdims=True)
def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

class Part:
    def __init__(self, name, mat):
        self.name, self.mat = name, mat; self.V = []; self.F = []; self.C = []; self.W = []  # W: dict por vertice
    def add(self, V, F, C, W):
        o = sum(len(v) for v in self.V); self.V.append(V); self.F.append(F + o); self.C.append(C); self.W.extend(W)
PARTS = {}
def part(name, mat):
    if name not in PARTS: PARTS[name] = Part(name, mat)
    return PARTS[name]

# ---------------------------------------------------------------- loft generico
def catmull(pts, n):
    pts = np.asarray(pts, float); P_ = np.vstack([2 * pts[0] - pts[1], pts, 2 * pts[-1] - pts[-2]])
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1); s = np.concatenate([[0], np.cumsum(seg)]); s /= s[-1]
    out = []; ts = np.linspace(0, 1, n)
    for t in ts:
        i = min(np.searchsorted(s, t, side='right') - 1, len(pts) - 2); u = (t - s[i]) / max(s[i + 1] - s[i], 1e-9)
        p0, p1, p2, p3 = P_[i], P_[i + 1], P_[i + 2], P_[i + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return np.array(out), ts

def loft(path, ref, prof, M=40, cap0=False, cap1=False):
    """path (N,3) estaciones; ref: vector de referencia para el eje 'u'; prof(t, ang)-> (ru, rv, du, dv)
    radio en u/v y desplazamiento del centro. Devuelve V, F, (t, ang) por vertice."""
    N = len(path); T = np.gradient(path, axis=0); T = unit(T)
    u0 = ref - T[0] * ref.dot(T[0]); u0 /= np.linalg.norm(u0); U = [u0]
    for i in range(1, N):  # transporte paralelo
        u = U[-1] - T[i] * U[-1].dot(T[i]); U.append(u / np.linalg.norm(u))
    U = np.array(U); Vv = np.cross(T, U)
    ts = np.linspace(0, 1, N); ang = np.linspace(0, 2 * np.pi, M, endpoint=False)
    V = []; meta = []
    for i in range(N):
        for a in ang:
            ru, rv, du, dv = prof(ts[i], a)
            V.append(path[i] + U[i] * (math.cos(a) * ru + du) + Vv[i] * (math.sin(a) * rv + dv)); meta.append((ts[i], a))
    F = []
    for i in range(N - 1):
        for k in range(M):
            a, b, c, d = i * M + k, i * M + (k + 1) % M, (i + 1) * M + (k + 1) % M, (i + 1) * M + k
            F += [(a, b, c), (a, c, d)]
    V = list(V)
    for cap, i0, flip in ((cap0, 0, True), (cap1, N - 1, False)):
        if cap:
            c = len(V); V.append(path[i0] + U[i0] * prof(ts[i0], 0)[2] * 0); meta.append((ts[i0], 0))
            for k in range(M):
                a, b = i0 * M + k, i0 * M + (k + 1) % M
                F.append((c, b, a) if flip else (c, a, b))
    return np.array(V), np.array(F, np.int64), np.array(meta)

def chain_weights(t, knots, bones, blend=0.08):
    """t en [0,1] a lo largo de una cadena; knots: posiciones t de las articulaciones internas."""
    out = []
    for x in np.atleast_1d(t):
        w = {}
        idx = int(np.searchsorted(knots, x)); w[bones[idx]] = 1.0
        for k, kt in enumerate(knots):
            d = x - kt
            if abs(d) < blend:
                s = smooth(-blend, blend, d); w = {bones[k]: 1 - s, bones[k + 1]: s}
        out.append(w)
    return out

# ---------------------------------------------------------------- referencias del esqueleto
Hips, Spine, Spine1, Spine2, Neck, Head, Top = (P[n] for n in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'HeadTop_End'))
SIDES = (('L', 'Left', 1), ('R', 'Right', -1))

# ================================================================ CAMISETA (torso)
Y_HEM, Y_TOP = 0.975, 1.612
def torso_dims(y):
    """semiancho, profundidad frontal, profundidad dorsal (m) por altura; integrante: complexion robusta, abdomen."""
    ys = [0.975, 1.05, 1.15, 1.25, 1.33, 1.41, 1.47, 1.51, 1.548, 1.585, 1.612]
    ax = [0.200, 0.196, 0.192, 0.192, 0.198, 0.206, 0.212, 0.205, 0.165, 0.094, 0.071]
    fz = [0.150, 0.158, 0.160, 0.150, 0.140, 0.128, 0.110, 0.094, 0.082, 0.074, 0.070]
    bz = [0.125, 0.122, 0.112, 0.112, 0.120, 0.122, 0.112, 0.098, 0.084, 0.072, 0.066]
    return np.interp(y, ys, ax), np.interp(y, ys, fz), np.interp(y, ys, bz)
def build_torso():
    n = 70; ys = np.linspace(Y_HEM, Y_TOP, n)
    spine_pts = [Hips, Spine, Spine1, Spine2, Neck]
    zc = np.interp(ys, [p[1] for p in spine_pts], [p[2] for p in spine_pts])
    path = np.stack([np.zeros(n), ys, zc], 1)
    def prof(t, a):
        y = Y_HEM + t * (Y_TOP - Y_HEM); ax, fz, bz = torso_dims(y)
        c, s = math.cos(a), math.sin(a)  # u = +X, v = T x u (=-Z para T=+Y) -> s>0 es espalda
        e = 2.4 if y < 1.48 else 2.0  # superelipse: torso mas "cuadrado"
        r = (abs(c) ** e + abs(s) ** e) ** (-1 / e)
        rz = bz if s > 0 else fz
        flare = 1 + 0.035 * smooth(1.03, Y_HEM, y)  # leve vuelo en el dobladillo
        return ax * r * flare, rz * r * flare, 0, 0
    V, F, meta = loft(path, np.array([1.0, 0, 0]), prof, M=72)
    X, Y, Z = V.T; AX = np.abs(X)
    # raglan: franja azul del cuello a la axila (frente y espalda)
    rag = (AX > 0.060 + (1.612 - Y) * 0.80) & (Y > 1.30)
    C = np.where(rag[:, None], COL['azul'], COL['blanco'])
    hem = Y < Y_HEM + 0.012; C[hem] *= 0.93
    rib = Y > Y_TOP - 0.012; C[rib] = COL['blanco'] * 0.95
    W = []
    ks = [p[1] for p in spine_pts]
    for x, y in zip(X, Y):
        w = chain_weights(np.interp(y, ks, np.linspace(0, 1, 5)), [0.25, 0.5, 0.75], ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck'], 0.07)[0]
        if y > 1.56: w = {'Spine2': 1 - smooth(1.56, 1.612, y), 'Neck': smooth(1.56, 1.612, y)}
        sh = smooth(0.07, 0.17, abs(x)) * smooth(1.36, 1.47, y)
        if sh > 0:
            side = 'Left' if x > 0 else 'Right'; armw = 0.45 * smooth(0.15, 0.21, abs(x)) * smooth(1.38, 1.46, y)
            w = {k: v * (1 - sh * 0.7) for k, v in w.items()}; w[side + 'Shoulder'] = w.get(side + 'Shoulder', 0) + sh * 0.7 - armw * 0.7
            w[side + 'Arm'] = armw * 0.7
        W.append(w)
    part('camiseta', 'Tela').add(V, F, C, W)

# ================================================================ BRAZOS + MANGAS + MANOS
def arm_path(S, n):
    a, f, h = P[S + 'Arm'], P[S + 'ForeArm'], P[S + 'Hand']
    sx = 1 if a[0] > 0 else -1
    start = a + np.array([-sx * 0.045, -0.030, 0.0])   # nace dentro del torso
    a2 = a + np.array([0, -0.020, 0.0])                # eje del deltoides algo bajo el pivote
    return catmull([start, a2, (a + f) / 2, f, (f + h) / 2, h + (h - f) / np.linalg.norm(h - f) * 0.012], n)
def build_arms():
    for s, S, sx in SIDES:
        path, ts = arm_path(S, 90)
        L = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]); L /= L[-1]
        a, f, h = P[S + 'Arm'], P[S + 'ForeArm'], P[S + 'Hand']
        def tparam(p): return L[np.argmin(np.linalg.norm(path - p, axis=1))]
        te, tw = tparam(f), tparam(h)
        rr = lambda t: np.interp(t, [0, 0.06, 0.18, 0.35, te - 0.03, te + 0.02, te + 0.12, (te + tw) / 2, tw - 0.02, 1],
                                 [0.052, 0.057, 0.056, 0.052, 0.045, 0.044, 0.048, 0.041, 0.031, 0.030])
        def prof(t, ang):
            r = rr(t); return r, r * 0.92, 0, 0
        V, F, meta = loft(path, np.array([0, 0, 1.0]), prof, M=32, cap0=False)
        W = []
        for t in meta[:, 0]:
            w = chain_weights(t, [te, tw], [S + 'Arm', S + 'ForeArm', S + 'Hand'], 0.05)[0]
            if t < 0.08: w = {S + 'Shoulder': 0.4 * (1 - t / 0.08), **{k: v * (1 - 0.4 * (1 - t / 0.08)) for k, v in w.items()}}
            W.append(w)
        C = np.tile(COL['piel'], (len(V), 1))
        part('piel', 'Piel').add(V, F, C, W)
        # manga corta azul (hasta ~45 % del humero), ligeramente holgada
        tm = 0.45 * te; sel = L <= tm + 1e-9
        p2 = path[sel]
        def profm(t, ang):
            tt = t * tm; r = rr(tt) + 0.010 + 0.007 * t; return r, r * 0.95, 0, 0
        Vm, Fm, mm = loft(p2, np.array([0, 0, 1.0]), profm, M=32)
        Cm = np.tile(COL['azul'], (len(Vm), 1)); Cm[mm[:, 0] > 0.92] *= 0.9
        Wm = []
        for t in mm[:, 0]:
            tt = t * tm; w = {S + 'Arm': 1.0}
            if tt < 0.10: w = {S + 'Shoulder': 0.4 * (1 - tt / 0.10), S + 'Arm': 1 - 0.4 * (1 - tt / 0.10)}
            Wm.append(w)
        part('camiseta', 'Tela').add(Vm, Fm, Cm, Wm)
        build_hand(s, S, sx)

def build_hand(s, S, sx):
    h = P[S + 'Hand']; m1 = P[S + 'HandMiddle1']; i1 = P[S + 'HandIndex1']; p1 = P[S + 'HandPinky1']
    fwd = unit(m1 - h); side = unit(i1 - p1); nrm = unit(np.cross(fwd, side)) * sx  # dorso
    # palma: loft corto muneca -> nudillos, seccion rectangular redondeada
    path = np.linspace(h - fwd * 0.01, m1 + fwd * 0.012, 14)
    width = np.linalg.norm(i1 - p1) + 0.018
    def prof(t, a):
        w = np.interp(t, [0, 0.3, 1], [0.032, width / 2, width / 2 * 0.98]); th = np.interp(t, [0, 0.4, 1], [0.021, 0.018, 0.015])
        c, s_ = math.cos(a), math.sin(a); e = 3.0; r = (abs(c) ** e + abs(s_) ** e) ** (-1 / e)
        return w * r, th * r, 0, 0
    V, F, meta = loft(path, side, prof, M=28, cap0=False, cap1=True)
    part('piel', 'Piel').add(V, F, np.tile(COL['piel'], (len(V), 1)), [{S + 'Hand': 1.0}] * len(V))
    for fname, rad in (('Index', 0.0100), ('Middle', 0.0104), ('Ring', 0.0098), ('Pinky', 0.0088), ('Thumb', 0.0115)):
        pts = [P[f'{S}Hand{fname}{k}'] for k in (1, 2, 3, 4)]
        if fname == 'Thumb': pts = [h + (pts[0] - h) * 0.6] + pts
        else:
            # geometria de dedos algo mas juntos que el abanico del esqueleto (los dedos no se animan en la app)
            b0 = pts[0]; pts = [b0 + (p_ - b0) * 0 + unit(unit(p_ - b0) * 0.6 + fwd * 0.4) * np.linalg.norm(p_ - b0) if np.linalg.norm(p_ - b0) > 1e-6 else p_ for p_ in pts]
            pts = [pts[0] - fwd * 0.012] + pts
        path, _ = catmull(pts, 18)
        Lc = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]); Lc /= Lc[-1]
        def prof(t, a, rad=rad): r = rad * np.interp(t, [0, 0.8, 1], [1.05, 0.88, 0.55]); return r, r * 0.9, 0, 0
        V, F, meta = loft(path, nrm, prof, M=12, cap1=True)
        kn = [Lc[np.argmin(np.linalg.norm(path - p, axis=1))] for p in pts[1:-1]]
        names = [f'{S}Hand{fname}{k}' for k in (1, 2, 3)]
        if fname == 'Thumb': W = [chain_weights(t, kn[1:], names, 0.04)[0] if t > kn[0] else {S + 'Hand': 0.5, names[0]: 0.5} for t in meta[:, 0]]
        else: W = [chain_weights(t, kn[1:], names, 0.04)[0] if t > kn[0] - 0.02 else {S + 'Hand': 1.0} for t in meta[:, 0]]
        part('piel', 'Piel').add(V, F, np.tile(COL['piel'], (len(V), 1)), W)

# ================================================================ PIERNAS + SHORT + TENIS
Y_SHORT_HEM_OFF = 0.045
def build_legs():
    for s, S, sx in SIDES:
        u, k, f = P[S + 'UpLeg'], P[S + 'Leg'], P[S + 'Foot']
        path, _ = catmull([u + np.array([0, 0.03, 0]), u, (u + k) / 2, k, (k + f) / 2, f, f + np.array([0, -0.05, 0.01])], 110)
        L = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]); L /= L[-1]
        tk = L[np.argmin(np.linalg.norm(path - k, axis=1))]; ta = L[np.argmin(np.linalg.norm(path - f, axis=1))]
        def prof(t, a):
            r = np.interp(t, [0, 0.1, tk - 0.12, tk - 0.02, tk + 0.04, tk + 0.13, ta - 0.08, ta, 1],
                          [0.088, 0.088, 0.070, 0.058, 0.057, 0.066, 0.043, 0.038, 0.040])
            # pantorrilla: volumen hacia atras (eje v ~ -Z para u=+X)
            dv = -0.012 * smooth(tk + 0.02, tk + 0.12, t) * (1 - smooth(tk + 0.2, ta - 0.04, t))
            return r * 0.95, r, 0, dv
        V, F, meta = loft(path, np.array([1.0, 0, 0]), prof, M=32)
        W = [chain_weights(t, [tk, ta], [S + 'UpLeg', S + 'Leg', S + 'Foot'], 0.05)[0] for t in meta[:, 0]]
        part('piel', 'Piel').add(V, F, np.tile(COL['piel'], (len(V), 1)), W)
        # pierna del short: holgada, termina sobre la rodilla
        hem_y = k[1] + Y_SHORT_HEM_OFF
        p0 = u + np.array([sx * -0.018, -0.02, 0]); p1 = np.array([k[0] + sx * 0.008, hem_y, k[2] + 0.004])
        pathS, _ = catmull([p0, u + (p1 - u) * 0.3, p1], 40)
        def profS(t, a):
            r = np.interp(t, [0, 0.35, 1], [0.104, 0.104, 0.099]); return r, r * 0.96, 0, 0
        Vs, Fs, ms = loft(pathS, np.array([1.0, 0, 0]), profS, M=40)
        Cs = np.tile(COL['short'], (len(Vs), 1)); Cs[ms[:, 0] > 0.96] = COL['short_osc']
        Ws = [{'Hips': 1 - smooth(0.0, 0.3, t), S + 'UpLeg': smooth(0.0, 0.3, t)} for t in ms[:, 0]]
        part('short', 'Tela').add(Vs, Fs, Cs, Ws)
        build_shoe(s, S, sx)
    # cintura del short (bajo la camiseta, visible en la entrepierna y al sentarse)
    ys = np.linspace(1.075, 0.935, 22)
    path = np.stack([np.zeros_like(ys), ys, np.full_like(ys, Hips[2] + 0.01)], 1)
    def prof(t, a):
        y = 1.075 + t * (0.935 - 1.075); ax = np.interp(y, [0.935, 0.98, 1.075], [0.150, 0.182, 0.178])
        fz = np.interp(y, [0.935, 1.0, 1.075], [0.105, 0.138, 0.136]); bz = np.interp(y, [0.935, 1.0, 1.075], [0.108, 0.114, 0.110])
        c, s_ = math.cos(a), math.sin(a); e = 2.3; r = (abs(c) ** e + abs(s_) ** e) ** (-1 / e)
        return ax * r, (bz if s_ < 0 else fz) * r, 0, 0  # T=-Y => v = -Y x X = +Z... s<0 espalda
    V, F, meta = loft(path, np.array([1.0, 0, 0]), prof, M=64)
    C = np.tile(COL['short'], (len(V), 1))
    W = [{'Hips': 1.0}] * len(V)
    part('short', 'Tela').add(V, F, C, W)
    # cordon blanco: dos tiras que cuelgan bajo el dobladillo de la camiseta
    for sx in (-1, 1):
        x0 = sx * 0.022; zf = Hips[2] + 0.01 + 0.155
        pts = [np.array([x0, 0.99, zf]), np.array([x0 + sx * 0.004, 0.94, zf + 0.004]), np.array([x0 + sx * 0.006, 0.895, zf + 0.002])]
        path, _ = catmull(pts, 14)
        V, F, meta = loft(path, np.array([1.0, 0, 0]), lambda t, a: (0.0035, 0.0035, 0, 0), M=8, cap1=True)
        part('short', 'Tela').add(V, F, np.tile(COL['cordon'], (len(V), 1)), [{'Hips': 1.0}] * len(V))

def build_shoe(s, S, sx):
    f, tb, te = P[S + 'Foot'], P[S + 'ToeBase'], P[S + 'Toe_End']
    heel_z = f[2] - 0.075; toe_z = max(te[2], tb[2] + 0.07) + 0.012
    xc = (f[0] + tb[0]) / 2
    zs = np.linspace(heel_z, toe_z, 90)
    path = np.stack([np.full_like(zs, xc), np.full_like(zs, 0.0), zs], 1)
    Lz = (zs - heel_z) / (toe_z - heel_z)
    def prof(t, a):
        # seccion: base plana en y=0; u=+X (ancho), v = Z x X = +Y (alto)
        w = np.interp(t, [0, 0.06, 0.2, 0.45, 0.72, 0.9, 0.97, 1], [0.030, 0.040, 0.046, 0.050, 0.054, 0.050, 0.040, 0.022])
        h = np.interp(t, [0, 0.05, 0.3, 0.5, 0.72, 0.9, 0.97, 1], [0.100, 0.125, 0.128, 0.100, 0.068, 0.055, 0.048, 0.035])
        c, s_ = math.cos(a), math.sin(a); e = 2.6; r = (abs(c) ** e + abs(s_) ** e) ** (-1 / e)
        yv = max(h / 2 * (1 + s_ * r), 0.0)  # base plana en y=0, empeine hasta y=h
        return w * r, 0.0, 0, yv
    V, F, meta = loft(path, np.array([1.0, 0, 0]), prof, M=64, cap0=True, cap1=True)
    V[:, 1] = np.maximum(V[:, 1], 0.0) - 0.001
    X, Y, Z = V.T; t = (Z - heel_z) / (toe_z - heel_z); side = np.abs(X - xc) > 0.032
    C = np.tile(COL['blanco'], (len(V), 1))
    C[Y < 0.018] = COL['suela']; C[(Y >= 0.018) & (Y < 0.027)] = COL['rojo']
    swoosh = side & (Y > 0.035) & (Y < 0.035 + 0.04 * np.clip(1 - np.abs(t - 0.45) / 0.3, 0, 1)) & (t > 0.18) & (t < 0.75)
    C[swoosh] = COL['rojo']
    C[(t < 0.10) & (Y > 0.03)] = COL['negro']
    C[(Y > 0.095) & (t > 0.08)] = COL['negro']  # cuello/lengueta
    top = (~side) & (Y > 0.05) & (t > 0.42) & (t < 0.72); C[top & ((np.round((t - 0.42) / 0.06) % 2) == 0)] = COL['negro']  # cordones
    tt = t
    W = [{S + 'Foot': 1 - smooth(0.55, 0.75, x), S + 'ToeBase': smooth(0.55, 0.75, x)} for x in tt]
    part('tenis', 'Calzado').add(V, F, C, W)

# ================================================================ CUELLO + CABEZA + ROSTRO
HC = np.array([0.0, 1.730, 0.020])  # centro del craneo
def head_radius(d):
    """d: direcciones unitarias (n,3); devuelve puntos de la superficie de la cabeza."""
    x, y, z = d.T
    rx, ry, rz = 0.088, 0.120, 0.108
    low = np.clip(-y, 0, 1)
    jaw = 1 - 0.30 * smooth(0.15, 0.85, low) * (1 - 0.5 * np.clip(z, 0, 1))  # mandibula mas estrecha
    sx = rx * jaw; sz = rz * (1 + 0.06 * np.clip(-z, 0, 1) * (y > -0.2)) * (1 - 0.18 * smooth(0.5, 0.95, low) * (z < 0))
    p = np.stack([x * sx, y * ry, z * sz], 1)
    p[:, 2] += 0.012 * smooth(0.4, 0.9, low) * np.clip(z, 0, 1)  # menton
    # nariz
    fx, fy = x * sx / 0.02, (p[:, 1] - (-0.010)) / 0.028
    p[:, 2] += 0.020 * np.exp(-(fx ** 2) - fy ** 2) * (z > 0.6) * np.clip((fy + 1.6), 0, 1)
    # arco superciliar y pomulos
    p[:, 2] += 0.006 * np.exp(-((p[:, 1] - 0.030) / 0.012) ** 2) * (np.abs(x) < 0.6) * (z > 0.6)
    p[:, 0] += np.sign(x) * 0.005 * np.exp(-((p[:, 1] + 0.012) / 0.02) ** 2) * (z > 0.3)
    # labios
    p[:, 2] += 0.004 * np.exp(-((p[:, 1] + 0.058) / 0.009) ** 2 - (x * sx / 0.022) ** 2) * (z > 0.6)
    return p + HC
def sphere_grid(nu, nv):
    th = np.linspace(0, np.pi, nv); ph = np.linspace(0, 2 * np.pi, nu, endpoint=False)
    D = np.array([[math.sin(t) * math.sin(p), math.cos(t), math.sin(t) * math.cos(p)] for t in th for p in ph])
    F = []
    for i in range(nv - 1):
        for k in range(nu):
            a, b, c, d = i * nu + k, i * nu + (k + 1) % nu, (i + 1) * nu + (k + 1) % nu, (i + 1) * nu + k
            F += [(a, d, c), (a, c, b)]
    return D, np.array(F, np.int64)
def build_head():
    # cuello
    n0 = np.array([0, 1.555, Neck[2] + 0.005]); n1 = HC + np.array([0, -0.075, -0.018])
    path = np.linspace(n0, n1, 20)
    V, F, meta = loft(path, np.array([1.0, 0, 0]), lambda t, a: (0.059, 0.062, 0, 0), M=32)
    W = [{'Neck': 1 - smooth(0.55, 1, t), 'Head': smooth(0.55, 1, t)} for t in meta[:, 0]]
    part('piel', 'Piel').add(V, F, np.tile(COL['piel'], (len(V), 1)), W)
    # craneo y cara
    D, F = sphere_grid(96, 72); V = head_radius(D)
    X, Y, Z = (V - HC).T; d = D
    C = np.tile(COL['piel'], (len(V), 1))
    dx, dy, dz = d.T
    frente = smooth(0.30, 0.40, dy)                                     # linea frontal (bajo la visera)
    lados = smooth(0.30, 0.12, dz) * smooth(-0.28, -0.12, dy)          # sienes y patillas
    nuca = smooth(-0.05, -0.25, dz) * smooth(-0.62, -0.45, dy)          # nuca, pelo corto
    hair = np.clip(np.maximum.reduce([frente, lados, nuca]), 0, 1)
    C = C * (1 - hair[:, None]) + COL['pelo'] * hair[:, None]
    lips = np.exp(-((Y + 0.058) / 0.0055) ** 4 - (X / 0.021) ** 4) * (Z > 0.06)
    C = C * (1 - lips[:, None]) + COL['labio'] * lips[:, None]
    under_nose = (np.abs(Y + 0.040) < 0.004) & (np.abs(X) < 0.012) & (Z > 0.07); C[under_nose] = COL['piel_osc']
    W = [{'Head': 1.0}] * len(V)
    part('piel', 'Piel').add(V, F, C, W)
    # orejas
    for sx in (-1, 1):
        D2, F2 = sphere_grid(16, 12); c = HC + np.array([sx * 0.083, -0.005, -0.004])
        V2 = c + D2 * np.array([0.012, 0.030, 0.020])
        part('piel', 'Piel').add(V2, F2, np.tile(COL['piel_osc'] * 0.5 + COL['piel'] * 0.5, (len(V2), 1)), [{'Head': 1.0}] * len(V2))
    # ojos y cejas
    for sx in (-1, 1):
        ex, ey = sx * 0.031, 0.012
        dirv = unit(np.array([ex / 0.084, ey / 0.118, 0.9]))
        surf = head_radius(dirv[None])[0]
        c = surf + np.array([0, 0, -0.004])
        D2, F2 = sphere_grid(20, 14)
        Ve = c + D2 * np.array([0.0135, 0.0085, 0.0065])
        Ce = np.tile(COL['ojo_blanco'], (len(Ve), 1))
        rel = Ve - c; iris = (rel[:, 2] > 0) & (np.hypot(rel[:, 0] / 0.0135, rel[:, 1] / 0.0085) < 0.55)
        Ce[iris] = COL['iris']; Ce[(rel[:, 2] > 0) & (np.hypot(rel[:, 0] / 0.0135, rel[:, 1] / 0.0085) < 0.25)] = COL['pupila']
        part('ojos', 'Ojos').add(Ve, F2, Ce, [{'Head': 1.0}] * len(Ve))
        bp = [head_radius(unit(np.array([sx * q / 0.084, (ey + 0.021 + 0.004 * (1 - abs(q - 0.031) / 0.02)) / 0.118, 0.85]))[None])[0] + np.array([0, 0, 0.002])
              for q in np.linspace(0.014, 0.050, 8)]
        path, _ = catmull(bp, 12)
        Vb, Fb, mb = loft(path, np.array([0, 1.0, 0]), lambda t, a: (0.0035 * (1.1 - 0.5 * t), 0.0022, 0, 0), M=8, cap0=True, cap1=True)
        part('ojos', 'Ojos').add(Vb, Fb, np.tile(COL['ceja'], (len(Vb), 1)), [{'Head': 1.0}] * len(Vb))

# ================================================================ GORRA
def build_cap():
    C0 = HC + np.array([0, 0.022, -0.004]); R = np.array([0.098, 0.104, 0.120])
    def edge_y(z): return HC[1] + 0.068 + (z - (HC[2] + 0.10)) * 0.26
    def crown(th, s):
        d = np.array([math.sin(th), 0, math.cos(th)])
        def Pp(phi): return C0 + np.array([R[0] * math.sin(phi) * d[0], R[1] * math.cos(phi), R[2] * math.sin(phi) * d[2]])
        lo, hi = 0.0, math.pi
        for _ in range(40):
            m = (lo + hi) / 2
            if Pp(m)[1] > edge_y(Pp(m)[2]): lo = m
            else: hi = m
        return Pp(lo * (1 - s))
    NT, NS = 64, 16; V = []; F = []; C = []
    grid = np.zeros((NS + 1, NT), int)
    for i in range(NS + 1):
        for k in range(NT):
            grid[i, k] = len(V); V.append(crown(2 * math.pi * k / NT, i / NS))
    for i in range(NS):
        for k in range(NT):
            a, b, c, d = grid[i, k], grid[i, (k + 1) % NT], grid[i + 1, (k + 1) % NT], grid[i + 1, k]
            F += [(a, c, b), (a, d, c)]
    V = np.array(V); C = np.tile(COL['gorra'], (len(V), 1))
    # costuras de paneles y emblema verde al frente
    rel = V - C0; thv = np.arctan2(rel[:, 0], rel[:, 2])
    emb = (np.abs(thv) < 0.17) & (rel[:, 1] > 0.050) & (rel[:, 1] < 0.068); C[emb] = COL['verde']
    part('gorra', 'Gorra').add(V, np.array(F), C, [{'Head': 1.0}] * len(V))
    # interior oscuro
    Vi = C0 + (V - C0) * 0.975; Fi = np.array(F)[:, ::-1]
    part('gorra', 'Gorra').add(Vi, Fi, np.tile(COL['negro'], (len(Vi), 1)), [{'Head': 1.0}] * len(Vi))
    # boton superior
    D2, F2 = sphere_grid(12, 8); top = crown(0, 1.0)
    part('gorra', 'Gorra').add(top + D2 * 0.008, F2, np.tile(COL['gorra'], (len(D2), 1)), [{'Head': 1.0}] * len(D2))
    # visera: arriba negra, abajo verde
    NB, Lb, thm = 21, 0.082, math.radians(62)
    tv, bv = [], []
    for k in range(NB):
        th = -thm + 2 * thm * k / (NB - 1); p = crown(th, 0.0)
        dirv = unit(np.array([math.sin(th) * 0.55, 0, math.cos(th)]))
        l = Lb * max(0.0, math.cos(th * 1.4)) ** 0.7 + 0.004
        q = p + dirv * l + np.array([0, -0.16 * l - 0.008 * (abs(th) / thm) ** 2, 0])
        for frac in np.linspace(0, 1, 6):
            tv.append(p + (q - p) * frac + np.array([0, 0.0012, 0]))
            bv.append(p + (q - p) * frac + np.array([0, -0.0045, 0]))
    tv, bv = np.array(tv), np.array(bv); Ft, Fb = [], []
    for k in range(NB - 1):
        for j in range(5):
            a, b, c, d = k * 6 + j, k * 6 + j + 1, (k + 1) * 6 + j + 1, (k + 1) * 6 + j
            Ft += [(a, c, b), (a, d, c)]; Fb += [(a, b, c), (a, c, d)]
    part('gorra', 'Gorra').add(tv, np.array(Ft), np.tile(COL['gorra'], (len(tv), 1)), [{'Head': 1.0}] * len(tv))
    Cb = np.tile(COL['verde'], (len(bv), 1))
    part('gorra', 'Gorra').add(bv, np.array(Fb), Cb, [{'Head': 1.0}] * len(bv))
    # canto de la visera
    ev = np.vstack([tv[5::6], bv[5::6]]); n = NB; Fe = []
    for k in range(n - 1): Fe += [(k, n + k + 1, n + k), (k, k + 1, n + k + 1)]
    part('gorra', 'Gorra').add(ev, np.array(Fe), np.tile(COL['gorra'], (len(ev), 1)), [{'Head': 1.0}] * len(ev))

# ================================================================ ensamblado
build_torso(); build_arms(); build_legs(); build_head(); build_cap()

def normals(V, F):
    N = np.zeros_like(V); fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    for k in range(3): np.add.at(N, F[:, k], fn)
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)

MATS = {'Piel': dict(roughnessFactor=0.62), 'Tela': dict(roughnessFactor=0.9), 'Calzado': dict(roughnessFactor=0.55),
        'Gorra': dict(roughnessFactor=0.8), 'Ojos': dict(roughnessFactor=0.35)}
j = json.loads(json.dumps({k: jd[k] for k in ('asset', 'scene', 'scenes')}))
j['asset'] = {'version': '2.0', 'generator': 'ecourban integrante v3 (numpy, desde cero)'}
nodes = json.loads(json.dumps(jd['nodes'][:68])); skin = json.loads(json.dumps(jd['skins'][0]))
out = bytearray(); views = []; accs = []
def add(data, target=None):
    while len(out) % 4: out.append(0)
    v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}
    if target: v['target'] = target
    out.extend(data); views.append(v); return len(views) - 1
def accessor(arr, ctype, typ, target=None, minmax=False, norm=False):
    a = {'bufferView': add(np.ascontiguousarray(arr).tobytes(), target), 'componentType': ctype, 'count': len(arr), 'type': typ}
    if minmax: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    if norm: a['normalized'] = True
    accs.append(a); return len(accs) - 1
skin['inverseBindMatrices'] = accessor(glb.acc(jd, bd, jd['skins'][0]['inverseBindMatrices']).astype(np.float32), 5126, 'MAT4')
mat_index = {}; materials = []
for k, v in MATS.items():
    mat_index[k] = len(materials); materials.append({'name': f'Integrante_{k}', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0.0, **v}})
prims = []; stats = {}
for name, p in PARTS.items():
    V = np.vstack(p.V).astype(np.float64); F = np.vstack(p.F); C = np.vstack(p.C)
    N = normals(V, F)
    Jt = np.zeros((len(V), 4), np.uint8); Wt = np.zeros((len(V), 4), np.float32)
    for i, w in enumerate(p.W):
        it = sorted(((v, k) for k, v in w.items() if v > 1e-4), reverse=True)[:4]; s = sum(v for v, _ in it)
        for q, (v, k) in enumerate(it): Jt[i, q] = JI[k]; Wt[i, q] = v / s
    col = np.hstack([np.clip(C, 0, 1), np.ones((len(C), 1))]).astype(np.float32)
    attrs = {'POSITION': accessor(V.astype(np.float32), 5126, 'VEC3', 34962, True), 'NORMAL': accessor(N.astype(np.float32), 5126, 'VEC3', 34962),
             'COLOR_0': accessor((col * 255 + 0.5).astype(np.uint8), 5121, 'VEC4', 34962, norm=True),
             'JOINTS_0': accessor(Jt, 5121, 'VEC4', 34962), 'WEIGHTS_0': accessor(Wt, 5126, 'VEC4', 34962)}
    it = (5125, np.uint32) if len(V) > 65535 else (5123, np.uint16)
    prims.append({'attributes': attrs, 'indices': accessor(F.reshape(-1).astype(it[1]), it[0], 'SCALAR', 34963), 'material': mat_index[p.mat]})
    stats[name] = (len(V), len(F))
nodes.append({'name': 'Integrante_EcoUrban_v3', 'mesh': 0, 'skin': 0}); nodes[67]['children'] = [66, 68]
j.update({'nodes': nodes, 'skins': [skin], 'meshes': [{'name': 'Integrante_EcoUrban_v3', 'primitives': prims}], 'materials': materials,
          'accessors': accs, 'bufferViews': views})
while len(out) % 4: out.append(0)
j['buffers'] = [{'byteLength': len(out)}]
glb.save(OUT, j, bytes(out))
print('ok', OUT, len(out), 'bytes |', {k: f'{v[0]}v/{v[1]}t' for k, v in stats.items()}, '| total', sum(v[0] for v in stats.values()), 'v')
