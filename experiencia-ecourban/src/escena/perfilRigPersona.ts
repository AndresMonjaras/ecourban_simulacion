import type { Vec3 } from "./animacionPersona";

/**
 * Contrato adaptable por modelo GLB.
 *
 * Para adaptar un segundo GLB humano sin tocar la animacion ni la timeline:
 * 1. Crear una nueva constante `PerfilRigPersona` con `urlModelo`, `rotacionBase`
 *    (si el GLB no exporta Y-up mirando a +Z), `escalaAltura` y `alturaCaderaReposo`.
 * 2. Mapear `huesos` a los nombres exactos de los huesos de ese esqueleto.
 * 3. Ajustar `offsetY` si la suela del calzado del nuevo GLB tiene un origen distinto.
 */
export interface MapaHuesosCanonicos {
  cadera: string;
  columna: string;
  columnaMedia?: string;
  pecho: string;
  cuello: string;
  cabeza: string;
  hombroIzq: string;
  brazoIzq: string;
  antebrazoIzq: string;
  manoIzq: string;
  hombroDer: string;
  brazoDer: string;
  antebrazoDer: string;
  manoDer: string;
  musloIzq: string;
  pantorrillaIzq: string;
  pieIzq: string;
  musloDer: string;
  pantorrillaDer: string;
  pieDer: string;
}

export interface PerfilRigPersona {
  /** Identificador unico del perfil para diagnostico y cache. */
  id: string;
  /** Ruta publica del GLB skinned. */
  urlModelo: string;
  /** Rotacion Euler XYZ (rad) para alinear el modelo en reposo a Y-up mirando hacia +Z. */
  rotacionBase: Vec3;
  /** Factor de escala uniforme para normalizar la estatura del modelo (~1.75 m). */
  escalaAltura: number;
  /** Altura de la articulacion raiz (`cadera`) en el modelo sin escalar en reposo (m). */
  alturaCaderaReposo: number;
  /** Desfase vertical fino (m) tras aplicar la pose para apoyo limpio en piso/asiento. */
  offsetY: number;
  /** Longitud aproximada del segmento superior de torso (para rigs con 3 huesos espinales). */
  longitudTorsoSuperior: number;
  /** Mapa desde articulaciones canonicas hacia nombres de huesos del GLB concreto. */
  huesos: MapaHuesosCanonicos;
}

/**
 * Perfil del avatar `persona-articulada.glb` (70 nodos, 1 skin, 2 mallas, Y-up nativo mirando +Z).
 * Calibrado a escala 0.94 (~1.75 m) para encajar en proporcion con la banca de 1.50 m x 0.45 m.
 */
export const PERFIL_ACTION_SUIT: PerfilRigPersona = {
  id: "action-suit-human",
  urlModelo: `${import.meta.env.BASE_URL}models/persona-articulada.glb`,
  rotacionBase: [0, 0, 0],
  escalaAltura: 0.94,
  alturaCaderaReposo: 1.0192,
  offsetY: 0,
  longitudTorsoSuperior: 0.13,
  huesos: {
    cadera: "Hips",
    columna: "Spine",
    columnaMedia: "Spine1",
    pecho: "Spine2",
    cuello: "Neck",
    cabeza: "Head",
    hombroIzq: "LeftShoulder",
    brazoIzq: "LeftArm",
    antebrazoIzq: "LeftForeArm",
    manoIzq: "LeftHand",
    hombroDer: "RightShoulder",
    brazoDer: "RightArm",
    antebrazoDer: "RightForeArm",
    manoDer: "RightHand",
    musloIzq: "LeftUpLeg",
    pantorrillaIzq: "LeftLeg",
    pieIzq: "LeftFoot",
    musloDer: "RightUpLeg",
    pantorrillaDer: "RightLeg",
    pieDer: "RightFoot",
  },
};
