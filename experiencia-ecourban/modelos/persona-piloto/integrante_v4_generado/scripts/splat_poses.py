# Render rapido por puntos (z-buffer por pixel) del modelo de 832k vertices en poses de la app.
import sys, os, io, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glb, numpy as np
from PIL import Image
path, posedir, label, poses, views, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(','), [int(v) for v in sys.argv[5].split(',')], sys.argv[6]
H = int(sys.argv[7]) if len(sys.argv) > 7 else 520
j, b = glb.load(path); p = j['meshes'][0]['primitives'][0]; A = p['attributes']
UV = glb.acc(j, b, A['TEXCOORD_0']); N0 = glb.acc(j, b, A['NORMAL'])
ti = j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']
T = np.asarray(Image.open(io.BytesIO(glb.img(j, b, j['textures'][ti]['source']))).convert('RGB'))
th, tw = T.shape[:2]; col = T[np.clip((UV[:, 1] % 1 * th).astype(int), 0, th - 1), np.clip((UV[:, 0] % 1 * tw).astype(int), 0, tw - 1)] / 255.0
I = glb.acc(j, b, p['indices']).reshape(-1, 3)
W = int(H * 0.6); sc = H / 2.1; cy = 1.0; L = np.array([0.3, 0.5, 0.8]); L /= np.linalg.norm(L)
rows = []
for pose in poses:
    P = np.fromfile(f'{posedir}/{label}_{pose}.f32', np.float32).reshape(-1, 3).astype(np.float64) if pose != 'reposo' else glb.acc(j, b, A['POSITION']).astype(np.float64)
    # normales en pose: por caras
    fn = np.cross(P[I[:, 1]] - P[I[:, 0]], P[I[:, 2]] - P[I[:, 0]]); Nv = np.zeros_like(P)
    for k in range(3): np.add.at(Nv, I[:, k], fn)
    Nv /= np.linalg.norm(Nv, axis=1, keepdims=True) + 1e-12
    c = np.array([(P[:, 0].min() + P[:, 0].max()) / 2, cy, (P[:, 2].min() + P[:, 2].max()) / 2])
    tiles = []
    for ang in views:
        a = math.radians(ang); R = np.array([[math.cos(a), 0, math.sin(a)], [0, 1, 0], [-math.sin(a), 0, math.cos(a)]])
        Q = (P - c) @ R.T; NN = Nv @ R.T
        x = (Q[:, 0] * sc + W / 2).astype(int); y = (H / 2 - Q[:, 1] * sc).astype(int); z = Q[:, 2]
        ok = (x >= 0) & (x < W) & (y >= 0) & (y < H)
        img = np.ones((H, W, 3)) * 0.86
        o = np.argsort(z[ok]); xi, yi = x[ok][o], y[ok][o]
        sh = 0.45 + 0.55 * np.clip(np.abs(NN[ok][o] @ L), 0, 1)
        img[yi, xi] = col[ok][o] * sh[:, None]   # el ultimo (mas cercano) gana
        tiles.append(img)
    rows.append(np.hstack(tiles))
Image.fromarray((np.clip(np.vstack(rows) if len(rows) == 1 else np.hstack(rows), 0, 1) * 255).astype(np.uint8)).save(out)
print('ok', out)
