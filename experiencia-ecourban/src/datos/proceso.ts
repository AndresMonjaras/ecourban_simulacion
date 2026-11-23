export type HitoId =
  | "puente"
  | "recepcion"
  | "secado"
  | "dosificacion"
  | "extrusion"
  | "peletizado"
  | "moldes"
  | "compresion"
  | "enfriamiento"
  | "ensamble"
  | "inspeccion";

export interface Hito {
  id: HitoId;
  num: string;
  etiqueta: string;
  linea: string;
  estatus: string;
  fuente: string;
  icono: "pellets" | "secado" | "dosificacion" | "extrusion" | "peletizado" | "moldes" | "compresion" | "enfriamiento" | "ensamble" | "inspeccion";
  tramo: [number, number];
}

export const MARCA_PROCESO = "Proceso técnico EcoUrban";

export const HITOS: readonly Hito[] = [
  {
    id: "puente", num: "", etiqueta: "De la banca al proceso", linea: "Del producto terminado a la transformación del material.",
    estatus: "Secuencia de fabricación", fuente: "ECOURBAN — Guía técnica y visual del proceso de fabricación de la banca",
    icono: "pellets", tramo: [0, 0.08],
  },
  {
    id: "recepcion", num: "01/10", etiqueta: "Recepción de pellets rPET", linea: "Pellets reciclados recibidos de proveedores especializados y preparados para el proceso.",
    estatus: "Materia prima: PET reciclado", fuente: "Guía técnica EcoUrban · Recepción de pellets", icono: "pellets", tramo: [0.08, 0.17],
  },
  {
    id: "secado", num: "02/10", etiqueta: "Secado del material", linea: "El material pasa por una secadora deshumidificadora y una secadora de tolva.",
    estatus: "Deshumidificación y alimentación", fuente: "Guía técnica EcoUrban · Secado", icono: "secado", tramo: [0.17, 0.26],
  },
  {
    id: "dosificacion", num: "03/10", etiqueta: "Dosificación de componentes", linea: "El PET reciclado y el compatibilizante polimérico se dosifican y se combinan.",
    estatus: "Mezcla preparada para extrusión", fuente: "Guía técnica EcoUrban · Dosificación", icono: "dosificacion", tramo: [0.26, 0.35],
  },
  {
    id: "extrusion", num: "04/10", etiqueta: "Extrusión de doble husillo", linea: "El material se funde, mezcla y homogeniza mediante calor y transporte de doble husillo.",
    estatus: "Compuesto fundido y homogenizado", fuente: "Guía técnica EcoUrban · Extrusión", icono: "extrusion", tramo: [0.35, 0.44],
  },
  {
    id: "peletizado", num: "05/10", etiqueta: "Peletización del compuesto", linea: "El compuesto extruido se corta en pellets para alimentar la siguiente etapa.",
    estatus: "Pellets del compuesto preparado", fuente: "Guía técnica EcoUrban · Peletización", icono: "peletizado", tramo: [0.44, 0.53],
  },
  {
    id: "moldes", num: "06/10", etiqueta: "Alimentación de moldes", linea: "El compuesto se dirige a moldes de acero separados para asiento, respaldo y soportes.",
    estatus: "Moldes de acero", fuente: "Guía técnica EcoUrban · Alimentación de moldes", icono: "moldes", tramo: [0.53, 0.62],
  },
  {
    id: "compresion", num: "07/10", etiqueta: "Moldeo por compresión", linea: "Una prensa hidráulica aplica calor y presión al compuesto dentro del molde.",
    estatus: "Prensa hidráulica de compresión", fuente: "Guía técnica EcoUrban · Moldeo por compresión", icono: "compresion", tramo: [0.62, 0.71],
  },
  {
    id: "enfriamiento", num: "08/10", etiqueta: "Enfriamiento y desmoldeo", linea: "Las piezas moldeadas se enfrían y se extraen del molde.",
    estatus: "Componentes separados", fuente: "Guía técnica EcoUrban · Enfriamiento y desmoldeo", icono: "enfriamiento", tramo: [0.71, 0.80],
  },
  {
    id: "ensamble", num: "09/10", etiqueta: "Acabado y ensamblaje", linea: "Los componentes reciben acabado general y se unen con tornillería inoxidable A2 y A4.",
    estatus: "Asiento, respaldo y soportes", fuente: "Guía técnica EcoUrban · Acabado y ensamblaje", icono: "ensamble", tramo: [0.80, 0.89],
  },
  {
    id: "inspeccion", num: "10/10", etiqueta: "Inspección y preparación", linea: "La banca se revisa visualmente, se limpia y se prepara para empaque e instalación.",
    estatus: "Producto preparado para entrega", fuente: "Guía técnica EcoUrban · Inspección, limpieza y preparación", icono: "inspeccion", tramo: [0.89, 1],
  },
];

export const HITOS_NUMERADOS = HITOS.filter((h) => h.num !== "");

/** Índice discreto del capítulo activo; el puente corresponde al producto terminado. */
export function hitoParaProgreso(p: number): number {
  for (let i = HITOS.length - 1; i >= 0; i--) if (p >= HITOS[i].tramo[0]) return i;
  return 0;
}
