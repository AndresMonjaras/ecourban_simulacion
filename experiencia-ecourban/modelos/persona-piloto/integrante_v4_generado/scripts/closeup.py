# Primer plano (torso y brazos) de poses: python3 -I closeup.py <glb> <etiqueta> <poses> <vistas> <salida>
import sys, os, io, math
sys.path.insert(0, '..'); import glb, numpy as np
from PIL import Image
path, label, poses, views, out = sys.argv[1], sys.argv[2], sys.argv[3].split(','), [int(v) for v in sys.argv[4].split(',')], sys.argv[5]
j, b = glb.load(path); p = j['meshes'][0]['primitives'][0]; A = p['attributes']
UV = glb.acc(j, b, A['TEXCOORD_0']); I = glb.acc(j, b, p['indices']).reshape(-1, 3)
ti = j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']
T = np.asarray(Image.open(io.BytesIO(glb.img(j, b, j['textures'][ti]['source']))).convert('RGB'))
th, tw = T.shape[:2]; col = T[np.clip((UV[:, 1] % 1 * th).astype(int), 0, th - 1), np.clip((UV[:, 0] % 1 * tw).astype(int), 0, tw - 1)] / 255.0
if 'COLOR_0' in A: col = col * glb.acc(j, b, A['COLOR_0'])[:, :3]
L = np.array([0.3, 0.5, 0.8]); L /= np.linalg.norm(L); H = 640; W = 560; sc = H / 1.05
rows = []
for pose in poses:
    P = np.fromfile(f'../work/poses/{label}_{pose}.f32', np.float32).reshape(-1, 3).astype(np.float64)
    fn = np.cross(P[I[:, 1]] - P[I[:, 0]], P[I[:, 2]] - P[I[:, 0]]); Nv = np.zeros_like(P)
    for k in range(3): np.add.at(Nv, I[:, k], fn)
    Nv /= np.linalg.norm(Nv, axis=1, keepdims=True) + 1e-12
    top = P[:, 1].max(); c = np.array([0, top - 0.5, (P[:, 2].min() + P[:, 2].max()) / 2])
    # densificar con centroides de triangulo para un render mas solido
    Pc = P[I].mean(1); Cc = col[I].mean(1); Nc = Nv[I].mean(1)
    PP = np.vstack([P, Pc]); CC = np.vstack([col, Cc]); NN0 = np.vstack([Nv, Nc])
    tiles = []
    for ang in views:
        a = math.radians(ang); R = np.array([[math.cos(a), 0, math.sin(a)], [0, 1, 0], [-math.sin(a), 0, math.cos(a)]])
        Q = (PP - c) @ R.T; NN = NN0 @ R.T
        x = (Q[:, 0] * sc + W / 2).astype(int); y = (H / 2 - Q[:, 1] * sc).astype(int)
        ok = (x >= 0) & (x < W) & (y >= 0) & (y < H); o = np.argsort(Q[ok, 2])
        img = np.ones((H, W, 3)) * 0.86; sh = 0.45 + 0.55 * np.clip(np.abs(NN[ok][o] @ L), 0, 1)
        img[y[ok][o], x[ok][o]] = CC[ok][o] * sh[:, None]; tiles.append(img)
    rows.append(np.hstack(tiles))
Image.fromarray((np.clip(np.vstack(rows), 0, 1) * 255).astype(np.uint8)).save(out); print('ok', out)
