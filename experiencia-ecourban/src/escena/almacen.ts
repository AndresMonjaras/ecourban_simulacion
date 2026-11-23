import type { Object3D } from "three";
import type { GrupoId } from "../datos/contenido";

export interface EstadoVista {
  giro: number;
  mirada: number;
  zoom: number;
  gx: number;
  gz: number;
  alto: number;
  orb: number;
  fov: number;
  tx: number;
  tz: number;
  ox: number;
  oy: number;
}

/**
 * Estado mutable compartido entre la linea de tiempo (Anime.js) y la escena
 * (R3F). Se escribe fuera de React: ningun cambio aqui provoca re-render.
 */
export const almacen = {
  partes: new Map<string, Object3D>(),
  anclas: new Map<string, Object3D>(),
  /** Pose de camara y banca determinada exclusivamente por el progreso 0..1 del scroll. */
  vista: {
    giro: -0.42,
    mirada: 0.44,
    zoom: 1,
    gx: 0,
    gz: 0,
    alto: 0.06,
    orb: 0,
    fov: 34,
    tx: 0,
    tz: 0,
    ox: 0,
    oy: 0,
  } as EstadoVista,
  /** Peso de enfasis visual (0..1) por capitulo, gobernado por la timeline de scroll. */
  enfasis: {
    respaldo: 0,
    asiento: 0,
    soportes: 0,
  } as Record<GrupoId, number>,
  /** Factor (0..1) de sombra de contacto bajo la banca segun el grado de ensamblaje. */
  sombraContacto: 1,
  /** Desactiva las sombras de malla mientras la camara hace la orbita inicial pesada. */
  sombraModelo: true,
  /** Estado determinista del personaje en el cierre (sin nombres de huesos ni GLB). */
  persona: {
    visible: false,
    progreso: 0,
  },
  /** Capitulo activo actual derivado del umbral de scroll. */
  capitulo: null as GrupoId | null,
  distancia: 3.6,
  alMontar: null as null | (() => void),
  invalidar: null as null | (() => void),
};

if (typeof window !== "undefined") {
  (window as unknown as { __ALMACEN__: typeof almacen }).__ALMACEN__ = almacen;
}
