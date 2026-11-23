import type { Vec3 } from "./animacionPersona";
import urlIntegranteV4 from "../../modelos/persona-piloto/integrante_v4_generado/persona-articulada-integrante-v4.glb?url";

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
 * Integrante EcoUrban v4 con el rig Mixamo compatible con la animacion canonica.
 * El GLB conserva los nombres y el orden de los 67 huesos; su cadera de reposo
 * propia se calibra a 0.9795 m para mantener apoyo en pie, marcha y sentado.
 */
export const PERFIL_ACTION_SUIT: PerfilRigPersona = {
  id: "integrante-ecourban-v4",
  urlModelo: urlIntegranteV4,
  rotacionBase: [0, 0, 0],
  escalaAltura: 0.94,
  alturaCaderaReposo: 0.9795,
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
