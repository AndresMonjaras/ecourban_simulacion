"""Limpieza puntual de la textura base del modelo generado: manchas azules (color de la manga) pintadas
sobre la piel del brazo, mas alla del dobladillo. Solo cambia texeles azulados dentro de la huella UV de la piel
del brazo; se rellenan con el color de piel vecino (convolucion normalizada)."""
import numpy as np


def _caja(a, r):
    """Filtro de caja (2r+1) por sumas acumuladas, por eje."""
    for ax in (0, 1):
        c = np.cumsum(np.pad(a, [(r + 1, r) if k == ax else (0, 0) for k in range(a.ndim)], mode='constant'), axis=ax, dtype=np.float64)
        n = a.shape[ax]
        a = (np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=ax) - np.take(c, np.arange(0, n), axis=ax)).astype(np.float32)
    return a


def _dobladillo(V, col, lado, y_min):
    """x del dobladillo de la manga: primer corte (hacia la mano) con menos de 10 % de vertices azules."""
    for x in np.arange(0.17, 0.26, 0.0025):
        m = (np.abs(V[:, 0] * lado - x) < 0.00125) & (V[:, 1] > y_min); c = col[m].astype(int)
        if m.sum() > 20 and ((c[:, 2] > c[:, 0] + 12) & (c[:, 2] > c[:, 1])).mean() < 0.10: return x + 0.003
    return 0.21


def limpiar_azul_brazos(tex, UV, V, I, y_min=0.74, log=print):
    """tex (H,W,3) uint8; UV (n,2); V (n,3) pose T en unidades del modelo; I (m,3)."""
    H, W = tex.shape[:2]
    col = tex[np.clip((UV[:, 1] % 1 * H).astype(int), 0, H - 1), np.clip((UV[:, 0] % 1 * W).astype(int), 0, W - 1)]
    xd = {l: _dobladillo(V, col, l, y_min) for l in (1, -1)}
    # triangulos con el centroide mas alla del dobladillo (incluye tiras largas que nacen en el dobladillo)
    Cg = V[I].mean(1)
    piel_t = (Cg[:, 1] > y_min) & (((Cg[:, 0] > 0) & (Cg[:, 0] > xd[1])) | ((Cg[:, 0] < 0) & (-Cg[:, 0] > xd[-1])))
    T = I[piel_t]
    ext = np.ptp(V[T][:, :, 0], axis=1); log(f'  triangulos piel {len(T)}, alargados (>8 mm en x) {int((ext > 0.008).sum())}')
    # huella UV: muestreo baricentrico denso de cada triangulo
    k = 6; g = np.array([(a, b) for a in range(k + 1) for b in range(k + 1 - a)], float) / k
    w = np.c_[g, 1 - g.sum(1)]
    mask = np.zeros((H, W), bool)
    for s in range(0, len(T), 200000):
        t = T[s:s + 200000]; uv = np.einsum('pk,tkc->tpc', w, UV[t]).reshape(-1, 2)
        x = np.clip((uv[:, 0] % 1 * W).astype(int), 0, W - 1); y = np.clip((uv[:, 1] % 1 * H).astype(int), 0, H - 1)
        mask[y, x] = True
    m = mask.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)): m |= np.roll(mask, (dy, dx), (0, 1))
    mask = m
    t = tex.astype(np.float32); R, G, B = t[..., 0], t[..., 1], t[..., 2]
    azul = mask & (B > R - 50)        # la piel tiene B-R entre -64 y -70; la mezcla azul/piel queda por encima
    # ampliar un poco el borde de la mancha para no dejar halo
    a2 = azul.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2)): a2 |= np.roll(azul, (dy, dx), (0, 1))
    azul = a2 & mask
    buena = (mask & ~azul).astype(np.float32)
    out = tex.copy(); pend = azul.copy()
    mediana = np.median(t[buena > 0], axis=0)          # tono de piel del brazo, ultimo recurso
    for r in (24, 96):                                 # vecindad cercana y luego amplia
        den = _caja(buena, r); ok = pend & (den > 0.5)
        for ch in range(3):
            fill = _caja(t[..., ch] * buena, r) / np.maximum(den, 1e-3)
            out[..., ch][ok] = np.clip(fill[ok], 0, 255).astype(np.uint8)
        pend &= ~ok
    out[pend] = mediana.astype(np.uint8)   # tiras en islas UV de la manga, sin piel alrededor
    log(f'textura: dobladillo izq {xd[1]:.4f} der {xd[-1]:.4f}; huella piel brazo {int(mask.sum())} texeles, azulados corregidos {int(azul.sum())} (con tono medio {int(pend.sum())})')
    return out
