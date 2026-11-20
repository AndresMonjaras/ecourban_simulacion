import {
  CanvasTexture,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Fabricas compartidas por Banca (despiece) y BancaProceso (proceso): texturas
 * PET deterministas, perfiles redondeados, soporte arqueado y tornilleria
 * conceptual. Una sola definicion para que el producto no cambie de diseno.
 */

/** Inclinacion del respaldo (rad) y largo de la banca (m): comunes a despiece y proceso. */
export const INCLINACION = -0.2;
export const ANCHO = 1.8;

/** PRNG determinista (mulberry32): la textura y microvariacion son identicas en cada carga. */
export function aleatorio(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hexARgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/** Desenfoque 3x3 con envoltura toroidal: redondea los escalones del relieve para que lea como polimero moldeado. */
function suavizar(g: CanvasRenderingContext2D, tam: number) {
  const img = g.getImageData(0, 0, tam, tam);
  const src = new Uint8ClampedArray(img.data);
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      let a = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const w = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1;
          a +=
            src[(((y + dy + tam) % tam) * tam + ((x + dx + tam) % tam)) * 4] *
            w;
        }
      }
      const i = (y * tam + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = a / 16;
    }
  }
  g.putImageData(img, 0, 0);
}

/** Genera un mapa de normales en espacio tangente a partir del campo de alturas suavizado (con envoltura). */
function crearNormalDesdeRelieve(
  gb: CanvasRenderingContext2D,
  tam: number,
  fuerza: number,
): HTMLCanvasElement {
  const src = gb.getImageData(0, 0, tam, tam).data;
  const cn = document.createElement("canvas");
  cn.width = cn.height = tam;
  const gn = cn.getContext("2d")!;
  const out = gn.createImageData(tam, tam);
  const dst = out.data;
  const h = (x: number, y: number) =>
    src[(((y + tam) % tam) * tam + ((x + tam) % tam)) * 4] / 255;

  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * fuerza;
      const dy = (h(x, y + 1) - h(x, y - 1)) * fuerza;
      const dz = 1;
      const inv = 1 / Math.hypot(dx, dy, dz);
      const i = (y * tam + x) * 4;
      dst[i] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      dst[i + 1] = Math.round((dy * inv * 0.5 + 0.5) * 255);
      dst[i + 2] = Math.round((dz * inv * 0.5 + 0.5) * 255);
      dst[i + 3] = 255;
    }
  }
  gn.putImageData(out, 0, 0);
  return cn;
}

/**
 * Texturas procedurales de PET reciclado (color, rugosidad, relieve bump y normalMap):
 * combina matriz polimerica con estrias sutiles de extrusion, manchas de lote,
 * escamas embebidas de varias escalas y microporos sin costuras de mosaico.
 */
export function texturasPET(
  base: string,
  tonos: [string, string, string],
  semilla: number,
  tam: number,
  repeticion: [number, number],
  estriasExtrusion: boolean,
) {
  const rnd = aleatorio(semilla);
  const color = document.createElement("canvas");
  const rugo = document.createElement("canvas");
  const relieve = document.createElement("canvas");
  color.width =
    color.height =
    rugo.width =
    rugo.height =
    relieve.width =
    relieve.height =
      tam;
  const gc = color.getContext("2d")!;
  const gr = rugo.getContext("2d")!;
  const gb = relieve.getContext("2d")!;
  gb.fillStyle = "#808080";
  gb.fillRect(0, 0, tam, tam);
  gc.fillStyle = base;
  gc.fillRect(0, 0, tam, tam);
  gr.fillStyle = "#c2c2c2";
  gr.fillRect(0, 0, tam, tam);

  // Grano fino de la matriz y microestrias longitudinales de extrusion en listones/tablones.
  const grano = gc.getImageData(0, 0, tam, tam);
  const gr0 = gb.getImageData(0, 0, tam, tam);
  const rg0 = gr.getImageData(0, 0, tam, tam);
  const fase1 = rnd() * Math.PI * 2;
  const fase2 = rnd() * Math.PI * 2;
  for (let y = 0; y < tam; y++) {
    const ondaY = estriasExtrusion
      ? Math.sin((y / tam) * Math.PI * 18 + fase1) * 3.5 +
        Math.sin((y / tam) * Math.PI * 46 + fase2) * 2.2
      : 0;
    for (let x = 0; x < tam; x++) {
      const i = (y * tam + x) * 4;
      const d = (rnd() - 0.5) * 7 + ondaY * 0.45;
      grano.data[i] = Math.min(255, Math.max(0, grano.data[i] + d));
      grano.data[i + 1] = Math.min(255, Math.max(0, grano.data[i + 1] + d));
      grano.data[i + 2] = Math.min(255, Math.max(0, grano.data[i + 2] + d));

      const dh = (rnd() - 0.5) * 11 + ondaY * 1.4;
      gr0.data[i] = gr0.data[i + 1] = gr0.data[i + 2] = Math.min(
        255,
        Math.max(0, 128 + dh),
      );

      const dr = (rnd() - 0.5) * 9 - ondaY * 0.8;
      rg0.data[i] = rg0.data[i + 1] = rg0.data[i + 2] = Math.min(
        255,
        Math.max(0, 194 + dr),
      );
    }
  }
  gc.putImageData(grano, 0, 0);
  gb.putImageData(gr0, 0, 0);
  gr.putImageData(rg0, 0, 0);

  // Variacion tonal local: manchas anchas y suaves (lotes de resina reciclada mezclados), con envoltura.
  for (let i = 0; i < 30; i++) {
    const x = rnd() * tam;
    const y = rnd() * tam;
    const r = tam * (0.08 + rnd() * 0.16);
    const claro = rnd() > 0.48;
    for (const ox of [-tam, 0, tam]) {
      for (const oy of [-tam, 0, tam]) {
        if (x + ox < -r || x + ox > tam + r || y + oy < -r || y + oy > tam + r)
          continue;
        const gd = gc.createRadialGradient(
          x + ox,
          y + oy,
          0,
          x + ox,
          y + oy,
          r,
        );
        gd.addColorStop(
          0,
          claro ? "rgba(255,255,255,0.065)" : "rgba(0,0,0,0.07)",
        );
        gd.addColorStop(1, "rgba(0,0,0,0)");
        gc.fillStyle = gd;
        gc.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }

  // Escamas de PET reciclado de escala media y micro-hojuelas embebidas.
  const paleta = [...tonos.map(hexARgb), hexARgb(base)];
  const n = Math.round((tam * tam) / 310);
  for (let i = 0; i < n; i++) {
    const x = rnd() * tam;
    const y = rnd() * tam;
    const esMicro = i > n * 0.68;
    const r = esMicro ? 0.9 + rnd() * 2.1 : 1.7 + rnd() * rnd() * 6.2;
    const ang = rnd() * Math.PI;
    const lados = 4 + Math.floor(rnd() * 3);
    const [cr, cg, cb] = paleta[Math.floor(rnd() * paleta.length)];
    const k = esMicro ? 0.78 + rnd() * 0.48 : 0.84 + rnd() * 0.32;
    const alfa = esMicro ? 0.2 + rnd() * 0.24 : 0.15 + rnd() * 0.22;
    const liso = 136 + Math.floor(rnd() * 54);
    const alto =
      rnd() > 0.42
        ? 128 + 14 + Math.floor(rnd() * 18)
        : 128 - 12 - Math.floor(rnd() * 15);
    const canto = Math.min(255, alto + 18);
    for (const ox of [-tam, 0, tam]) {
      for (const oy of [-tam, 0, tam]) {
        if (x + ox < -9 || x + ox > tam + 9 || y + oy < -9 || y + oy > tam + 9)
          continue;
        for (const [g, relleno] of [
          [
            gc,
            `rgba(${Math.min(255, cr * k) | 0},${Math.min(255, cg * k) | 0},${Math.min(255, cb * k) | 0},${alfa})`,
          ],
          [gr, `rgba(${liso},${liso},${liso},0.58)`],
          [gb, `rgba(${alto},${alto},${alto},0.72)`],
        ] as const) {
          g.fillStyle = relleno;
          g.beginPath();
          for (let j = 0; j < lados; j++) {
            const a = ang + (j / lados) * Math.PI * 2 + (rnd() - 0.5) * 0.55;
            const rr = r * (0.62 + rnd() * 0.68) * (j % 2 ? 1.55 : 1);
            const px = x + ox + Math.cos(a) * rr;
            const py = y + oy + Math.sin(a) * rr * 0.66;
            if (j === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.closePath();
          g.fill();
          if (g === gb && !esMicro) {
            g.strokeStyle = `rgba(${canto},${canto},${canto},0.36)`;
            g.lineWidth = 0.75;
            g.stroke();
          }
        }
      }
    }
  }

  suavizar(gb, tam);
  const normal = crearNormalDesdeRelieve(gb, tam, 3.2);

  const preparar = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new CanvasTexture(c);
    if (srgb) t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 4;
    t.repeat.set(repeticion[0], repeticion[1]);
    return t;
  };
  return {
    map: preparar(color, true),
    roughnessMap: preparar(rugo, false),
    bumpMap: preparar(relieve, false),
    normalMap: preparar(normal, false),
  };
}

/** Liston de perfil redondeado con ligero abombado superficial y cantos suavizados. */
export function geometriaListon(
  largo: number,
  alto: number,
  grueso: number,
  lite: boolean,
) {
  const bis = 0.0045;
  const w = grueso - bis * 2;
  const h = alto - bis * 2;
  const r = Math.min(w, h) * 0.38;
  const comba = Math.min(w, h) * 0.04;
  const s = new Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.quadraticCurveTo(0, -h / 2 - comba * 0.5, w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.quadraticCurveTo(w / 2 + comba, 0, w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.quadraticCurveTo(0, h / 2 + comba, -w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.quadraticCurveTo(-w / 2 - comba, 0, -w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const depth = largo - bis * 2;
  const g = new ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelSize: bis,
    bevelThickness: bis,
    bevelSegments: lite ? 2 : 4,
    curveSegments: lite ? 5 : 10,
  });
  g.translate(0, 0, -depth / 2);
  g.rotateY(Math.PI / 2); // eje de extrusion (z) -> largo de la banca (x)
  g.computeVertexNormals();
  return g;
}

/** Pletina trasera conceptual con extremos redondeados y bisel suave (no representa plano ni union confirmada). */
export function geometriaPletina(lite: boolean) {
  const w = 0.023;
  const h = 0.5;
  const s = new Shape();
  s.moveTo(-w, w);
  s.quadraticCurveTo(-w, 0, 0, 0);
  s.quadraticCurveTo(w, 0, w, w);
  s.lineTo(w, h - w);
  s.quadraticCurveTo(w, h, 0, h);
  s.quadraticCurveTo(-w, h, -w, h - w);
  s.closePath();
  const g = new ExtrudeGeometry(s, {
    depth: 0.0065,
    bevelEnabled: true,
    bevelSize: 0.0014,
    bevelThickness: 0.0014,
    bevelSegments: lite ? 1 : 2,
    curveSegments: lite ? 4 : 8,
  });
  g.translate(0, -0.05, -0.0268);
  g.computeVertexNormals();
  return g;
}

export function geometriaSoporte(lite: boolean) {
  const s = new Shape();
  // Silueta en arco con transiciones suaves: pies redondeados, tunel central y cuna superior.
  s.moveTo(-0.295, 0.008);
  s.quadraticCurveTo(-0.295, 0, -0.28, 0);
  s.lineTo(-0.14, 0);
  s.quadraticCurveTo(-0.128, 0, -0.13, 0.018);
  s.bezierCurveTo(-0.138, 0.275, 0.138, 0.275, 0.13, 0.018);
  s.quadraticCurveTo(0.128, 0, 0.14, 0);
  s.lineTo(0.28, 0);
  s.quadraticCurveTo(0.295, 0, 0.295, 0.008);
  s.quadraticCurveTo(0.27, 0.205, 0.232, 0.402);
  s.quadraticCurveTo(0.228, 0.432, 0.198, 0.432);
  s.lineTo(-0.198, 0.432);
  s.quadraticCurveTo(-0.228, 0.432, -0.232, 0.402);
  s.quadraticCurveTo(-0.27, 0.205, -0.295, 0.008);
  s.closePath();
  const prof = 0.15;
  const g = new ExtrudeGeometry(s, {
    depth: prof,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: lite ? 3 : 7,
    curveSegments: lite ? 10 : 22,
  });
  g.translate(0, 0, -prof / 2);
  g.rotateY(-Math.PI / 2); // x de la silueta -> profundidad (z) de la banca
  g.computeVertexNormals();
  return g;
}

/**
 * Tornilleria conceptual (aproximacion visual, no union ni despiece confirmado en BOM):
 * asiento biselado + arandela + cabeza abombada de acero inoxidable con hueco hexagonal oscuro.
 */
export function crearTornillo(lite: boolean) {
  const seg = lite ? 12 : 22;
  const collar = new CylinderGeometry(0.0114, 0.0118, 0.001, seg);
  collar.translate(0, 0.0005, 0);
  const arandela = new CylinderGeometry(0.0102, 0.0104, 0.002, seg);
  arandela.translate(0, 0.0018, 0);
  const perfil = [
    [0, 0.0026],
    [0.0069, 0.0026],
    [0.0071, 0.0046],
    [0.0064, 0.0062],
    [0.0046, 0.0072],
    [0.0022, 0.0076],
    [0, 0.0077],
  ].map(([x, y]) => new Vector2(x, y));
  const cabeza = new LatheGeometry(perfil, seg);
  const acero = mergeGeometries([
    collar.toNonIndexed(),
    arandela.toNonIndexed(),
    cabeza.toNonIndexed(),
  ])!;
  collar.dispose();
  arandela.dispose();
  cabeza.dispose();
  acero.computeVertexNormals();
  const hueco = new CylinderGeometry(0.0033, 0.0031, 0.0018, 6);
  hueco.translate(0, 0.007, 0);
  const material = new MeshStandardMaterial({
    color: "#a7aeb6",
    metalness: 0.92,
    roughness: 0.38,
    envMapIntensity: 1.2,
  });
  const materialHueco = new MeshStandardMaterial({
    color: "#090b0e",
    metalness: 0.25,
    roughness: 0.85,
  });
  return {
    acero,
    hueco,
    material,
    materialHueco,
    dispose() {
      acero.dispose();
      hueco.dispose();
      material.dispose();
      materialHueco.dispose();
    },
  };
}


/** Materiales y texturas PET de la banca (mismas semillas y parametros en ambas secciones). */
export function crearMaterialesBanca(lite: boolean) {
  const tam = lite ? 256 : 512;
  // Semillas deterministas distintas para evitar repeticion artificial entre piezas.
  const tg = [11, 23, 31, 47].map((sem) =>
    texturasPET("#313539", ["#4c5156", "#232629", "#5c6167"], sem, tam, [4, 1], true),
  );
  const ts = [37, 59].map((sem) =>
    texturasPET("#277746", ["#39985c", "#1a5632", "#4fb073"], sem, tam, [3, 3], false),
  );
  const mat = (t: ReturnType<typeof texturasPET>, rugosidad: number, tinte: string, escalaNormal: number) =>
    new MeshPhysicalMaterial({
      ...t,
      normalScale: new Vector2(escalaNormal, escalaNormal),
      bumpScale: 0.0038,
      color: tinte,
      roughness: rugosidad,
      metalness: 0,
      clearcoat: 0.22,
      clearcoatRoughness: 0.48,
    });
  const tintes = ["#fafbfc", "#f1f2f5", "#e7e9ed", "#f5f4f0"];
  const rugosidades = [0.74, 0.77, 0.73, 0.76];
  const respaldo = [0, 1, 2].map((i) => mat(tg[i % 4], rugosidades[i], tintes[i], 0.36));
  const asiento = [0, 1, 2, 3].map((i) => mat(tg[(i + 1) % 4], rugosidades[(i + 1) % 4], tintes[(i + 2) % 4], 0.38));
  const soportes = [mat(ts[0], 0.68, "#ffffff", 0.42), mat(ts[1], 0.7, "#f3f8f5", 0.42)];
  const acero = new MeshStandardMaterial({ color: "#282c32", metalness: 0.68, roughness: 0.52, envMapIntensity: 0.65 });
  return {
    tg,
    ts,
    texturas: [...tg, ...ts],
    respaldo,
    asiento,
    soportes,
    acero,
    dispose() {
      [...tg, ...ts].forEach((t) => {
        t.map.dispose();
        t.roughnessMap.dispose();
        t.bumpMap.dispose();
        t.normalMap.dispose();
      });
      [...respaldo, ...asiento, ...soportes, acero].forEach((x) => x.dispose());
    },
  };
}
