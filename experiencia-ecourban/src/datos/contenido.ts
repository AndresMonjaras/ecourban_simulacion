export type GrupoId = "respaldo" | "asiento" | "soportes";

export interface Ficha {
  id: GrupoId;
  titulo: string;
  etiqueta: string;
  funcion: string;
  material: string;
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
    detalle:
      "El modelo muestra tres listones grafito separados y sus fijaciones visibles, formando el plano de apoyo de la espalda.",
    partes: ["respaldo-liston-1", "respaldo-liston-2", "respaldo-liston-3"],
  },
  {
    id: "asiento",
    titulo: "Tablones de asiento",
    etiqueta: "Asiento",
    funcion: "asiento",
    material: MATERIAL,
    detalle:
      "El modelo muestra cuatro tablones grafito paralelos, distribuidos a lo ancho entre los soportes y con fijaciones visibles.",
    partes: ["asiento-tablon-1", "asiento-tablon-2", "asiento-tablon-3", "asiento-tablon-4"],
  },
  {
    id: "soportes",
    titulo: "Soportes laterales",
    etiqueta: "Soportes",
    funcion: "estructura",
    material: MATERIAL,
    detalle:
      "Dos soportes laterales verdes reciben los listones del asiento y del respaldo; el modelo incluye apoyos inferiores y herrajes visibles.",
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
