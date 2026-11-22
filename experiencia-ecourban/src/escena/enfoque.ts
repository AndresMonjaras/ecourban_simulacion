import type { GrupoId } from "../datos/contenido";
import { almacen, type EstadoVista } from "./almacen";

export type VistaCamara = EstadoVista;

export interface UmbralCapitulo {
  id: GrupoId;
  /** Inicio normalizado (0..1) en el que aparece la ficha durante el viaje a foco. */
  inicio: number;
  /** Fin normalizado (0..1) en el que se oculta la ficha al retornar a la toma base. */
  fin: number;
}

/**
 * Intervalos deterministas de progreso 0..1 sincronizados con el foco de cada capitulo (DURACION 3600):
 * - [0.00, 0.1833): intro con banca ensamblada, orbita de 360 grados y llegada a toma base inicial.
 * - [0.1833, 0.40): capitulo 1 (respaldo) — entrada/viaje [0.1833..0.2583], hold de foco [0.2583..0.3361], retorno a base [0.3361..0.40].
 * - [0.40, 0.6167): capitulo 2 (asiento) — giro/viaje [0.40..0.475], hold de foco [0.475..0.5528], retorno a base [0.5528..0.6167].
 * - [0.6167, 0.8222): capitulo 3 (soportes) — giro/viaje [0.6167..0.6917], hold de foco [0.6917..0.7694], retorno a base [0.7694..0.8222].
 * - [0.8222, 1.00]: cierre — banca completamente ensamblada en toma base exacta, luz neutra y sombra 1.
 */
export const UMBRALES_CAPITULO: readonly UmbralCapitulo[] = [
  { id: "respaldo", inicio: 0.225, fin: 0.35 },
  { id: "asiento", inicio: 0.44, fin: 0.57 },
  { id: "soportes", inicio: 0.66, fin: 0.78 },
] as const;

/** Intervalos contiguos por capitulo para lectura estatica con prefers-reduced-motion o fallback 2D. */
export const UMBRALES_CAPITULO_REDUCIDO: readonly UmbralCapitulo[] = [
  { id: "respaldo", inicio: 0.1833, fin: 0.40 },
  { id: "asiento", inicio: 0.40, fin: 0.6167 },
  { id: "soportes", inicio: 0.6167, fin: 0.8222 },
] as const;

/** Determina el capitulo activo exclusivamente a partir del progreso 0..1 del scroll. */
export function capituloParaProgreso(progreso: number, reducido = false): GrupoId | null {
  const p = Math.min(1, Math.max(0, progreso));
  const lista = reducido ? UMBRALES_CAPITULO_REDUCIDO : UMBRALES_CAPITULO;
  for (const u of lista) {
    if (p >= u.inicio && p < u.fin) return u.id;
  }
  return null;
}

/**
 * Determina el capítulo visual activo para el indicador editorial.
 * Soportes (03/03) permanece activo durante el retorno y cierre (p >= 0.6167),
 * desvaneciéndose suavemente con --cierre sin mostrar un capitulo 04 ni quedar vacio.
 */
export function indicadorParaProgreso(progreso: number): string {
  const p = Math.min(1, Math.max(0, progreso));
  if (p < 0.1833) return "intro";
  if (p < 0.40) return "respaldo";
  if (p < 0.6167) return "asiento";
  return "soportes";
}

/**
 * Toma general/base exacta alcanzada al final de la intro y a la que retorna
 * la camara tras cada capitulo antes de iniciar el giro hacia el siguiente grupo.
 */
export function tomaBase(lite: boolean): EstadoVista {
  return {
    giro: lite ? -0.34 : -0.42,
    orb: Math.PI * 2,
    zoom: lite ? 0.94 : 0.96,
    alto: 0.06,
    fov: 34,
    mirada: 0.44,
    tx: 0,
    tz: 0,
    ox: 0,
    oy: 0,
    gx: 0,
    gz: 0,
  };
}

/**
 * Pose intermedia de giro/orbita cinematografica al salir de la toma base
 * rumbo al enfoque de cada pieza mientras el grupo comienza a separarse.
 */
export function tomaOrbitaCapitulo(id: GrupoId, lite: boolean): EstadoVista {
  const vuelta = Math.PI * 2;
  const ox = lite ? 0 : 0.09;
  const oy = lite ? 0.09 : 0;

  if (id === "respaldo") {
    return {
      giro: lite ? -0.3 : -0.36,
      orb: vuelta + (lite ? 0.16 : 0.22),
      zoom: lite ? 0.93 : 0.94,
      alto: lite ? 0.1 : 0.1,
      fov: 34,
      mirada: 0.54,
      tx: 0,
      tz: -0.04,
      ox,
      oy,
      gx: 0,
      gz: 0.02,
    };
  }

  if (id === "asiento") {
    return {
      giro: lite ? -0.22 : -0.26,
      orb: vuelta - (lite ? 0.24 : 0.34),
      zoom: lite ? 0.91 : 0.89,
      alto: lite ? 0.34 : 0.38,
      fov: 32.5,
      mirada: 0.55,
      tx: 0.02,
      tz: 0.04,
      ox,
      oy,
      gx: 0,
      gz: 0.02,
    };
  }

  return {
    giro: lite ? -0.28 : -0.35,
    orb: vuelta + (lite ? 0.26 : 0.36),
    zoom: lite ? 0.97 : 0.95,
    alto: lite ? -0.04 : -0.06,
    fov: 35.5,
    mirada: lite ? 0.46 : 0.44,
    tx: 0.02,
    tz: 0.02,
    ox,
    oy,
    gx: 0,
    gz: 0,
  };
}

/**
 * Toma determinista de foco para cada capitulo del despiece.
 * Combina giro, orbita, traslacion (tx/tz/gx/gz), altura (alto/mirada), FOV y zoom
 * con desplazamiento de encuadre (ox en escritorio, oy en movil) para despejar la ficha.
 */
export function tomaCapitulo(id: GrupoId, lite: boolean): EstadoVista {
  const vuelta = Math.PI * 2;
  const ox = lite ? 0 : 0.195;
  const oy = lite ? 0.175 : 0;

  if (id === "respaldo") {
    return {
      giro: lite ? -0.24 : -0.28,
      orb: vuelta + (lite ? 0.3 : 0.38),
      zoom: lite ? 0.94 : 0.96,
      alto: 0.06,
      fov: 32,
      mirada: lite ? 0.62 : 0.58,
      tx: 0,
      tz: -0.06,
      ox: lite ? 0 : 0.155,
      oy: lite ? 0.15 : 0.01,
      gx: 0,
      gz: 0.02,
    };
  }

  if (id === "asiento") {
    return {
      giro: lite ? -0.16 : -0.2,
      orb: vuelta - (lite ? 0.38 : 0.5),
      zoom: lite ? 0.84 : 0.84,
      alto: lite ? 0.52 : 0.6,
      fov: 31,
      mirada: lite ? 0.55 : 0.53,
      tx: lite ? -0.01 : -0.04,
      tz: 0.08,
      ox: lite ? 0 : 0.16,
      oy: lite ? 0.185 : 0,
      gx: lite ? 0 : 0.03,
      gz: 0.04,
    };
  }

  return {
    giro: lite ? -0.28 : -0.36,
    orb: vuelta + (lite ? 0.44 : 0.56),
    zoom: lite ? 0.96 : 0.93,
    alto: lite ? -0.12 : -0.16,
    fov: 36.5,
    mirada: lite ? 0.42 : 0.38,
    tx: lite ? 0.02 : 0.06,
    tz: 0.04,
    ox: lite ? 0 : 0.185,
    oy: lite ? 0.175 : 0.02,
    gx: lite ? 0 : -0.03,
    gz: 0,
  };
}

/**
 * Pose con micro-deriva sutil de órbita y zoom al final del hold de lectura,
 * evitando que la cámara quede como un fotograma estático durante el tiempo de atención.
 */
export function tomaCapituloDrift(id: GrupoId, lite: boolean): EstadoVista {
  const base = tomaCapitulo(id, lite);
  if (id === "respaldo") {
    return {
      ...base,
      orb: base.orb + (lite ? 0.02 : 0.025),
      zoom: base.zoom + (lite ? 0.01 : 0.012),
    };
  }
  if (id === "asiento") {
    return {
      ...base,
      orb: base.orb - (lite ? 0.02 : 0.025),
      zoom: base.zoom + (lite ? 0.01 : 0.012),
    };
  }
  if (id === "soportes") {
    return {
      ...base,
      orb: base.orb + (lite ? 0.02 : 0.025),
      zoom: base.zoom + (lite ? 0.008 : 0.01),
    };
  }
  return base;
}

/** Devuelve la vista actual gobernada directamente por el seek de la timeline. */
export function vistaEfectiva(): VistaCamara {
  return almacen.vista;
}

/** Actualiza el enfasis de grupo e indicadores en modo de movimiento reducido sin animar camara ni piezas. */
export function aplicarEnfasisCapitulo(id: GrupoId | null, escenario?: HTMLElement | null) {
  almacen.enfasis.respaldo = id === "respaldo" ? 1 : 0;
  almacen.enfasis.asiento = id === "asiento" ? 1 : 0;
  almacen.enfasis.soportes = id === "soportes" ? 1 : 0;
  if (escenario) {
    escenario.style.setProperty("--intro", id ? "1" : "0");
  }
  almacen.invalidar?.();
}
