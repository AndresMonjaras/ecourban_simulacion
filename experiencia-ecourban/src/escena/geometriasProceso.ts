import { ExtrudeGeometry, Shape, type BufferGeometry } from "three";

/**
 * Geometrias reutilizables de la escena de proceso. Cacheadas por parametros:
 * una pieza igual se instancia una sola vez. Los UV de ExtrudeGeometry estan en
 * metros, asi que las microtexturas se reparten con la misma densidad en todo.
 */

const cache = new Map<string, BufferGeometry>();
const una = <T extends BufferGeometry>(clave: string, crear: () => T): T => {
  let g = cache.get(clave) as T | undefined;
  if (!g) {
    g = crear();
    cache.set(clave, g);
  }
  return g;
};

function rectRedondeado(w: number, h: number, r: number) {
  const s = new Shape();
  const x = w / 2;
  const y = h / 2;
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y);
  s.quadraticCurveTo(x, -y, x, -y + r);
  s.lineTo(x, y - r);
  s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y);
  s.quadraticCurveTo(-x, y, -x, y - r);
  s.lineTo(-x, -y + r);
  s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}

/** Caja centrada de aristas biseladas (w x h x d en x, y, z). */
export function caja(w: number, h: number, d: number, bisel = 0.008, lite = false) {
  return una(`caja|${w}|${h}|${d}|${bisel}|${lite}`, () => {
    const b = Math.min(bisel, w / 2.2, h / 2.2, d / 2.2);
    const prof = Math.max(0.0001, d - 2 * b);
    const g = new ExtrudeGeometry(rectRedondeado(Math.max(0.0001, w - 2 * b), Math.max(0.0001, h - 2 * b), b * 0.9), {
      depth: prof,
      bevelEnabled: true,
      bevelSize: b,
      bevelThickness: b,
      bevelSegments: lite ? 1 : 2,
      curveSegments: lite ? 2 : 4,
    });
    g.translate(0, 0, -prof / 2);
    return g;
  });
}

/** Disco dentado fino (hoja de sierra generica) en el plano xy, extruido en z. */
export function discoDentado(radio: number, dientes: number, lite = false) {
  return una(`disco|${radio}|${dientes}`, () => {
    const s = new Shape();
    const paso = (Math.PI * 2) / dientes;
    for (let i = 0; i < dientes; i++) {
      const a = i * paso;
      const p = (k: number, r: number) => [Math.cos(a + k * paso) * r, Math.sin(a + k * paso) * r] as const;
      const [x0, y0] = p(0, radio * 0.94);
      const [x1, y1] = p(0.15, radio);
      const [x2, y2] = p(0.8, radio * 0.945);
      if (i === 0) s.moveTo(x0, y0);
      else s.lineTo(x0, y0);
      s.lineTo(x1, y1);
      s.lineTo(x2, y2);
    }
    s.closePath();
    void lite;
    return new ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -0.002);
  });
}

/** Llave fija generica (silueta de panel de herramientas), en xy, extruida en z. */
export function llaveGeo(largo: number) {
  return una(`llave|${largo}`, () => {
    const s = new Shape();
    const a = 0.011;
    s.moveTo(-a, 0);
    s.lineTo(-a, largo - 0.04);
    s.quadraticCurveTo(-0.034, largo - 0.03, -0.034, largo + 0.002);
    s.quadraticCurveTo(-0.032, largo + 0.032, -0.008, largo + 0.036);
    s.lineTo(-0.008, largo + 0.01);
    s.lineTo(0.008, largo + 0.01);
    s.lineTo(0.008, largo + 0.036);
    s.quadraticCurveTo(0.032, largo + 0.032, 0.034, largo + 0.002);
    s.quadraticCurveTo(0.034, largo - 0.03, a, largo - 0.04);
    s.lineTo(a, 0);
    s.quadraticCurveTo(a, -0.012, 0, -0.012);
    s.quadraticCurveTo(-a, -0.012, -a, 0);
    return new ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelSize: 0.0012, bevelThickness: 0.0012, bevelSegments: 1, curveSegments: 4 }).translate(0, 0, -0.003);
  });
}
