export type GrupoId = "respaldo" | "asiento" | "soportes";

export interface Ficha {
  id: GrupoId;
  titulo: string;
  etiqueta: string;
  funcion: string;
  material: string;
  proceso: string;
  detalle: string;
  /** Nombres estables de las partes 3D que resalta la ficha. */
  partes: string[];
}

const MATERIAL =
  "PET reciclado reportado para el producto; sin asignar a esta pieza";

export const FICHAS: Ficha[] = [
  {
    id: "respaldo",
    titulo: "Listón de respaldo",
    etiqueta: "Respaldo",
    funcion: "apoyo",
    material: MATERIAL,
    proceso: "maquila propuesta",
    detalle:
      "Modelo conceptual compuesto con tres listones de respaldo y tornillería asociada. Es un modelo de referencia conceptual compuesto, no un CAD o fabricación verificada; medidas y tolerancias siguen pendientes de plano y BOM.",
    partes: ["respaldo-liston-1", "respaldo-liston-2", "respaldo-liston-3"],
  },
  {
    id: "asiento",
    titulo: "Tablones de asiento",
    etiqueta: "Asiento",
    funcion: "asiento",
    material: MATERIAL,
    proceso: "maquila propuesta",
    detalle:
      "Modelo conceptual compuesto con cuatro listones de asiento (modelo de referencia con cuatro listones; número final, separación y sección pendientes de plano y BOM, no es un CAD de fabricación verificada).",
    partes: ["asiento-tablon-1", "asiento-tablon-2", "asiento-tablon-3", "asiento-tablon-4"],
  },
  {
    id: "soportes",
    titulo: "Soportes laterales",
    etiqueta: "Soportes",
    funcion: "estructura",
    material: MATERIAL,
    proceso: "maquila propuesta",
    detalle:
      "Dos soportes laterales verdes con apoyos y herrajes correspondientes en modelo conceptual compuesto. Es una referencia visual/conceptual, no un diseño CAD o resistente estructuralmente verificado.",
    partes: ["soporte-lateral-izq", "soporte-lateral-der"],
  },
];

export const PASOS = [
  { id: "pellets", etiqueta: "Pellets rPET recibidos" },
  { id: "maquila", etiqueta: "Maquila externa propuesta" },
  { id: "corte", etiqueta: "Corte y acabado" },
  { id: "ensamble", etiqueta: "Ensamble" },
  { id: "entrega", etiqueta: "Inspección y despacho propuestos" },
] as const;
