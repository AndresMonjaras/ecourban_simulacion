import { createTimeline } from "animejs";

/**
 * Estado mutable de la escena "Proceso propuesto". Lo escribe unicamente la
 * timeline Anime.js (seek) y lo lee R3F en useFrame: sin re-render de React.
 */
export const ep = {
  // camara (posicion y objetivo en metros de escena)
  px: 0, py: 0.9, pz: 3.367, tx: 0, ty: 0.44, tz: 0,
  // peso (1..0) del encuadre puente inicial coincidente con tomaBase del despiece (0..0.14)
  puente: 1,
  // progreso normalizado actual de la seccion (0..1)
  progreso: 0,
  // ancho (m) del motivo principal: el rig aleja la camara lo necesario para que quepa en pantallas estrechas (0 = sin requisito)
  ancho: 0,
  // elevacion extra de camara (m), solo en pantallas verticales: toma cenital suave sobre la zona de trabajo
  elev: 0,
  // solo vertical: factor de distancia de camara (1 = sin cambio) y desplazamiento lateral del encuadre (m)
  zoom: 1, pdx: 0,
  // materia y maquila
  cuchara: 0, caida: 0, llenado: 0, traslado: 0, tolva: 0, molde: 0, compresion: 0,
  // desmolde y recepcion
  salida: 0, fan: 0, traslado2: 0,
  // taller
  sierra: 0, taladro: 0, lija: 0,
  // ensamble
  ensamble: 0, tornillos: 0,
  // prueba de capacidad, inspeccion, empaque y salida
  carga: 0,
  lateral: 0,
  revDim: 0, revAli: 0, revAca: 0, empaque: 0, caja: 0,
  invalidar: null as null | (() => void),
};

type Canal = Exclude<keyof typeof ep, "invalidar">;
type Punto = [p: number, v: number, ease?: string];

const DURACION = 10000;

/** Progreso (0..1) en el que cada hito queda asentado; sirve para reduced-motion. */
export const PROGRESO_ASENTADO = [0.05, 0.255, 0.41, 0.55, 0.69, 0.802, 0.86, 0.94, 1] as const;

const CAMARA: { p: number; pos: [number, number, number]; mira: [number, number, number]; an?: number; ev?: number; zm?: number; dx?: number }[] = [
  { p: 0.0, pos: [0, 0.9, 3.367], mira: [0, 0.44, 0] },
  { p: 0.14, pos: [0, 0.9, 3.367], mira: [0, 0.44, 0] },
  { p: 0.19, pos: [3.5, 1.35, 2.3], mira: [3.5, 0.62, 0], an: 1.4 },
  { p: 0.265, pos: [3.4, 1.1, 1.6], mira: [3.5, 0.6, 0], an: 1.4 },
  { p: 0.31, pos: [5.5, 1.25, 3.4], mira: [5.5, 0.9, 0] },
  // 02 maquila: se aleja para que la maquina completa quepa (antes un plano cercano recortaba el volumen)
  { p: 0.35, pos: [7.9, 1.1, 4.3], mira: [7.95, 0.5, 0], an: 2.5 },
  { p: 0.42, pos: [7.95, 1.0, 4.2], mira: [7.95, 0.4, 0], an: 2.5 },
  { p: 0.455, pos: [10.2, 1.9, 4.1], mira: [10.2, 0.5, 0] },
  { p: 0.56, pos: [10.9, 1.8, 3.7], mira: [10.9, 0.5, 0] },
  { p: 0.585, pos: [14.5, 1.45, 3.3], mira: [14.5, 0.68, 0] },
  // 04 taller: macro breve del perforado y toma asentada con mesa, sierra y portico completos
  { p: 0.65, pos: [14.3, 1.1, 3.0], mira: [14.3, 0.62, 0], an: 1.4 },
  { p: 0.705, pos: [14.6, 0.95, 3.1], mira: [14.55, 0.62, 0], an: 0.6, ev: 3.0, zm: 0.55, dx: 0.12 },
  { p: 0.74, pos: [19, 1.2, 4.0], mira: [19, 0.5, 0], an: 2.1 },
  { p: 0.805, pos: [19.1, 1.05, 3.3], mira: [19, 0.46, 0], an: 2.1 },
  { p: 0.835, pos: [19.0, 1.03, 3.45], mira: [19, 0.48, 0], an: 1.9 },
  { p: 0.855, pos: [18.55, 0.96, 3.65], mira: [19, 0.5, 0], an: 1.8 },
  { p: 0.86, pos: [18.5, 0.98, 3.65], mira: [19, 0.5, 0], an: 1.85 },
  { p: 0.885, pos: [18.7, 1.18, 4.0], mira: [19, 0.45, 0], an: 2.1 },
  { p: 0.93, pos: [19.0, 1.2, 4.9], mira: [19.0, 0.5, 0], an: 3.2 },
  { p: 1.0, pos: [19.5, 1.15, 4.7], mira: [19.3, 0.45, 0], an: 3.2 },
];

const CANALES: Partial<Record<Canal, Punto[]>> = {
  puente: [[0, 1], [0.14, 1], [0.19, 0]],
  cuchara: [[0, 0], [0.14, 0], [0.17, 1], [0.26, 1], [0.29, 0]],
  caida: [[0, 0], [0.17, 0], [0.265, 1, "linear"]],
  llenado: [[0, 0], [0.17, 0], [0.265, 1, "linear"]],
  traslado: [[0, 0], [0.275, 0], [0.345, 1, "linear"]],
  tolva: [[0, 0], [0.29, 0], [0.35, 1]],
  molde: [[0, 0], [0.35, 0], [0.38, 1], [0.405, 1], [0.44, 0]],
  compresion: [[0, 0], [0.35, 0], [0.38, 1], [0.425, 1], [0.485, 0]],
  salida: [[0, 0], [0.425, 0], [0.485, 1]],
  fan: [[0, 0], [0.46, 0], [0.55, 1, "linear"]],
  traslado2: [[0, 0], [0.495, 0], [0.56, 1]],
  sierra: [[0, 0], [0.58, 0], [0.625, 1, "linear"]],
  taladro: [[0, 0], [0.625, 0], [0.675, 1, "linear"]],
  lija: [[0, 0], [0.67, 0], [0.715, 1, "linear"]],
  ensamble: [[0, 0], [0.73, 0], [0.79, 1]],
  tornillos: [[0, 0], [0.77, 0], [0.8, 1, "linear"]],
  carga: [[0, 0], [0.805, 0], [0.835, 1], [0.87, 1], [0.885, 0]],
  lateral: [[0, 0], [0.9, 0], [0.94, 1], [0.96, 1], [0.995, 0]],
  revDim: [[0, 0], [0.885, 0], [0.915, 1], [0.955, 1], [0.975, 0]],
  revAli: [[0, 0], [0.905, 0], [0.935, 1], [0.955, 1], [0.975, 0]],
  revAca: [[0, 0], [0.925, 0], [0.95, 1, "linear"], [0.96, 1], [0.98, 0]],
  empaque: [[0, 0], [0.935, 0], [0.97, 1], [0.98, 1], [0.995, 0]],
  caja: [[0, 0], [0.935, 0], [0.97, 1], [0.98, 1], [0.995, 0]],
};

export interface LineaProceso {
  buscar(progreso: number): void;
  detener(): void;
}

/**
 * Timeline pausada, gobernada solo por seek(progreso * DURACION). Cada canal
 * cubre 0..DURACION con tramos [from, to] explicitos: misma pose para el mismo
 * progreso, suba o baje el scroll, sin animate() independientes.
 */
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
    ["ancho", (k) => k.an ?? 0],
    ["elev", (k) => k.ev ?? 0],
    ["zoom", (k) => k.zm ?? 1],
    ["pdx", (k) => k.dx ?? 0],
  ];
  for (const [eje, f] of ejes) encadenar(eje, CAMARA.map((k) => [k.p, f(k)] as Punto));

  let ultimoP = -1;
  tl.seek(0);
  return {
    buscar(progreso) {
      const p = Math.min(1, Math.max(0, progreso));
      if (
        ultimoP >= 0 &&
        (Math.abs(p - ultimoP) < 1e-6 || (p <= 0.14 && ultimoP <= 0.14 && (p >= 0.025) === (ultimoP >= 0.025)))
      ) {
        return;
      }
      ultimoP = p;
      ep.progreso = p;
      tl.seek(p * DURACION);
      ep.invalidar?.();
    },
    detener() {
      tl.pause();
    },
  };
}
