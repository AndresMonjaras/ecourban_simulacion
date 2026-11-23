import { CatmullRomCurve3, CylinderGeometry, DodecahedronGeometry, ExtrudeGeometry, Shape, TubeGeometry, Vector2, Vector3, type BufferGeometry } from "three";

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

/** Tubo a lo largo de una curva suave; la clave identifica el trazado. */
export function tuboGeo(clave: string, puntos: [number, number, number][], radio: number, segmentos = 64, radiales = 10) {
  return una(`tubo|${clave}|${radio}|${segmentos}|${radiales}`, () =>
    new TubeGeometry(new CatmullRomCurve3(puntos.map((p) => new Vector3(...p))), segmentos, radio, radiales, false));
}

/** Curva cacheada (para que corrientes de material y tubos compartan trazado). */
const curvas = new Map<string, CatmullRomCurve3>();
export function curva(clave: string, puntos: [number, number, number][]) {
  let c = curvas.get(clave);
  if (!c) {
    c = new CatmullRomCurve3(puntos.map((p) => new Vector3(...p)));
    curvas.set(clave, c);
  }
  return c;
}

/** Filete helicoidal de husillo a lo largo de x, centrado en el origen. */
export function heliceGeo(largo: number, radio: number, vueltas: number, grosor: number, fase = 0) {
  return una(`helice|${largo}|${radio}|${vueltas}|${grosor}|${fase}`, () => {
    const pts: Vector3[] = [];
    const n = Math.max(48, Math.round(vueltas * 14));
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const a = fase + u * Math.PI * 2 * vueltas;
      pts.push(new Vector3(-largo / 2 + u * largo, Math.cos(a) * radio, Math.sin(a) * radio));
    }
    return new TubeGeometry(new CatmullRomCurve3(pts), n * 2, grosor, 6, false);
  });
}

/** Contorno lateral conceptual del soporte (plano zy: z = profundidad, y = altura), sin cotas oficiales. */
export function perfilSoporte(escala = 1) {
  const s = new Shape();
  const P = (z: number, y: number) => [z * escala, y * escala] as const;
  s.moveTo(...P(-0.3, 0));
  s.lineTo(...P(-0.17, 0));
  s.bezierCurveTo(...P(-0.16, 0.2), ...P(-0.08, 0.25), ...P(0.01, 0.25));
  s.bezierCurveTo(...P(0.1, 0.25), ...P(0.17, 0.2), ...P(0.18, 0));
  s.lineTo(...P(0.29, 0));
  s.bezierCurveTo(...P(0.27, 0.16), ...P(0.25, 0.27), ...P(0.3, 0.33));
  s.lineTo(...P(0.3, 0.37));
  s.lineTo(...P(-0.15, 0.37));
  s.bezierCurveTo(...P(-0.2, 0.38), ...P(-0.21, 0.43), ...P(-0.22, 0.5));
  s.lineTo(...P(-0.25, 0.8));
  s.quadraticCurveTo(...P(-0.27, 0.83), ...P(-0.3, 0.8));
  s.lineTo(...P(-0.27, 0.45));
  s.bezierCurveTo(...P(-0.28, 0.3), ...P(-0.3, 0.15), ...P(-0.3, 0));
  return s;
}

/** Pieza de soporte extruida (grosor en x tras rotar), centrada en z, apoyada en y = 0. */
export function soporteGeo(grosor: number, escala = 1) {
  return una(`soporte|${grosor}|${escala}`, () => {
    const g = new ExtrudeGeometry(perfilSoporte(escala), { depth: grosor, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -grosor / 2);
    return g;
  });
}

/**
 * Bloque de molde con cavidades pasantes (se apoya sobre una placa base). El bloque se
 * extruye en y. Las cavidades se describen en el plano xz del molde.
 */
export function bloqueMoldeGeo(clave: string, w: number, d: number, alto: number, cavidades: () => Shape[]) {
  return una(`molde|${clave}|${w}|${d}|${alto}`, () => {
    const s = rectRedondeado(w, d, 0.03);
    s.holes.push(...cavidades());
    const g = new ExtrudeGeometry(s, { depth: alto, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1, curveSegments: 10 });
    g.rotateX(-Math.PI / 2);
    return g;
  });
}

/** Rectangulo redondeado como Shape reutilizable (por ejemplo, una cavidad). */
export function rectShape(w: number, h: number, r: number, cx = 0, cy = 0) {
  const s = rectRedondeado(w, h, r);
  if (cx || cy) {
    const pts = s.getPoints(6).map((p) => p.add(new Vector2(cx, cy)));
    return new Shape(pts);
  }
  return s;
}

/** Desplazamiento de un Shape (sin escala). */
export function moverShape(s: Shape, dx: number, dy: number, escala = 1) {
  return new Shape(s.getPoints(10).map((p) => new Vector2(p.x * escala + dx, p.y * escala + dy)));
}

/** Gránulo facetado de PET reciclado (entrada). */
export function granoFacetado(radio: number) {
  return una(`grano|${radio}`, () => new DodecahedronGeometry(radio, 0));
}
/** Gránulo cilíndrico cortado (compuesto peletizado). */
export function granoCilindro(radio: number) {
  return una(`granoC|${radio}`, () => new CylinderGeometry(radio, radio, radio * 1.5, 7).rotateX(Math.PI / 2));
}
