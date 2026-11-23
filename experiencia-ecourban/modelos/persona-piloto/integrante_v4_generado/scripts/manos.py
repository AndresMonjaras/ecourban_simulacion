"""Ajuste local de las manos del modelo generado (pose T, unidades del modelo). Solo toca vertices de las manos.

- Dedos fusionados: se acentuan los surcos entre dedos (los surcos reales, por encima de un umbral, se hunden mas) y se oscurecen con color de vertice (oclusion), para que cada dedo se lea separado.
La topologia y la UV no cambian: los vertices duplicados por costuras UV se sueldan por posicion para suavizar.
"""
import numpy as np


def _sm(a, b, t):
    u = np.clip((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u)


def _normales(P, T):
    fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]); N = np.zeros_like(P)
    for k in range(3): np.add.at(N, T[:, k], fn)
    return N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-12)


def ajustar_manos(V, I, x_muneca=0.385, y_min=0.78, prof=1.0, ao=0.6, log=print):
    """V (n,3) e I (m,3) del modelo en pose T. Devuelve (V nuevo, mascara de vertices tocados, oclusion por vertice)."""
    V = V.copy(); occ = np.ones(len(V)); tocado = np.zeros(len(V), bool)
    for lado in (1, -1):
        reg = (V[:, 0] * lado > x_muneca) & (V[:, 1] > y_min)
        idx = np.nonzero(reg)[0]
        q = np.round(V[idx] / 2e-6).astype(np.int64); _, w = np.unique(q, axis=0, return_inverse=True); w = w.ravel()
        nw = w.max() + 1; loc = np.full(len(V), -1); loc[idx] = w
        T = I[reg[I].all(1)]; Tw = loc[T]
        P = np.zeros((nw, 3)); P[w] = V[idx]
        E = np.concatenate([Tw[:, [0, 1]], Tw[:, [1, 2]], Tw[:, [2, 0]]]); E = np.concatenate([E, E[:, ::-1]])
        deg = np.bincount(E[:, 0], minlength=nw).astype(float)
        fijo = np.zeros(nw, bool); fijo[w[V[idx, 0] * lado < x_muneca + 0.006]] = True   # borde con el antebrazo
        def suaviza(X, it, lam=0.6, mu=None):
            X = X.copy()
            for k in range(it):
                M = np.zeros_like(X); np.add.at(M, E[:, 0], X[E[:, 1]]); M /= np.maximum(deg, 1)[:, None]
                f = lam if (mu is None or k % 2 == 0) else mu
                X[~fijo] += f * (M - X)[~fijo]
            return X
        def media(a, it=1):
            for _ in range(it):
                M = np.zeros(nw); np.add.at(M, E[:, 0], a[E[:, 1]]); a = 0.5 * a + 0.5 * M / np.maximum(deg, 1)
            return a
        esp = np.zeros(nw)
        # 2) surcos entre dedos: realce de la geometria a la escala de un surco
        N = _normales(P, Tw); Ps = suaviza(P, 25); dlt = Ps - P; c = np.einsum('ij,ij->i', dlt, N)   # c>0: concavo
        zona = _sm(x_muneca + 0.02, x_muneca + 0.045, P[:, 0] * lado) * (1 - esp)
        c0 = 0.00015
        g = media(prof * _sm(c0, 3 * c0, c) * zona, 3)      # solo surcos reales, sin realzar ruido
        P = P - dlt * g[:, None]
        cref = np.percentile(c[zona > 0.5], 97) if (zona > 0.5).any() else 1.0
        o = 1 - ao * np.clip(c / cref, 0, 1) * zona
        M = np.zeros(nw); np.add.at(M, E[:, 0], o[E[:, 1]]); o = 0.5 * o + 0.5 * M / np.maximum(deg, 1)   # suavizar la oclusion
        V[idx] = P[w]; occ[idx] = o[w]; tocado[idx] = (esp[w] > 0) | (zona[w] > 0)
        log(f'mano {"izq" if lado > 0 else "der"}: {len(idx)} vertices, surco max {c.max() * 1000:.2f} mm')
    return V, tocado, occ


def normales_locales(V, I, N, tocado):
    """Recalcula normales solo donde se movio la geometria (soldando costuras UV)."""
    reg = tocado.copy(); T = I[reg[I].any(1)]; ids = np.unique(T)
    q = np.round(V[ids] / 2e-6).astype(np.int64); _, w = np.unique(q, axis=0, return_inverse=True); w = w.ravel()
    loc = np.full(len(V), -1); loc[ids] = w; P = np.zeros((w.max() + 1, 3)); P[w] = V[ids]
    Nw = _normales(P, loc[T]); N = N.copy(); N[tocado] = Nw[loc[tocado]]; return N
