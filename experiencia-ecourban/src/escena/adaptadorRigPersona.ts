import {
  Group,
  Quaternion,
  Vector3,
  type Bone,
  type Material,
  type Mesh,
  type Object3D,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { PoseCanonica, Vec3 } from "./animacionPersona";
import type { PerfilRigPersona } from "./perfilRigPersona";

interface TransformacionReposo {
  rotacion: Quaternion;
  posicion: Vector3;
}

export interface AdaptadorRigPersona {
  /** Grupo raiz de posicion/rotacion del personaje en coordenadas de la escena. */
  raiz: Group;
  /** Aplica una PoseCanonica de forma determinista y sin recorrer vertices por frame. */
  aplicarPose(pose: PoseCanonica, posicionBase?: Vec3, rotacionBaseY?: number): void;
  /** Libera materiales clonados al desmontar. */
  liberar(): void;
}

const TMP_FROM = new Vector3();
const TMP_TO = new Vector3();
const TMP_CHILD = new Vector3();
const TMP_BONE = new Vector3();
const TMP_WORLD_Q = new Quaternion();
const TMP_PARENT_Q = new Quaternion();
const TMP_DELTA_Q = new Quaternion();

function orientarHueso(
  hueso: Bone | undefined,
  hijo: Bone | undefined,
  inicio: Vector3,
  fin: Vector3,
  espacio: Object3D,
) {
  if (!hueso || !hijo) return;
  espacio.updateMatrixWorld(true);
  hijo.getWorldPosition(TMP_CHILD);
  hueso.getWorldPosition(TMP_BONE);
  TMP_FROM.subVectors(TMP_CHILD, TMP_BONE);
  TMP_TO.subVectors(fin, inicio);
  if (TMP_FROM.lengthSq() < 1e-8 || TMP_TO.lengthSq() < 1e-8) return;
  hueso.getWorldQuaternion(TMP_WORLD_Q);
  TMP_DELTA_Q.setFromUnitVectors(TMP_FROM.normalize(), TMP_TO.normalize());
  TMP_WORLD_Q.premultiply(TMP_DELTA_Q);
  if (hueso.parent) {
    hueso.parent.getWorldQuaternion(TMP_PARENT_Q);
    hueso.quaternion.copy(TMP_PARENT_Q.invert().multiply(TMP_WORLD_Q));
  } else {
    hueso.quaternion.copy(TMP_WORLD_Q);
  }
  espacio.updateMatrixWorld(true);
}

/**
 * Adaptador de render que instancia un modelo GLB skinned con SkeletonUtils.clone
 * y traduce una PoseCanonica al esqueleto concreto definido por PerfilRigPersona.
 */
export function crearAdaptadorRigPersona(
  modeloFuente: Object3D,
  perfil: PerfilRigPersona,
  sombras: boolean,
): AdaptadorRigPersona {
  const modelo = cloneSkinned(modeloFuente);
  const raiz = new Group();
  raiz.name = `persona-${perfil.id}`;

  const espacioPose = new Group();
  const baseOrientacion = new Group();
  baseOrientacion.rotation.set(...perfil.rotacionBase);
  baseOrientacion.scale.setScalar(perfil.escalaAltura);
  baseOrientacion.add(modelo);
  espacioPose.add(baseOrientacion);
  raiz.add(espacioPose);

  const huesosPorNombre = new Map<string, Bone>();
  const materiales: Material[] = [];

  modelo.traverse((obj) => {
    const hueso = obj as Bone;
    if (hueso.isBone) huesosPorNombre.set(obj.name, hueso);

    const malla = obj as Mesh;
    if (malla.isMesh) {
      malla.castShadow = sombras;
      malla.receiveShadow = sombras;
      // Evita desapariciones por frustum culling sobre pose deformada lejos del bind pose
      malla.frustumCulled = false;
      if (Array.isArray(malla.material)) {
        malla.material = malla.material.map((m) => {
          const clon = m.clone();
          materiales.push(clon);
          return clon;
        });
      } else if (malla.material) {
        const clon = malla.material.clone();
        materiales.push(clon);
        malla.material = clon;
      }
    }
  });

  const nombresMapeados = new Set(Object.values(perfil.huesos));
  const reposo = new Map<string, TransformacionReposo>();
  for (const nombre of nombresMapeados) {
    const hueso = huesosPorNombre.get(nombre);
    if (hueso) {
      reposo.set(nombre, {
        rotacion: hueso.quaternion.clone(),
        posicion: hueso.position.clone(),
      });
    }
  }

  const hueso = (nombre?: string) => (nombre ? huesosPorNombre.get(nombre) : undefined);
  const h = perfil.huesos;

  // Vectores reutilizables para evitar asignaciones en cada seek del scroll
  const vPelvis = new Vector3();
  const vCintura = new Vector3();
  const vPecho = new Vector3();
  const vCuello = new Vector3();
  const vCabeza = new Vector3();
  const vEjeTorso = new Vector3();
  const vPechoAlto = new Vector3();
  const vHombro = new Vector3();
  const vCodo = new Vector3();
  const vMuneca = new Vector3();
  const vCadera = new Vector3();
  const vRodilla = new Vector3();
  const vTobillo = new Vector3();

  const aEspacioRaiz = (destino: Vector3, punto: Vec3, origenY: number, origenZ: number) => {
    destino.set(punto[0], punto[1] - origenY, punto[2] - origenZ);
    espacioPose.localToWorld(destino);
    return destino;
  };

  const aplicarPose = (pose: PoseCanonica, posicionBase: Vec3 = [0, 0, 0], rotacionBaseY = 0) => {
    const [bx, by, bz] = posicionBase;
    const [px, py, pz] = pose.raiz.posicion;
    // Transforma la posicion local de la pose respecto a la colocacion base
    const cosB = Math.cos(rotacionBaseY);
    const sinB = Math.sin(rotacionBaseY);
    raiz.position.set(bx + px * cosB + pz * sinB, by + py, bz - px * sinB + pz * cosB);
    raiz.rotation.set(0, rotacionBaseY + pose.raiz.giroY, 0);

    const a = pose.articulaciones;
    const origenY = a.pelvis[1] - perfil.alturaCaderaReposo * perfil.escalaAltura + perfil.offsetY;
    const origenZ = a.pelvis[2];
    espacioPose.position.set(0, origenY, origenZ);

    for (const [nombre, t] of reposo) {
      const joint = huesosPorNombre.get(nombre);
      if (joint) {
        joint.quaternion.copy(t.rotacion);
        joint.position.copy(t.posicion);
      }
    }

    raiz.updateMatrixWorld(true);

    aEspacioRaiz(vPelvis, a.pelvis, origenY, origenZ);
    aEspacioRaiz(vCintura, a.cintura, origenY, origenZ);
    aEspacioRaiz(vPecho, a.pecho, origenY, origenZ);
    aEspacioRaiz(vCuello, a.cuello, origenY, origenZ);
    aEspacioRaiz(vCabeza, a.cabeza, origenY, origenZ);

    orientarHueso(hueso(h.cadera), hueso(h.columna), vPelvis, vCintura, raiz);
    if (h.columnaMedia) {
      orientarHueso(hueso(h.columna), hueso(h.columnaMedia), vCintura, vPecho, raiz);
      vEjeTorso.subVectors(vPecho, vCintura).normalize();
      vPechoAlto.copy(vPecho).addScaledVector(vEjeTorso, perfil.longitudTorsoSuperior);
      orientarHueso(hueso(h.columnaMedia), hueso(h.pecho), vPecho, vPechoAlto, raiz);
    } else {
      orientarHueso(hueso(h.columna), hueso(h.pecho), vCintura, vPecho, raiz);
    }
    orientarHueso(hueso(h.pecho), hueso(h.cuello), vPecho, vCuello, raiz);
    orientarHueso(hueso(h.cuello), hueso(h.cabeza), vCuello, vCabeza, raiz);

    // Brazo y pierna izquierda
    aEspacioRaiz(vHombro, a.hombroIzq, origenY, origenZ);
    aEspacioRaiz(vCodo, a.codoIzq, origenY, origenZ);
    aEspacioRaiz(vMuneca, a.munecaIzq, origenY, origenZ);
    orientarHueso(hueso(h.hombroIzq), hueso(h.brazoIzq), vPecho, vHombro, raiz);
    orientarHueso(hueso(h.brazoIzq), hueso(h.antebrazoIzq), vHombro, vCodo, raiz);
    orientarHueso(hueso(h.antebrazoIzq), hueso(h.manoIzq), vCodo, vMuneca, raiz);

    aEspacioRaiz(vCadera, a.caderaIzq, origenY, origenZ);
    aEspacioRaiz(vRodilla, a.rodillaIzq, origenY, origenZ);
    aEspacioRaiz(vTobillo, a.tobilloIzq, origenY, origenZ);
    orientarHueso(hueso(h.musloIzq), hueso(h.pantorrillaIzq), vCadera, vRodilla, raiz);
    orientarHueso(hueso(h.pantorrillaIzq), hueso(h.pieIzq), vRodilla, vTobillo, raiz);

    // Brazo y pierna derecha
    aEspacioRaiz(vHombro, a.hombroDer, origenY, origenZ);
    aEspacioRaiz(vCodo, a.codoDer, origenY, origenZ);
    aEspacioRaiz(vMuneca, a.munecaDer, origenY, origenZ);
    orientarHueso(hueso(h.hombroDer), hueso(h.brazoDer), vPecho, vHombro, raiz);
    orientarHueso(hueso(h.brazoDer), hueso(h.antebrazoDer), vHombro, vCodo, raiz);
    orientarHueso(hueso(h.antebrazoDer), hueso(h.manoDer), vCodo, vMuneca, raiz);

    aEspacioRaiz(vCadera, a.caderaDer, origenY, origenZ);
    aEspacioRaiz(vRodilla, a.rodillaDer, origenY, origenZ);
    aEspacioRaiz(vTobillo, a.tobilloDer, origenY, origenZ);
    orientarHueso(hueso(h.musloDer), hueso(h.pantorrillaDer), vCadera, vRodilla, raiz);
    orientarHueso(hueso(h.pantorrillaDer), hueso(h.pieDer), vRodilla, vTobillo, raiz);
  };

  return {
    raiz,
    aplicarPose,
    liberar() {
      materiales.forEach((m) => m.dispose());
    },
  };
}
