import type { PosturaPersona, SceneObject, Vector3 } from "../types/scene.ts";

export const POSTURA_PERSONA_DEFAULT: PosturaPersona = {
  hipFlexionDeg: 90,
  kneeFlexionDeg: 90,
  torsoLeanDeg: 5,
  shoulderFlexionDeg: 15,
  elbowFlexionDeg: 35,
};

export const POSTURA_PERSONA_PARADA_DEFAULT: PosturaPersona = {
  hipFlexionDeg: 0,
  kneeFlexionDeg: 0,
  torsoLeanDeg: 0,
  shoulderFlexionDeg: 8,
  elbowFlexionDeg: 10,
};

export type SegmentoHumano = { start: Vector3; end: Vector3; radius: number; color: string };
export type PoseHumana = {
  pelvis: { center: Vector3; size: Vector3 };
  torso: SegmentoHumano;
  cuello: SegmentoHumano;
  cabeza: { center: Vector3; size: Vector3 };
  muslos: SegmentoHumano[];
  pantorrillas: SegmentoHumano[];
  brazos: SegmentoHumano[];
  antebrazos: SegmentoHumano[];
  joints: { hips: Vector3[]; knees: Vector3[]; ankles: Vector3[]; shoulders: Vector3[]; elbows: Vector3[]; wrists: Vector3[] };
  manos: { center: Vector3; size: Vector3 }[];
  pies: { center: Vector3; size: Vector3 }[];
  angulos: { cadera: number; rodilla: number };
};

const radianes = (grados: number) => grados * Math.PI / 180;

export function normalizarPersonaSentadaAntigua(object: SceneObject): SceneObject {
  if (object.type !== "person" || object.transform.position[2] <= 0.3 || object.dimensionsMm[2] !== 950) return object;
  return { ...object, dimensionsMm: [object.dimensionsMm[0], object.dimensionsMm[1], 1750] };
}

export function sentarPersona(
  alturaAsientoM: number,
  profundidadAsientoM: number,
  dimensionesMm: Vector3,
  postura: PosturaPersona = POSTURA_PERSONA_DEFAULT,
): PoseHumana {
  return crearPosePersona(alturaAsientoM, profundidadAsientoM, dimensionesMm, postura, true);
}

export function pararPersona(
  dimensionesMm: Vector3,
  postura: PosturaPersona = POSTURA_PERSONA_PARADA_DEFAULT,
): PoseHumana {
  return crearPosePersona(0, 0.45, dimensionesMm, postura, false);
}

function crearPosePersona(
  alturaAsientoM: number,
  profundidadAsientoM: number,
  dimensionesMm: Vector3,
  postura: PosturaPersona,
  sentada: boolean,
): PoseHumana {
  const sx = dimensionesMm[0] / 450;
  const sy = dimensionesMm[1] / 350;
  const sz = dimensionesMm[2] / 1750;
  const escalar = (punto: Vector3): Vector3 => [punto[0] * sx, punto[1] * sy, punto[2] * sz];
  const radio = (valor: number) => valor * Math.min(sx, sy, sz);
  const segmento = (start: Vector3, end: Vector3, size: number, color: string): SegmentoHumano => ({
    start: escalar(start), end: escalar(end), radius: radio(size), color,
  });
  const cuerpoY = sentada ? -Math.min(0.04, profundidadAsientoM * 0.09) : 0;
  const torsoInicioZ = sentada ? 0.17 : 0.97;
  const alturaTorso = sentada ? 0.55 : 0.48;
  const torsoInicio: Vector3 = [0, cuerpoY + (sentada ? 0.04 : 0), torsoInicioZ];
  const inclinacion = radianes(postura.torsoLeanDeg);
  const torsoFin: Vector3 = [0, torsoInicio[1] + Math.sin(inclinacion) * alturaTorso, torsoInicio[2] + Math.cos(inclinacion) * alturaTorso];
  const longitudMuslo = (sentada ? Math.min(0.42, Math.max(0.25, profundidadAsientoM * 0.94)) : 0.43) * sz;
  const hip = radianes(postura.hipFlexionDeg);
  const knee = radianes(postura.kneeFlexionDeg);
  // Keep thigh volume above the seat; the renderer handles shoe/floor contact
  // using the actual skinned mesh, independently of these ideal joint targets.
  const alturaCadera = sentada ? 0.12 : 0.90;
  const kneeZ = alturaCadera - (longitudMuslo / sz) * Math.cos(hip);
  const ankleTargetZ = sentada ? -alturaAsientoM + 0.075 : 0.075;
  const diferenciaRodilla = hip - knee;
  const longitudPantorrilla = Math.max(0.16 * sz, Math.min(0.5 * sz, (kneeZ - ankleTargetZ) / Math.max(0.2, Math.cos(diferenciaRodilla))));
  const xCaderas = 0.105;
  const caderaY = cuerpoY + (sentada ? 0.06 : 0);
  const muslos: SegmentoHumano[] = [];
  const pantorrillas: SegmentoHumano[] = [];
  const brazos: SegmentoHumano[] = [];
  const antebrazos: SegmentoHumano[] = [];
  const joints: PoseHumana["joints"] = { hips: [], knees: [], ankles: [], shoulders: [], elbows: [], wrists: [] };
  const manos: PoseHumana["manos"] = [];
  const pies: PoseHumana["pies"] = [];
  const flexionHombro = radianes(postura.shoulderFlexionDeg);
  const codo = radianes(postura.elbowFlexionDeg);

  for (const lado of [-1, 1]) {
    const x = lado * xCaderas;
    const cadera: Vector3 = [x, caderaY, alturaCadera];
    const rodilla: Vector3 = [x, caderaY + longitudMuslo * Math.sin(hip), kneeZ];
    const tobillo: Vector3 = [x, rodilla[1] + longitudPantorrilla * Math.sin(diferenciaRodilla), rodilla[2] - longitudPantorrilla / sz * Math.cos(diferenciaRodilla)];
    joints.hips.push(escalar(cadera));
    joints.knees.push(escalar(rodilla));
    joints.ankles.push(escalar(tobillo));
    muslos.push(segmento(cadera, rodilla, 0.064, "#45647b"));
    pantorrillas.push(segmento(rodilla, tobillo, 0.047, "#45647b"));
    pies.push({ center: escalar([x, tobillo[1] + 0.065, tobillo[2] - 0.032]), size: escalar([0.105, 0.20, 0.065]) });

    const hombro: Vector3 = [lado * 0.19, torsoFin[1], torsoFin[2] - 0.045];
    const codoPunto: Vector3 = [lado * 0.27, hombro[1] + Math.sin(flexionHombro) * 0.29, hombro[2] - Math.cos(flexionHombro) * 0.29];
    const anguloAntebrazo = flexionHombro + codo;
    const muneca: Vector3 = [lado * 0.30, codoPunto[1] + Math.sin(anguloAntebrazo) * 0.30, codoPunto[2] - Math.cos(anguloAntebrazo) * 0.30];
    joints.shoulders.push(escalar(hombro));
    joints.elbows.push(escalar(codoPunto));
    joints.wrists.push(escalar(muneca));
    brazos.push(segmento(hombro, codoPunto, 0.047, "#d4d9dd"));
    antebrazos.push(segmento(codoPunto, muneca, 0.039, "#d4d9dd"));
    manos.push({ center: escalar([lado * 0.32, muneca[1] + 0.035, muneca[2] - 0.008]), size: escalar([0.075, 0.11, 0.045]) });
  }

  return {
    pelvis: { center: escalar([0, cuerpoY, sentada ? 0.085 : 0.91]), size: escalar([0.31, 0.25, 0.17]) },
    torso: segmento(torsoInicio, torsoFin, 0.14, "#6089a4"),
    cuello: segmento([0, torsoFin[1], torsoFin[2] - 0.005], [0, torsoFin[1], torsoFin[2] + 0.08], 0.055, "#d4d9dd"),
    cabeza: { center: escalar([0, torsoFin[1], torsoFin[2] + 0.19]), size: escalar([0.19, 0.205, 0.24]) },
    muslos,
    pantorrillas,
    brazos,
    antebrazos,
    joints,
    manos,
    pies,
    angulos: { cadera: postura.hipFlexionDeg, rodilla: postura.kneeFlexionDeg },
  };
}
