/**
 * Modulo puro y determinista de animacion humana (sin dependencias de Three.js
 * ni nombres de huesos de ningun GLB).
 *
 * Convencion de coordenadas canonicas (Y-up en metros, local a la banca):
 * - Origen (0, 0, 0): centro de la banca apoyada sobre el suelo (Y = 0).
 * - +Y: arriba. Superficie superior del asiento en Y = 0.45 m.
 * - +Z: frente de la banca (hacia el espectador). Borde frontal del asiento ~0.29 m, respaldo ~-0.17 m.
 * - +X: lado izquierdo del personaje cuando mira hacia +Z.
 *
 * A partir de un progreso normalizado (0..1), produce una PoseCanonica
 * completamente determinista y reversible al subir o bajar el scroll.
 */

export type Vec3 = [number, number, number];

export type FasePersona = "reposo" | "caminando" | "girando" | "sentandose" | "sentado";

/** Articulaciones canonicas en coordenadas locales del personaje (Y-up, frente hacia +Z). */
export interface ArticulacionesCanonicas {
  pelvis: Vec3;
  cintura: Vec3;
  pecho: Vec3;
  cuello: Vec3;
  cabeza: Vec3;
  hombroIzq: Vec3;
  codoIzq: Vec3;
  munecaIzq: Vec3;
  hombroDer: Vec3;
  codoDer: Vec3;
  munecaDer: Vec3;
  caderaIzq: Vec3;
  rodillaIzq: Vec3;
  tobilloIzq: Vec3;
  caderaDer: Vec3;
  rodillaDer: Vec3;
  tobilloDer: Vec3;
}

/** Angulos articulares canonicos (en radianes) como referencia para adaptadores por rotacion directa. */
export interface AngulosCanonicos {
  flexionCaderaIzq: number;
  flexionCaderaDer: number;
  flexionRodillaIzq: number;
  flexionRodillaDer: number;
  inclinacionTorso: number;
  flexionHombroIzq: number;
  flexionHombroDer: number;
  flexionCodoIzq: number;
  flexionCodoDer: number;
}

export interface PoseCanonica {
  /** Transformacion de raiz en coordenadas locales de la banca (Y-up). */
  raiz: {
    posicion: Vec3;
    giroY: number;
    fase: FasePersona;
  };
  /** Posiciones objetivo de las articulaciones en espacio local del personaje. */
  articulaciones: ArticulacionesCanonicas;
  /** Angulos articulares equivalentes en radianes. */
  angulos: AngulosCanonicos;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const rad = (deg: number) => (deg * Math.PI) / 180;

// Geometria de referencia del recorrido y asiento (banca centrada en 0,0,0; asiento Y=0.45, frente +Z)
const INICIO_CAMINATA: Vec3 = [1.65, 0, 0.54];
const PUNTO_FRENTE_BANCA: Vec3 = [0, 0, 0.48];
// Descenso de 3.5 cm para asentar el peso visual del avatar sobre el asiento.
const PUNTO_ASIENTO: Vec3 = [0, -0.035, -0.015];

// Tramos dentro del progreso de accion 0..1
const FIN_CAMINATA = 0.52;
const FIN_GIRO = 0.72;

// Proporciones humanas canonicas (metros, estatura ~1.75 m)
const ALTURA_PELVIS_PARADA = 0.958;
const ALTURA_CADERA_PARADA = 0.963;
const LONG_MUSLO = 0.415;
const LONG_PANTORRILLA = 0.415;
const LONG_BRAZO = 0.27;
const LONG_ANTEBRAZO = 0.25;

/** Construye una pose erguida o de marcha en espacio local del personaje (frente +Z). */
function crearPoseDePie(amplitudPaso: number, faseCiclo: number): PoseCanonica {
  const avanceIzq = Math.sin(faseCiclo) * amplitudPaso;
  const avanceDer = Math.sin(faseCiclo + Math.PI) * amplitudPaso;
  const intensidadPaso = clamp01(amplitudPaso / 0.52);
  const distanciaCiclo = 0.55 * intensidadPaso;

  // Cada pie mantiene su posición respecto al suelo durante el apoyo y vuelve
  // hacia delante en un arco corto durante el balanceo.
  const posicionPie = (fase: number): { avance: number; elevacion: number } => {
    const ciclo = ((fase / (Math.PI * 2)) % 1 + 1) % 1;
    const inicioVuelo = 0.62;
    if (ciclo < inicioVuelo) {
      return { avance: distanciaCiclo * (inicioVuelo * 0.5 - ciclo), elevacion: 0 };
    }

    const duracionVuelo = 1 - inicioVuelo;
    const t = (ciclo - inicioVuelo) / duracionVuelo;
    // Hermite mantiene velocidad continua al despegar y volver a apoyar el pie.
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    const inicio = -inicioVuelo * 0.5;
    const fin = inicioVuelo * 0.5;
    const pendiente = -duracionVuelo;
    const avance = distanciaCiclo * (h00 * inicio + h10 * pendiente + h01 * fin + h11 * pendiente);
    return { avance, elevacion: Math.sin(Math.PI * t) * 0.065 * intensidadPaso };
  };

  // Ligero descenso pelvico durante la zancada para mantener el pie de apoyo en suelo Y=0
  const descensoZancada = 0.018 * amplitudPaso * (0.5 + 0.5 * Math.abs(Math.sin(faseCiclo)));
  const pelvisY = ALTURA_PELVIS_PARADA - descensoZancada;
  const caderaY = ALTURA_CADERA_PARADA - descensoZancada;

  const cinturaY = pelvisY + 0.1;
  const pechoY = pelvisY + 0.455;
  const cuelloY = pelvisY + 0.57;
  const cabezaY = pelvisY + 0.725;

  const pierna = (lado: 1 | -1, avance: number, elev: number): { cadera: Vec3; rodilla: Vec3; tobillo: Vec3; flexCadera: number; flexRodilla: number } => {
    const x = lado * 0.092;
    const cadera: Vec3 = [x, caderaY, 0];
    const zRodilla = avance * 0.58 + elev * 0.28;
    const yRodilla = caderaY - Math.sqrt(Math.max(0.05, LONG_MUSLO * LONG_MUSLO - zRodilla * zRodilla));
    const zTobillo = avance;
    const yTobillo = 0.122 + elev;
    const flexCadera = Math.atan2(zRodilla, caderaY - yRodilla);
    const angPantorrilla = Math.atan2(zTobillo - zRodilla, yRodilla - yTobillo);
    const flexRodilla = Math.max(0, flexCadera - angPantorrilla);
    return {
      cadera,
      rodilla: [x, yRodilla, zRodilla],
      tobillo: [x, yTobillo, zTobillo],
      flexCadera,
      flexRodilla,
    };
  };

  const brazo = (lado: 1 | -1, balanceo: number): { hombro: Vec3; codo: Vec3; muneca: Vec3; flexHombro: number; flexCodo: number } => {
    const hombroY = pechoY - 0.025;
    const hombro: Vec3 = [lado * 0.165, hombroY, -0.01];
    // Brazo oscila en contrafase respecto a la pierna del mismo lado
    const flexHombro = -balanceo * 0.45 + rad(6);
    const flexCodo = rad(14) + Math.max(0, -balanceo) * 0.22;
    const codo: Vec3 = [
      lado * 0.205,
      hombroY - Math.cos(flexHombro) * LONG_BRAZO,
      hombro[2] + Math.sin(flexHombro) * LONG_BRAZO,
    ];
    const angAntebrazo = flexHombro + flexCodo;
    const muneca: Vec3 = [
      lado * 0.215,
      codo[1] - Math.cos(angAntebrazo) * LONG_ANTEBRAZO,
      codo[2] + Math.sin(angAntebrazo) * LONG_ANTEBRAZO,
    ];
    return { hombro, codo, muneca, flexHombro, flexCodo };
  };

  const pieIzq = posicionPie(faseCiclo);
  const pieDer = posicionPie(faseCiclo + Math.PI);
  const pIzq = pierna(1, pieIzq.avance, pieIzq.elevacion);
  const pDer = pierna(-1, pieDer.avance, pieDer.elevacion);
  // El braceo acompaña la marcha, con algo más de recorrido que los pies.
  const bIzq = brazo(1, avanceIzq * 1.25);
  const bDer = brazo(-1, avanceDer * 1.25);

  return {
    raiz: { posicion: [0, 0, 0], giroY: 0, fase: amplitudPaso > 0.02 ? "caminando" : "reposo" },
    articulaciones: {
      pelvis: [0, pelvisY, 0],
      cintura: [0, cinturaY, 0],
      pecho: [0, pechoY, -0.015],
      cuello: [0, cuelloY, -0.01],
      cabeza: [0, cabezaY, 0.01],
      hombroIzq: bIzq.hombro,
      codoIzq: bIzq.codo,
      munecaIzq: bIzq.muneca,
      hombroDer: bDer.hombro,
      codoDer: bDer.codo,
      munecaDer: bDer.muneca,
      caderaIzq: pIzq.cadera,
      rodillaIzq: pIzq.rodilla,
      tobilloIzq: pIzq.tobillo,
      caderaDer: pDer.cadera,
      rodillaDer: pDer.rodilla,
      tobilloDer: pDer.tobillo,
    },
    angulos: {
      flexionCaderaIzq: pIzq.flexCadera,
      flexionCaderaDer: pDer.flexCadera,
      flexionRodillaIzq: pIzq.flexRodilla,
      flexionRodillaDer: pDer.flexRodilla,
      inclinacionTorso: rad(2 * amplitudPaso),
      flexionHombroIzq: bIzq.flexHombro,
      flexionHombroDer: bDer.flexHombro,
      flexionCodoIzq: bIzq.flexCodo,
      flexionCodoDer: bDer.flexCodo,
    },
  };
}

/** Pose sentada estable calibrada para la banca actual (asiento Y=0.45 m, frente +Z). */
export const POSE_PERSONA_SENTADA_ESTABLE: PoseCanonica = {
  raiz: {
    posicion: [...PUNTO_ASIENTO],
    giroY: 0,
    fase: "sentado",
  },
  articulaciones: {
    pelvis: [0, 0.597, 0],
    cintura: [0, 0.702, -0.01],
    pecho: [0, 1.082, -0.05],
    cuello: [0, 1.192, -0.04],
    cabeza: [0, 1.352, -0.02],
    hombroIzq: [0.165, 1.052, -0.05],
    codoIzq: [0.22, 0.832, 0.04],
    munecaIzq: [0.195, 0.732, 0.25],
    hombroDer: [-0.165, 1.052, -0.05],
    codoDer: [-0.22, 0.832, 0.04],
    munecaDer: [-0.195, 0.732, 0.25],
    caderaIzq: [0.092, 0.612, 0.02],
    rodillaIzq: [0.095, 0.567, 0.42],
    tobilloIzq: [0.095, 0.132, 0.42],
    caderaDer: [-0.092, 0.612, 0.02],
    rodillaDer: [-0.095, 0.567, 0.42],
    tobilloDer: [-0.095, 0.132, 0.42],
  },
  angulos: {
    flexionCaderaIzq: rad(92),
    flexionCaderaDer: rad(92),
    flexionRodillaIzq: rad(90),
    flexionRodillaDer: rad(90),
    inclinacionTorso: rad(-6),
    flexionHombroIzq: rad(16),
    flexionHombroDer: rad(16),
    flexionCodoIzq: rad(42),
    flexionCodoDer: rad(42),
  },
};

const POSE_DE_PIE_NEUTRA = crearPoseDePie(0, 0);

function mezclarPoses(a: PoseCanonica, b: PoseCanonica, t: number, raiz: PoseCanonica["raiz"]): PoseCanonica {
  const k = clamp01(t);
  return {
    raiz,
    articulaciones: {
      pelvis: mix3(a.articulaciones.pelvis, b.articulaciones.pelvis, k),
      cintura: mix3(a.articulaciones.cintura, b.articulaciones.cintura, k),
      pecho: mix3(a.articulaciones.pecho, b.articulaciones.pecho, k),
      cuello: mix3(a.articulaciones.cuello, b.articulaciones.cuello, k),
      cabeza: mix3(a.articulaciones.cabeza, b.articulaciones.cabeza, k),
      hombroIzq: mix3(a.articulaciones.hombroIzq, b.articulaciones.hombroIzq, k),
      codoIzq: mix3(a.articulaciones.codoIzq, b.articulaciones.codoIzq, k),
      munecaIzq: mix3(a.articulaciones.munecaIzq, b.articulaciones.munecaIzq, k),
      hombroDer: mix3(a.articulaciones.hombroDer, b.articulaciones.hombroDer, k),
      codoDer: mix3(a.articulaciones.codoDer, b.articulaciones.codoDer, k),
      munecaDer: mix3(a.articulaciones.munecaDer, b.articulaciones.munecaDer, k),
      caderaIzq: mix3(a.articulaciones.caderaIzq, b.articulaciones.caderaIzq, k),
      rodillaIzq: mix3(a.articulaciones.rodillaIzq, b.articulaciones.rodillaIzq, k),
      tobilloIzq: mix3(a.articulaciones.tobilloIzq, b.articulaciones.tobilloIzq, k),
      caderaDer: mix3(a.articulaciones.caderaDer, b.articulaciones.caderaDer, k),
      rodillaDer: mix3(a.articulaciones.rodillaDer, b.articulaciones.rodillaDer, k),
      tobilloDer: mix3(a.articulaciones.tobilloDer, b.articulaciones.tobilloDer, k),
    },
    angulos: {
      flexionCaderaIzq: lerp(a.angulos.flexionCaderaIzq, b.angulos.flexionCaderaIzq, k),
      flexionCaderaDer: lerp(a.angulos.flexionCaderaDer, b.angulos.flexionCaderaDer, k),
      flexionRodillaIzq: lerp(a.angulos.flexionRodillaIzq, b.angulos.flexionRodillaIzq, k),
      flexionRodillaDer: lerp(a.angulos.flexionRodillaDer, b.angulos.flexionRodillaDer, k),
      inclinacionTorso: lerp(a.angulos.inclinacionTorso, b.angulos.inclinacionTorso, k),
      flexionHombroIzq: lerp(a.angulos.flexionHombroIzq, b.angulos.flexionHombroIzq, k),
      flexionHombroDer: lerp(a.angulos.flexionHombroDer, b.angulos.flexionHombroDer, k),
      flexionCodoIzq: lerp(a.angulos.flexionCodoIzq, b.angulos.flexionCodoIzq, k),
      flexionCodoDer: lerp(a.angulos.flexionCodoDer, b.angulos.flexionCodoDer, k),
    },
  };
}

/**
 * Evalua la pose canonica determinista para un progreso normalizado (0..1):
 * - [0.00, 0.52): caminata de aproximacion frente a la banca (2 ciclos completos / 4 pasos).
 * - [0.52, 0.72): giro hasta quedar de espaldas al asiento mirando hacia +Z.
 * - [0.72, 1.00): transicion suave de pie a sentado con ligera inclinacion natural del torso.
 * - reducido = true: devuelve directamente la pose sentada estable sin caminata.
 */
export function posePersonaParaProgreso(progreso: number, reducido = false): PoseCanonica {
  if (reducido) return POSE_PERSONA_SENTADA_ESTABLE;

  const p = clamp01(progreso);
  const rumboCaminata = Math.atan2(
    PUNTO_FRENTE_BANCA[0] - INICIO_CAMINATA[0],
    PUNTO_FRENTE_BANCA[2] - INICIO_CAMINATA[2],
  );

  // 1. Aproximacion caminando
  if (p < FIN_CAMINATA) {
    const u = smoothstep(p / FIN_CAMINATA);
    const pos = mix3(INICIO_CAMINATA, PUNTO_FRENTE_BANCA, u);
    const ciclos = u * Math.PI * 6; // 3 ciclos completos de marcha (~0.55 m por ciclo)
    // Envolvente suave al arrancar y al detenerse frente al asiento
    const envolvente = Math.min(1, u * 5) * Math.min(1, (1 - u) * 5);
    const poseMarcha = crearPoseDePie(0.52 * envolvente, ciclos);
    // Comienza a orientar el giro en el ultimo tramo de la caminata para evitar quiebre
    const preGiro = smoothstep((u - 0.85) / 0.15) * 0.2;
    const giroY = lerp(rumboCaminata, 0, preGiro);
    return {
      ...poseMarcha,
      raiz: { posicion: pos, giroY, fase: "caminando" },
    };
  }

  // 2. Giro frente al asiento (mirando +Z, espalda hacia la banca)
  if (p < FIN_GIRO) {
    const u = smoothstep((p - FIN_CAMINATA) / (FIN_GIRO - FIN_CAMINATA));
    const giroY = lerp(rumboCaminata, 0, smoothstep(u / 0.78));
    // Pequeño paso de acomodo que se asienta en postura neutra antes de sentarse
    const amp = Math.max(0, 1 - u / 0.65) * 0.18;
    const poseBase = amp > 0.01 ? crearPoseDePie(amp, Math.PI * 6 + u * Math.PI * 0.6) : POSE_DE_PIE_NEUTRA;
    return {
      ...poseBase,
      raiz: { posicion: [...PUNTO_FRENTE_BANCA], giroY, fase: "girando" },
    };
  }

  // 3. Descenso hacia la banca y pose sentada final
  if (p < 1) {
    const raw = smoothstep((p - FIN_GIRO) / (1 - FIN_GIRO));
    const sentado = 1 - (1 - raw) * (1 - raw);
    const pos = mix3(PUNTO_FRENTE_BANCA, PUNTO_ASIENTO, sentado);
    const pose = mezclarPoses(POSE_DE_PIE_NEUTRA, POSE_PERSONA_SENTADA_ESTABLE, sentado, {
      posicion: pos,
      giroY: 0,
      fase: "sentandose",
    });
    // Ligera inclinacion hacia adelante (+Z) a mitad del descenso para balance natural
    const inclinacion = Math.sin(Math.PI * raw) * 0.055;
    if (inclinacion > 1e-4) {
      pose.articulaciones.pecho = [
        pose.articulaciones.pecho[0],
        pose.articulaciones.pecho[1] - inclinacion * 0.15,
        pose.articulaciones.pecho[2] + inclinacion,
      ];
      pose.articulaciones.cuello = [
        pose.articulaciones.cuello[0],
        pose.articulaciones.cuello[1] - inclinacion * 0.18,
        pose.articulaciones.cuello[2] + inclinacion * 1.15,
      ];
      pose.articulaciones.cabeza = [
        pose.articulaciones.cabeza[0],
        pose.articulaciones.cabeza[1] - inclinacion * 0.2,
        pose.articulaciones.cabeza[2] + inclinacion * 1.25,
      ];
    }
    return pose;
  }

  return POSE_PERSONA_SENTADA_ESTABLE;
}

/** Evita warnings sobre constantes internas cuando algun adaptador solo consulta la pose. */
export { LONG_PANTORRILLA };
