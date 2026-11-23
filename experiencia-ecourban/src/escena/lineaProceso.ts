import { createTimeline } from "animejs";

/** Estado mutable seek-only de la continuación de fabricación. */
export const ep = {
  px: 0, py: 0.95, pz: 3.367, tx: 0, ty: 0.85, tz: 0,
  puente: 1, progreso: 0, ancho: 0, alto: 0, elev: 0, zoom: 1, pdx: 0,
  /** Envolvente de cada capítulo: 0 fuera, 1 mientras la estación está en foco. */
  p01: 0, p02: 0, p03: 0, p04: 0, p05: 0, p06: 0, p07: 0, p08: 0, p09: 0, p10: 0,
  /** Fase lineal de cada estación (0..1): llegada del material, acción y salida. */
  f01: 0, f02: 0, f03: 0, f04: 0, f05: 0, f06: 0, f07: 0, f08: 0, f09: 0, f10: 0,
  /** Luz de acento que acompaña el foco: intensidad, calidez (0 frío, 1 cálido) y posición relativa. */
  acI: 0, calido: 0.5, acX: 0, acY: 1.6, acZ: 1.2,
  /** Foco cenital del motivo principal. */
  focoI: 0,
  // Canales legacy conservados para los componentes históricos que ya no se montan.
  cuchara: 0, caida: 0, llenado: 0, traslado: 0, tolva: 0, molde: 0, compresion: 0,
  salida: 0, fan: 0, traslado2: 0, sierra: 0, taladro: 0, lija: 0,
  ensamble: 0, tornillos: 0, carga: 0, lateral: 0, revDim: 0, revAli: 0, revAca: 0, empaque: 0, caja: 0,
  invalidar: null as null | (() => void),
};

type Canal = Exclude<keyof typeof ep, "invalidar">;
type Punto = [p: number, v: number, ease?: string];
type V3 = [number, number, number];
const DURACION = 12000;

/** Centro en x de cada estación (las dos últimas comparten la banca). */
export const CENTROS = [5, 10.6, 16.2, 21.8, 27.4, 33, 38.6, 44.2, 50.4, 50.4] as const;
/** Inicio de cada capítulo en el progreso de la sección; cada uno dura CAPITULO. */
export const INICIOS = [0.08, 0.17, 0.26, 0.35, 0.44, 0.53, 0.62, 0.71, 0.8, 0.89] as const;
export const CAPITULO = 0.09;
/** La fase de cada estación empieza un poco antes de su capítulo para solapar la llegada. */
export const ANTICIPO = 0.015;

/** Progreso que deja asentado cada capítulo en el modo de movimiento reducido (acción visible). */
export const PROGRESO_ASENTADO = [0.035, 0.136, 0.226, 0.316, 0.406, 0.496, 0.586, 0.68, 0.766, 0.872, 0.95] as const;

/**
 * Toma de cámara relativa al centro de la estación. `f` es la fase local del capítulo
 * (0 = inicio del capítulo, 1 = fin). an/al: ancho y alto mínimos que deben caber.
 */
interface Toma { f: number; pos: V3; mira: V3; an: number; al?: number }

/** Movimiento de cámara propio de cada proceso. */
const TOMAS: Toma[][] = [
  // 01 Recepción: grúa que baja desde un plano alto hasta la tina de pellets.
  [
    { f: 0.12, pos: [-1.7, 3.3, 5.8], mira: [-0.1, 1.15, 0], an: 4.6, al: 2.7 },
    { f: 0.5, pos: [-0.2, 1.9, 5.0], mira: [0.15, 0.95, 0], an: 4.1, al: 2.4 },
    { f: 0.86, pos: [1.25, 1.2, 4.1], mira: [0.55, 0.62, 0.05], an: 3.3, al: 2 },
  ],
  // 02 Secado: travelling lateral siguiendo el material del deshumidificador a la tolva.
  [
    { f: 0.12, pos: [-1.6, 1.5, 5.5], mira: [-0.85, 1.15, 0], an: 3.6, al: 2.9 },
    { f: 0.5, pos: [-0.1, 1.85, 5.6], mira: [0, 1.25, 0], an: 4.3, al: 2.9 },
    { f: 0.86, pos: [1.3, 1.45, 5.1], mira: [0.75, 1.2, 0], an: 3.6, al: 2.8 },
  ],
  // 03 Dosificación: contrapicado que se acerca a la unión de las dos corrientes.
  [
    { f: 0.12, pos: [0, 0.6, 6.4], mira: [0, 1.5, 0], an: 3.9, al: 3.1 },
    { f: 0.55, pos: [-0.35, 0.85, 5.5], mira: [0, 1.45, 0], an: 3.6, al: 3.0 },
    { f: 0.86, pos: [0.85, 1.1, 5.0], mira: [0.15, 1.3, 0], an: 3.4, al: 2.8 },
  ],
  // 04 Extrusión: vista general y dolly a lo largo del cilindro, de la tolva al cabezal.
  [
    { f: 0.12, pos: [-0.5, 2.0, 6.0], mira: [0, 1.05, 0], an: 4.3, al: 2.2 },
    { f: 0.36, pos: [-1.35, 1.35, 3.7], mira: [-0.95, 0.95, 0], an: 2.4, al: 1.6 },
    { f: 0.64, pos: [0.15, 1.3, 3.5], mira: [0.2, 0.95, 0], an: 2.4, al: 1.6 },
    { f: 0.86, pos: [1.55, 1.25, 3.8], mira: [1.15, 0.92, 0], an: 2.6, al: 1.6 },
  ],
  // 05 Peletización: acercamiento macro al rotor de corte y retirada hacia la bandeja.
  [
    { f: 0.12, pos: [-0.5, 1.35, 4.9], mira: [-0.2, 0.85, 0], an: 3.8, al: 2 },
    { f: 0.5, pos: [0.6, 1.08, 3.0], mira: [0.45, 0.88, 0], an: 1.9, al: 1.2 },
    { f: 0.86, pos: [1.05, 1.75, 3.7], mira: [0.5, 0.58, 0.25], an: 2.8, al: 1.8 },
  ],
  // 06 Moldes: plano cenital que orbita sobre los tres moldes separados.
  [
    { f: 0.12, pos: [-1.9, 3.5, 3.6], mira: [0, 0.38, 0.05], an: 4, al: 2.2 },
    { f: 0.5, pos: [0, 3.8, 3.3], mira: [0, 0.35, 0.1], an: 3.9, al: 2.2 },
    { f: 0.86, pos: [1.9, 3.1, 3.8], mira: [0.15, 0.4, 0], an: 3.9, al: 2.2 },
  ],
  // 07 Prensa: plano frontal simétrico que avanza lentamente mientras cierra.
  [
    { f: 0.12, pos: [0, 1.9, 7.2], mira: [0, 1.7, 0], an: 3.9, al: 3.6 },
    { f: 0.55, pos: [0, 1.35, 5.9], mira: [0, 1.5, 0], an: 3.6, al: 3.4 },
    { f: 0.86, pos: [0.85, 1.5, 5.7], mira: [0, 1.45, 0], an: 3.6, al: 3.4 },
  ],
  // 08 Enfriamiento y desmoldeo: órbita de tres cuartos alrededor del molde abierto.
  [
    { f: 0.12, pos: [-2.1, 1.95, 4.5], mira: [-0.25, 0.8, 0], an: 3.8, al: 2.5 },
    { f: 0.5, pos: [-0.35, 1.75, 4.9], mira: [0, 0.85, 0], an: 3.9, al: 2.5 },
    { f: 0.86, pos: [1.8, 1.6, 4.4], mira: [0.45, 0.8, 0], an: 3.8, al: 2.4 },
  ],
  // 09 Acabado y ensamblaje: órbita baja alrededor de la banca mientras se arma.
  [
    { f: 0.12, pos: [-2.2, 1.55, 3.6], mira: [0.1, 0.65, 0], an: 3.2, al: 1.7 },
    { f: 0.5, pos: [-0.4, 1.15, 3.3], mira: [0.05, 0.62, 0], an: 2.8, al: 1.6 },
    { f: 0.86, pos: [1.7, 1.3, 3.2], mira: [0.2, 0.66, 0], an: 2.8, al: 1.6 },
  ],
  // 10 Inspección: seguimiento del barrido de revisión y apertura al producto terminado.
  [
    { f: 0.12, pos: [1.9, 1.4, 3.3], mira: [0.1, 0.66, 0], an: 2.7, al: 1.6 },
    { f: 0.45, pos: [0.25, 1.1, 2.9], mira: [0.05, 0.62, 0], an: 2.3, al: 1.4 },
    { f: 0.8, pos: [-0.9, 1.35, 3.9], mira: [0.35, 0.66, 0], an: 3.4, al: 1.8 },
    { f: 1.0, pos: [0.15, 1.15, 4.3], mira: [0.35, 0.62, 0], an: 3.5, al: 1.8 },
  ],
];

/** Luz de acento por estación: color cualitativo (calor, frío o neutro) y posición. Sin valores de proceso. */
const LUCES: { i: number; c: number; o: V3 }[] = [
  { i: 0.9, c: 0.62, o: [-1.4, 1.9, -0.4] }, // portón de recepción, luz exterior cálida
  { i: 0.7, c: 0.35, o: [0, 2.2, 1.2] },
  { i: 0.7, c: 0.4, o: [0, 2.2, 1.4] },
  { i: 1.6, c: 1, o: [0.2, 1.2, 1.1] }, // bandas de calor del cilindro
  { i: 0.9, c: 0.75, o: [0.4, 1.3, 1.0] },
  { i: 0.6, c: 0.4, o: [0, 2.4, 0.6] },
  { i: 1.7, c: 1, o: [0, 1.1, 1.2] }, // platos calientes de la prensa
  { i: 1.2, c: 0, o: [0.6, 1.6, 1.1] }, // enfriamiento: acento frío
  { i: 0.7, c: 0.5, o: [0.8, 1.8, 1.4] },
  { i: 0.9, c: 0.3, o: [0, 2.0, 1.4] },
];

const CAMARA: { p: number; pos: V3; mira: V3; an?: number; al?: number }[] = [
  { p: 0, pos: [0, 0.9, 3.367], mira: [0, 0.44, 0] },
  { p: 0.08, pos: [0, 0.9, 3.367], mira: [0, 0.44, 0] },
];
INICIOS.forEach((inicio, i) => {
  const c = CENTROS[i];
  const tomas = TOMAS[i].map((t) => ({
    p: Math.min(1, inicio + t.f * CAPITULO),
    pos: [c + t.pos[0], t.pos[1], t.pos[2]] as V3,
    mira: [c + t.mira[0], t.mira[1], t.mira[2]] as V3,
    an: t.an,
    al: t.al ?? 0,
  }));
  const previa = CAMARA[CAMARA.length - 1];
  if (i > 0 && previa.pos[0] !== tomas[0].pos[0]) {
    // Traslado entre estaciones: la cámara se eleva y retrocede a medio camino (plano grúa).
    const a = previa;
    const b = tomas[0];
    const mid = (u: V3, v: V3, dy = 0, dz = 0): V3 => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2 + dy, (u[2] + v[2]) / 2 + dz];
    CAMARA.push({ p: (a.p + b.p) / 2, pos: mid(a.pos, b.pos, 0.75, 1.1), mira: mid(a.mira, b.mira, 0.15), an: Math.max(a.an ?? 0, b.an) + 1.2, al: Math.max(a.al ?? 0, b.al) });
  }
  CAMARA.push(...tomas);
});

const CANALES: Partial<Record<Canal, Punto[]>> = {};
INICIOS.forEach((inicio, i) => {
  const fin = Math.min(1, inicio + CAPITULO);
  const n = String(i + 1).padStart(2, "0");
  CANALES[`p${n}` as Canal] = i === 9
    ? [[0, 0], [inicio, 0], [inicio + 0.025, 1], [1, 1]]
    : [[0, 0], [inicio, 0], [inicio + 0.025, 1], [fin - 0.02, 1], [fin, 0], [1, 0]];
  CANALES[`f${n}` as Canal] = [[0, 0], [inicio - ANTICIPO, 0], [i === 9 ? 0.98 : fin, 1, "linear"], [1, 1]];
});
CANALES.puente = [[0, 1], [0.08, 1], [0.105, 0]];
// El ensamblaje progresivo ocupa la parte central del capítulo 09.
CANALES.ensamble = [[0, 0], [INICIOS[8] + 0.03, 0], [INICIOS[8] + 0.082, 1, "inOutQuad"], [1, 1]];

// Luz de acento: sube en cada estación y baja durante los traslados, con color propio.
CANALES.acI = [[0, 0], [0.08, 0]];
CANALES.calido = [[0, 0.5], [0.08, 0.5]];
CANALES.acX = [[0, 0], [0.08, 0]];
CANALES.acY = [[0, 1.6], [0.08, 1.6]];
CANALES.acZ = [[0, 1.2], [0.08, 1.2]];
CANALES.focoI = [[0, 0], [0.08, 0], [0.105, 1], [1, 1]];
INICIOS.forEach((inicio, i) => {
  const l = LUCES[i];
  const a = inicio + 0.02;
  const b = Math.min(0.995, inicio + CAPITULO - 0.012);
  CANALES.acI!.push([inicio + 0.004, 0.15], [a, l.i], [b, l.i]);
  if (i < 9) CANALES.acI!.push([inicio + CAPITULO, 0.15]);
  CANALES.calido!.push([inicio + 0.004, CANALES.calido![CANALES.calido!.length - 1][1]], [a, l.c], [b, l.c]);
  CANALES.acX!.push([a, l.o[0]], [b, l.o[0]]);
  CANALES.acY!.push([a, l.o[1]], [b, l.o[1]]);
  CANALES.acZ!.push([a, l.o[2]], [b, l.o[2]]);
});

export interface LineaProceso { buscar(progreso: number): void; detener(): void }

/** Timeline pausada. Cada estado procede exclusivamente de seek(scroll). */
export function crearLineaProceso(): LineaProceso {
  const tl = createTimeline({ autoplay: false, defaults: { ease: "inOutSine" } });
  const encadenar = (prop: Canal, puntos: Punto[]) => {
    for (let i = 1; i < puntos.length; i++) {
      const [p0, a] = puntos[i - 1];
      const [p1, b, ease = "inOutSine"] = puntos[i];
      if (p1 <= p0) continue;
      tl.add(ep, { [prop]: [a, b], duration: (p1 - p0) * DURACION, ease }, p0 * DURACION);
    }
  };
  (Object.keys(CANALES) as Canal[]).forEach((c) => encadenar(c, CANALES[c]!));
  const ejes: [Canal, (k: (typeof CAMARA)[number]) => number][] = [
    ["px", (k) => k.pos[0]], ["py", (k) => k.pos[1]], ["pz", (k) => k.pos[2]],
    ["tx", (k) => k.mira[0]], ["ty", (k) => k.mira[1]], ["tz", (k) => k.mira[2]],
    ["ancho", (k) => k.an ?? 0], ["alto", (k) => k.al ?? 0],
  ];
  for (const [eje, f] of ejes) encadenar(eje, CAMARA.map((k) => [k.p, f(k)] as Punto));
  let ultimoP = -1;
  tl.seek(0);
  return {
    buscar(progreso) {
      const p = Math.min(1, Math.max(0, progreso));
      if (
        ultimoP >= 0 &&
        (Math.abs(p - ultimoP) < 1e-6 ||
          (p <= 0.08 && ultimoP <= 0.08 && (p >= 0.025) === (ultimoP >= 0.025)))
      ) return;
      ultimoP = p;
      ep.progreso = p;
      tl.seek(p * DURACION);
      ep.invalidar?.();
    },
    detener() { tl.pause(); },
  };
}

/** Suavizado 0..1 entre a y b (para subfases dentro de una estación). */
export function tramo(v: number, a: number, b: number) {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
/** Lineal 0..1 entre a y b. */
export function lineal(v: number, a: number, b: number) {
  return Math.max(0, Math.min(1, (v - a) / (b - a)));
}
