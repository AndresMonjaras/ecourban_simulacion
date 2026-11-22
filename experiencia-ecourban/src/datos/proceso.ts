/**
 * Contrato narrativo de la continuacion "Proceso propuesto".
 * Fuente: Propuesta del Proyecto EcoUrban Innovatec, modelo asset-light y
 * "Flujo de Produccion y Ensamble". Todo es un proceso descrito en una propuesta:
 * no hay evidencia de planta, proveedor, equipos, ensayos ni produccion en operacion.
 */

export type HitoId =
  | "puente"
  | "recepcion"
  | "maquila"
  | "enfriamiento"
  | "preparacion"
  | "ensamble"
  | "carga"
  | "salida"
  | "cierre";

export interface Hito {
  id: HitoId;
  /** Numero visible ("01/07"); vacio en puente y cierre. */
  num: string;
  /** Etiqueta corta visible sobre la escena. */
  etiqueta: string;
  /** Explicacion de una linea. */
  linea: string;
  /** Estatus documental visible sin abrir ninguna ficha. */
  estatus: string;
  /** Dato destacado en el HUD para hitos que necesitan una cifra legible. */
  medida?: { valor: string; etiqueta: string };
  /** Apartado de la propuesta que lo respalda. */
  fuente: string;
  /** Icono de IlustracionPaso para el fallback 2D. */
  icono: "pellets" | "maquila" | "corte" | "ensamble" | "entrega";
  /** Inicio y fin del tramo en progreso normalizado 0..1 de la seccion. */
  tramo: [number, number];
}

export const MARCA_PROCESO = "Proceso propuesto";

export const HITOS: readonly Hito[] = [
  {
    id: "puente",
    num: "",
    etiqueta: "Del material al mobiliario",
    linea: "Modelo conceptual compuesto de la banca en visualización de referencia y, antes de ella, el material que la haría posible.",
    estatus: "Recurso narrativo · visualización conceptual",
    fuente: "Descripción general del modelo asset-light",
    icono: "pellets",
    tramo: [0, 0.11],
  },
  {
    id: "recepcion",
    num: "01/06",
    etiqueta: "Pellets rPET recibidos",
    linea: "EcoUrban compraría pellets ya reciclados; el reciclaje primario queda aguas arriba.",
    estatus: "Inspección de entrada propuesta · sin resultados",
    fuente: "Flujo de Producción y Ensamble: recepción e inspección de pellets",
    icono: "pellets",
    tramo: [0.11, 0.26],
  },
  {
    id: "maquila",
    num: "02/06",
    etiqueta: "Moldeo por maquila externa propuesta",
    linea: "El moldeo por inyección o extrusión lo haría un taller externo, aún por definir.",
    estatus: "Proveedor y equipo por definir",
    fuente: "Modelo asset-light: moldeo mediante maquila",
    icono: "maquila",
    tramo: [0.26, 0.42],
  },
  {
    id: "enfriamiento",
    num: "03/06",
    etiqueta: "Enfriamiento · desmolde · recepción",
    linea: "Las piezas salen del molde, reposan y llegan a la mesa de recepción del taller.",
    estatus: "Pasos propuestos · piezas ilustrativas, no provienen del GLB · sin tiempos ni parámetros",
    fuente: "Flujo de Producción y Ensamble: enfriamiento, desmolde y recepción de perfiles",
    icono: "maquila",
    tramo: [0.42, 0.56],
  },
  {
    id: "preparacion",
    num: "04/06",
    etiqueta: "Corte · perforado · acabado",
    linea: "Un perfil se corta, se perfora con guía y recibe acabado de borde.",
    estatus: "Operaciones propuestas · perfil ilustrativo, no proviene del GLB · sin medidas de fabricación",
    fuente: "Flujo de Producción y Ensamble: corte, perforado guiado y maquinado de bordes",
    icono: "corte",
    tramo: [0.56, 0.7],
  },
  {
    id: "ensamble",
    num: "05/07",
    etiqueta: "Ensamble mecánico",
    linea: "La banca conceptual se revela armada de abajo a arriba; tornillos y piezas de manufactura son ilustrativos y no constituyen CAD verificado.",
    estatus: "Tornillería inoxidable propuesta · por validar con BOM",
    fuente: "Flujo de Producción y Ensamble: ensamble con tornillería inoxidable",
    icono: "ensamble",
    tramo: [0.7, 0.805],
  },
  {
    id: "carga",
    num: "06/07",
    etiqueta: "Prueba de capacidad",
    linea: "Tres cargas de referencia visual de 100 kg se colocan una a una sobre el asiento.",
    estatus: "Capacidad de carga verificada: 250–300 kg",
    medida: { valor: "250–300 kg", etiqueta: "CAPACIDAD VERIFICADA" },
    fuente: "Capacidad de carga verificada para presentación",
    icono: "ensamble",
    tramo: [0.805, 0.885],
  },
  {
    id: "salida",
    num: "07/07",
    etiqueta: "Inspección final · empaque · despacho",
    linea: "Se revisan dimensión, alineación y acabado; luego, protección y área de salida.",
    estatus: "Revisión, empaque y despacho propuestos",
    fuente: "Flujo de Producción y Ensamble: inspección, empaque y despacho",
    icono: "entrega",
    tramo: [0.885, 0.965],
  },
  {
    id: "cierre",
    num: "",
    etiqueta: "Flujo propuesto",
    linea: "Modelo conceptual de la banca armado. La capacidad de 250–300 kg está verificada; el flujo mostrado es una propuesta.",
    estatus: "Capacidad verificada · proceso conceptual",
    fuente: "Propuesta del Proyecto EcoUrban Innovatec",
    icono: "entrega",
    tramo: [0.965, 1],
  },
];

/** Los seis hitos numerados (sin puente ni cierre). */
export const HITOS_NUMERADOS = HITOS.filter((h) => h.num !== "");

export const AVISO_PROCESO =
  "Visualización conceptual con modelo de referencia compuesto: las piezas ilustrativas de manufactura son propuestas y ni geometría, uniones ni tornillería certifican planos ni BOM.";

/** Indice de hito para un progreso 0..1; discreto y determinista. */
export function hitoParaProgreso(p: number): number {
  for (let i = HITOS.length - 1; i >= 0; i--) {
    if (p >= HITOS[i].tramo[0]) return i;
  }
  return 0;
}
