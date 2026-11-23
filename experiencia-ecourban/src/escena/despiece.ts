import { createTimeline } from "animejs";
import type { GrupoId } from "../datos/contenido";
import { almacen, type EstadoVista } from "./almacen";
import { aplicarEnfasisCapitulo, tomaBase, tomaCapitulo, tomaCapituloDrift, tomaOrbitaCapitulo } from "./enfoque";

/** Pose (traslacion + micro-rotacion en radianes) de cada parte al estar despiezada. */
interface Pose {
  p: [number, number, number];
  rx?: number;
  rz?: number;
}

/** Orden de aparicion: listones del respaldo (de arriba a abajo), tablones de asiento, soportes laterales. */
const base: Record<string, Pose> = {
  "respaldo-liston-1": { p: [0, 0.44, -0.14], rx: -0.05 },
  "respaldo-liston-2": { p: [0, 0.29, -0.09], rx: -0.03 },
  "respaldo-liston-3": { p: [0, 0.15, -0.04], rx: -0.01 },
  "asiento-tablon-1": { p: [0, 0.21, -0.16] },
  "asiento-tablon-2": { p: [0, 0.15, -0.05] },
  "asiento-tablon-3": { p: [0, 0.09, 0.06] },
  "asiento-tablon-4": { p: [0, 0.03, 0.17] },
  "soporte-lateral-izq": { p: [-0.3, -0.03, 0], rz: 0.035 },
  "soporte-lateral-der": { p: [0.3, -0.03, 0], rz: -0.035 },
};

/** En pantallas estrechas los soportes se separan menos para mantener la banca dentro de 390x844. */
export function despiece(lite: boolean): Record<string, Pose> {
  const dx = lite ? 0.14 : 0.3;
  return {
    ...base,
    "soporte-lateral-izq": { p: [-dx, -0.02, 0], rz: 0.03 },
    "soporte-lateral-der": { p: [dx, -0.02, 0], rz: -0.03 },
  };
}

const DURACION = 3600;
const FIN_INTRO = 660; // 0.1833 de progreso: fin de orbita inicial y toma base 0
const FIN_RESPALDO = 1440; // 0.40 de progreso: fin de retorno a toma base 1 tras respaldo
const FIN_ASIENTO = 2220; // 0.6167 de progreso: fin de retorno a toma base 2 tras asiento
const FIN_SOPORTES = 2960; // 0.8222 de progreso: fin de retorno y reensamble de soportes hacia toma base
const FIN_PERSONA = 3384; // 0.9400: ~163vh para caminar, girar y sentarse antes del empate final
const VUELTA = Math.PI * 2;

/**
 * Ventanas [salida, finSalida, inicioRetorno, finRetorno] dentro de DURACION.
 * Cada pieza se separa para el enfoque y vuelve a su transformacion ensamblada
 * antes de que empiece el siguiente capitulo.
 */
type VentanaPieza = [salida: number, finSalida: number, inicioRetorno: number, finRetorno: number];
const VENTANA_PIEZA: Record<string, VentanaPieza> = {
  // Respaldo: se extraen en secuencia y se ensamblan en orden inverso durante el retorno (ajuste Bloque 1).
  "respaldo-liston-1": [670, 870, 1290, 1410],
  "respaldo-liston-2": [690, 900, 1260, 1380],
  "respaldo-liston-3": [730, 930, 1230, 1350],
  // Asiento: sale tablón por tablón y se ensambla del último al primero.
  "asiento-tablon-1": [1450, 1630, 2090, 2210],
  "asiento-tablon-2": [1480, 1660, 2060, 2180],
  "asiento-tablon-3": [1510, 1690, 2030, 2150],
  "asiento-tablon-4": [1550, 1710, 2000, 2120],
  // Soportes: regresan de forma escalonada al cerrar la toma final.
  "soporte-lateral-izq": [2240, 2490, 2820, 2960],
  "soporte-lateral-der": [2240, 2490, 2790, 2930],
};

export interface LineaDespiece {
  /** progreso 0..1 del scroll de la seccion */
  buscar(progreso: number): void;
  detener(): void;
}

type PuntoTramo = [t: number, valor: number, ease?: string];

/**
 * Timeline Anime.js v4 pausada y gobernada exclusivamente por seek(progreso * DURACION).
 * Cada propiedad cubre de forma contigua 0..DURACION con [from, to] explicitos,
 * garantizando reversibilidad exacta al subir el scroll sin saltos ni estados residuales.
 */
export function crearLineaDespiece(escenario: HTMLElement | null, lite: boolean): LineaDespiece {
  const estado: Record<string, { x: number; y: number; z: number; rx: number; rz: number }> = {};
  const DESPIECE = despiece(lite);
  for (const id of Object.keys(DESPIECE)) {
    estado[id] = { x: 0, y: 0, z: 0, rx: 0, rz: 0 };
  }

  const baseGeneral = tomaBase(lite);

  const orbRespaldo = tomaOrbitaCapitulo("respaldo", lite);
  const orbAsiento = tomaOrbitaCapitulo("asiento", lite);
  const orbSoportes = tomaOrbitaCapitulo("soportes", lite);

  const focoRespaldo = tomaCapitulo("respaldo", lite);
  const focoRespaldoDrift = tomaCapituloDrift("respaldo", lite);
  const focoAsiento = tomaCapitulo("asiento", lite);
  const focoAsientoDrift = tomaCapituloDrift("asiento", lite);
  const focoSoportes = tomaCapitulo("soportes", lite);
  const focoSoportesDrift = tomaCapituloDrift("soportes", lite);

  const giroInicial = baseGeneral.giro;
  const vista: EstadoVista = { ...baseGeneral, orb: 0 };
  const enfasis: Record<GrupoId, number> = { respaldo: 0, asiento: 0, soportes: 0 };
  const ui = { intro: 0, sombra: 1 };
  const persona = { progreso: 0, visible: 0 };

  const tomaCierrePersona: EstadoVista = {
    ...baseGeneral,
    zoom: lite ? 1.02 : 1.32,
    mirada: lite ? 0.48 : 0.72,
    alto: lite ? 0.08 : 0.16,
  };

  const tl = createTimeline({ autoplay: false, defaults: { ease: "inOutSine" } });

  const encadenar = <T extends object>(objetivo: T, prop: keyof T & string, puntos: PuntoTramo[]) => {
    for (let i = 1; i < puntos.length; i++) {
      const [t0, a] = puntos[i - 1];
      const [t1, b, ease = "inOutSine"] = puntos[i];
      if (t1 <= t0) continue;
      tl.add(objetivo, { [prop]: [a, b], duration: t1 - t0, ease }, t0);
    }
  };

  // Coreografia de camara a lo largo de 0..DURACION (3600):
  // - 0..660: intro con orbita y asentamiento en toma base.
  // - 660..1440 (Respaldo): viaje/foco, hold, retorno de camara y reensamble escalonado.
  // - 1440..2220 (Asiento): viaje/foco, hold, retorno de camara y reensamble escalonado.
  // - 2220..2960 (Soportes): viaje/foco, hold, retorno de camara y reensamble escalonado.
  // - 2960..3600 (Cierre): banca completamente armada en toma base exacta, luz neutra y sombra 1.
  const cuadrosCamara: { t: number; v: EstadoVista; ease?: string }[] = [
    {
      t: 0,
      v: {
        ...baseGeneral,
        orb: 0,
      },
    },
    {
      t: 140,
      v: {
        giro: giroInicial,
        orb: (VUELTA * 140) / 600,
        zoom: lite ? 0.88 : 0.85,
        alto: 0.14,
        fov: 34,
        mirada: 0.46,
        tx: 0.03,
        tz: 0.04,
        ox: 0,
        oy: 0,
        gx: 0,
        gz: 0,
      },
    },
    {
      t: 290,
      v: {
        giro: giroInicial,
        orb: (VUELTA * 290) / 600,
        zoom: lite ? 0.92 : 0.9,
        alto: -0.03,
        fov: 34,
        mirada: 0.43,
        tx: 0,
        tz: 0,
        ox: 0,
        oy: 0,
        gx: 0,
        gz: 0,
      },
    },
    {
      t: 450,
      v: {
        giro: giroInicial,
        orb: (VUELTA * 450) / 600,
        zoom: lite ? 0.91 : 0.88,
        alto: 0.28,
        fov: 34,
        mirada: 0.47,
        tx: -0.02,
        tz: -0.02,
        ox: 0,
        oy: 0,
        gx: 0,
        gz: 0,
      },
    },
    {
      t: 600,
      v: baseGeneral,
      ease: "outCubic",
    },
    {
      t: FIN_INTRO,
      v: baseGeneral,
      ease: "linear",
    },
    // Capitulo 1: Respaldo — salida orbital desde base, llegada a foco, hold con micro-deriva y retorno a la misma toma base
    { t: 760, v: orbRespaldo, ease: "inOutSine" },
    { t: 930, v: focoRespaldo, ease: "outCubic" },
    { t: 1210, v: focoRespaldoDrift, ease: "linear" },
    { t: 1360, v: baseGeneral, ease: "inOutCubic" },
    { t: FIN_RESPALDO, v: baseGeneral, ease: "linear" },
    // Capitulo 2: Asiento — giro cinematografico hacia tablones, llegada a foco, hold con micro-deriva y retorno a la misma toma base
    { t: 1540, v: orbAsiento, ease: "inOutSine" },
    { t: 1710, v: focoAsiento, ease: "outCubic" },
    { t: 1990, v: focoAsientoDrift, ease: "linear" },
    { t: 2140, v: baseGeneral, ease: "inOutCubic" },
    { t: FIN_ASIENTO, v: baseGeneral, ease: "linear" },
    // Capitulo 3: Soportes — giro cinematografico hacia soportes, llegada a foco, hold con micro-deriva y retorno a la misma toma base
    { t: 2320, v: orbSoportes, ease: "inOutSine" },
    { t: 2490, v: focoSoportes, ease: "outCubic" },
    { t: 2770, v: focoSoportesDrift, ease: "linear" },
    { t: 2920, v: baseGeneral, ease: "inOutCubic" },
    { t: FIN_SOPORTES, v: baseGeneral, ease: "linear" },
    // Cierre: ligero aire superior durante la caminata y giro en escritorio, con retorno exacto a tomaBase al sentarse
    { t: 3020, v: tomaCierrePersona, ease: "inOutSine" },
    { t: 3276, v: tomaCierrePersona, ease: "linear" },
    { t: FIN_PERSONA, v: baseGeneral, ease: "inOutCubic" },
    { t: DURACION, v: baseGeneral, ease: "linear" },
  ];

  const clavesVista: (keyof EstadoVista)[] = [
    "giro",
    "orb",
    "zoom",
    "alto",
    "fov",
    "mirada",
    "tx",
    "tz",
    "ox",
    "oy",
    "gx",
    "gz",
  ];
  for (const k of clavesVista) {
    encadenar(
      vista,
      k,
      cuadrosCamara.map((c) => [c.t, c.v[k], k === "orb" && c.t <= 600 ? "linear" : c.ease]),
    );
  }

  // Despiece y reensamble progresivos por capitulo (cadena completa y reversible 0..DURACION).
  for (const [id, { p: [x, y, z], rx = 0, rz = 0 }] of Object.entries(DESPIECE)) {
    const [t0, t1, retorno0, retorno1] = VENTANA_PIEZA[id];
    const ejes: [keyof (typeof estado)[string], number][] = [
      ["x", x],
      ["y", y],
      ["z", z],
      ["rx", rx],
      ["rz", rz],
    ];
    for (const [eje, meta] of ejes) {
      encadenar(estado[id], eje, [
        [0, 0, "linear"],
        [t0, 0, "linear"],
        [t1, meta, "outCubic"],
        [retorno0, meta, "linear"],
        [retorno1, 0, "inOutCubic"],
        [DURACION, 0, "linear"],
      ]);
    }
  }

  // Enfasis visual determinista sincronizado con el foco de cada capitulo y neutro en las tomas base
  encadenar(enfasis, "respaldo", [
    [0, 0, "linear"],
    [730, 0, "linear"],
    [910, 1, "outCubic"],
    [1210, 1, "linear"],
    [1350, 0, "inOutQuad"],
    [DURACION, 0, "linear"],
  ]);
  encadenar(enfasis, "asiento", [
    [0, 0, "linear"],
    [1510, 0, "linear"],
    [1690, 1, "outCubic"],
    [1990, 1, "linear"],
    [2130, 0, "inOutQuad"],
    [DURACION, 0, "linear"],
  ]);
  encadenar(enfasis, "soportes", [
    [0, 0, "linear"],
    [2290, 0, "linear"],
    [2470, 1, "outCubic"],
    [2770, 1, "linear"],
    [2910, 0, "inOutQuad"],
    [DURACION, 0, "linear"],
  ]);

  // Un pulso corto del holograma acompaña el momento en que la cámara termina de
  // enfocar el conjunto descrito por cada ficha; seek lo reproduce también en reversa.
  encadenar(almacen.destello, "respaldo", [
    [0, 0, "linear"], [880, 0, "linear"], [920, 1, "outCubic"], [1000, 0, "inOutSine"], [DURACION, 0, "linear"],
  ]);
  encadenar(almacen.destello, "asiento", [
    [0, 0, "linear"], [1670, 0, "linear"], [1710, 1, "outCubic"], [1790, 0, "inOutSine"], [DURACION, 0, "linear"],
  ]);
  encadenar(almacen.destello, "soportes", [
    [0, 0, "linear"], [2450, 0, "linear"], [2490, 1, "outCubic"], [2570, 0, "inOutSine"], [DURACION, 0, "linear"],
  ]);

  // Indicadores de UI y sombra de contacto; la sombra vuelve a su intensidad al ensamblar.
  encadenar(ui, "intro", [
    [0, 0, "linear"],
    [180, 1, "outQuad"],
    [DURACION, 1, "linear"],
  ]);
  encadenar(ui, "sombra", [
    [0, 1, "linear"],
    [FIN_INTRO, 1, "linear"],
    [930, 0.82, "inOutSine"],
    [1210, 0.82, "linear"],
    [FIN_RESPALDO, 1, "inOutSine"],
    [1710, 0.72, "inOutSine"],
    [1990, 0.72, "linear"],
    [FIN_ASIENTO, 0.94, "inOutSine"],
    [2490, 0.58, "inOutSine"],
    [2770, 0.58, "linear"],
    [FIN_SOPORTES, 1, "inOutSine"],
    [DURACION, 1, "linear"],
  ]);

  // Progreso determinista de aproximacion, giro y sentado tras ensamblar la banca.
  encadenar(persona, "progreso", [
    [0, 0, "linear"],
    [FIN_SOPORTES, 0, "linear"],
    [FIN_PERSONA, 1, "linear"],
    [DURACION, 1, "linear"],
  ]);
  encadenar(persona, "visible", [
    [0, 0, "linear"],
    [FIN_SOPORTES - 1, 0, "linear"],
    [FIN_SOPORTES, 1, "linear"],
    [DURACION, 1, "linear"],
  ]);

  const aplicar = () => {
    almacen.progreso = Math.max(0, Math.min(1, ultimoT / DURACION));
    for (const [id, e] of Object.entries(estado)) {
      const o = almacen.partes.get(id);
      o?.position.set(e.x, e.y, e.z);
      o?.rotation.set(e.rx, 0, e.rz);
    }
    Object.assign(almacen.vista, vista);
    almacen.enfasis.respaldo = enfasis.respaldo;
    almacen.enfasis.asiento = enfasis.asiento;
    almacen.enfasis.soportes = enfasis.soportes;
    almacen.sombraContacto = ui.sombra;
    // La orbita inicial recorre muchas mallas por frame; el piso conserva la
    // sombra de contacto mientras se omite el costoso pase de sombras del GLB.
    almacen.sombraModelo = ultimoT >= 600;
    almacen.persona.visible = persona.visible >= 0.5;
    almacen.persona.progreso = persona.progreso;
    if (escenario) {
      escenario.style.setProperty("--intro", ui.intro.toFixed(3));
    }
    almacen.invalidar?.();
  };

  let ultimoT = -1;

  return {
    buscar(p) {
      const t = Math.min(1, Math.max(0, p)) * DURACION;
      if (ultimoT >= 0 && (Math.abs(t - ultimoT) < 1e-3 || (t >= FIN_PERSONA && ultimoT >= FIN_PERSONA))) {
        return;
      }
      ultimoT = t;
      tl.seek(t);
      aplicar();
    },
    detener() {
      tl.pause();
    },
  };
}

/** Pose estatica comprensible para movimiento reducido: banca quieta y encuadrada sin solapar la ficha. */
export function aplicarPoseEstatica(
  escenario: HTMLElement | null,
  lite: boolean,
  capitulo: GrupoId | null = almacen.capitulo,
  cierre = 0,
) {
  const armada = cierre > 0;
  almacen.progreso = armada ? 0.94 : capitulo === "respaldo" ? 0.29 : capitulo === "asiento" ? 0.50 : capitulo === "soportes" ? 0.71 : 0;
  for (const [id, { p: [x, y, z], rx = 0, rz = 0 }] of Object.entries(despiece(lite))) {
    const o = almacen.partes.get(id);
    if (armada) {
      o?.position.set(0, 0, 0);
      o?.rotation.set(0, 0, 0);
    } else {
      o?.position.set(x * 0.65, y * 0.65, z * 0.65);
      o?.rotation.set(rx * 0.5, 0, rz * 0.5);
    }
  }
  if (armada) {
    Object.assign(almacen.vista, tomaBase(lite));
    almacen.sombraContacto = 1;
    almacen.persona.visible = true;
    almacen.persona.progreso = 1;
  } else {
    almacen.persona.visible = false;
    almacen.persona.progreso = 0;
    almacen.vista.giro = lite ? -0.26 : -0.34;
    almacen.vista.orb = lite ? 0.24 : 0.3;
    almacen.vista.mirada = lite ? 0.54 : 0.56;
    almacen.vista.zoom = lite ? 1.02 : 1.04;
    almacen.vista.gx = 0;
    almacen.vista.gz = 0;
    almacen.vista.alto = lite ? 0.1 : 0.12;
    almacen.vista.fov = 34;
    almacen.vista.tx = 0;
    almacen.vista.tz = 0;
    almacen.vista.ox = lite ? 0 : 0.16;
    almacen.vista.oy = lite ? 0.175 : 0;
    almacen.sombraContacto = 0.72;
  }
  aplicarEnfasisCapitulo(armada ? null : capitulo, escenario);
}
