import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Box3, Plane, Vector3, Group, type Material, type Mesh, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { almacen } from "./almacen";

/**
 * Modelo conceptual compuesto con materiales PBR horneados (banca-claude-texturas-v2.glb).
 * Modelo de referencia conceptual compuesto (no CAD ni fabricacion verificada).
 * 73 mallas separadas que se agrupan en tiempo de ejecucion en 9 conjuntos
 * para respaldos, cuatro listones de asiento y soportes con su tornilleria correspondiente.
 */
export const URL_BANCA_CLAUDE = `${import.meta.env.BASE_URL}models/banca-claude-texturas-v2.glb`;
export const URL_BANCA_OFICIAL = URL_BANCA_CLAUDE;

/** Giro (rad) alrededor de Y para que el respaldo quede hacia -z y el frente hacia +z. */
const GIRO_FRENTE = 0;

export const GRUPOS_BANCA: Record<string, string[]> = {
  // Respaldo: orden de arriba a abajo (liston 3 es el superior, liston 1 el inferior)
  "respaldo-liston-1": [
    "Respaldo_listón_03",
    "Arandela_respaldo_3_der",
    "Arandela_respaldo_3_izq",
    "Tornillo_respaldo_3_der",
    "Tornillo_respaldo_3_izq",
  ],
  "respaldo-liston-2": [
    "Respaldo_listón_02",
    "Arandela_respaldo_2_der",
    "Arandela_respaldo_2_izq",
    "Tornillo_respaldo_2_der",
    "Tornillo_respaldo_2_izq",
  ],
  "respaldo-liston-3": [
    "Respaldo_listón_01",
    "Arandela_respaldo_1_der",
    "Arandela_respaldo_1_izq",
    "Tornillo_respaldo_1_der",
    "Tornillo_respaldo_1_izq",
  ],
  // Asiento: orden de atras hacia adelante (liston 4 es el posterior, liston 1 el frontal)
  "asiento-tablon-1": [
    "Asiento_listón_04",
    "Arandela_asiento_4_der",
    "Arandela_asiento_4_izq",
    "Tornillo_asiento_4_der",
    "Tornillo_asiento_4_izq",
  ],
  "asiento-tablon-2": [
    "Asiento_listón_03",
    "Arandela_asiento_3_der",
    "Arandela_asiento_3_izq",
    "Tornillo_asiento_3_der",
    "Tornillo_asiento_3_izq",
  ],
  "asiento-tablon-3": [
    "Asiento_listón_02",
    "Arandela_asiento_2_der",
    "Arandela_asiento_2_izq",
    "Tornillo_asiento_2_der",
    "Tornillo_asiento_2_izq",
  ],
  "asiento-tablon-4": [
    "Asiento_listón_01",
    "Arandela_asiento_1_der",
    "Arandela_asiento_1_izq",
    "Tornillo_asiento_1_der",
    "Tornillo_asiento_1_izq",
  ],
  // Soportes laterales con herrajes, apoyos inferiores y remaches del lado respectivo
  "soporte-lateral-izq": [
    "Soporte_izquierdo",
    "Arandela_soporte_izq_asiento_1",
    "Arandela_soporte_izq_asiento_4",
    "Arandela_soporte_izq_respaldo_3",
    "Tornillo_soporte_izq_asiento_1",
    "Tornillo_soporte_izq_asiento_4",
    "Tornillo_soporte_izq_respaldo_3",
    "Apoyo_listón_1_izq",
    "Apoyo_listón_2_izq",
    "Apoyo_listón_3_izq",
    "Apoyo_listón_4_izq",
    "Remache_inferior_1_izq_1",
    "Remache_inferior_1_izq_2",
    "Remache_inferior_2_izq_1",
    "Remache_inferior_2_izq_2",
    "Remache_inferior_3_izq_1",
    "Remache_inferior_3_izq_2",
    "Remache_inferior_4_izq_1",
    "Remache_inferior_4_izq_2",
  ],
  "soporte-lateral-der": [
    "Soporte_derecho",
    "Arandela_soporte_der_asiento_1",
    "Arandela_soporte_der_asiento_4",
    "Arandela_soporte_der_respaldo_3",
    "Tornillo_soporte_der_asiento_1",
    "Tornillo_soporte_der_asiento_4",
    "Tornillo_soporte_der_respaldo_3",
    "Apoyo_listón_1_der",
    "Apoyo_listón_2_der",
    "Apoyo_listón_3_der",
    "Apoyo_listón_4_der",
    "Remache_inferior_1_der_1",
    "Remache_inferior_1_der_2",
    "Remache_inferior_2_der_1",
    "Remache_inferior_2_der_2",
    "Remache_inferior_3_der_1",
    "Remache_inferior_3_der_2",
    "Remache_inferior_4_der_1",
    "Remache_inferior_4_der_2",
  ],
};

/** Normaliza los nombres exportados por Blender sin perder acentos. */
function normalizarNombreNodo(nombre: string): string {
  return nombre
    .normalize("NFC")
    // GLTFLoader aplica PropertyBinding.sanitizeNodeName: "Claude | X" pasa a "Claude_|_X".
    .replace(/^Claude[_\s]*\|[_\s]*/i, "")
    .trim()
    .replace(/[\s-]+/g, "_");
}

export function useBancaClaude() {
  const gltf = useLoader(GLTFLoader, URL_BANCA_CLAUDE);
  return gltf.scene;
}

export const useBancaOficial = useBancaClaude;

interface Props {
  /** Sombras proyectadas (perfil no lite). */
  sombras: boolean;
  /** Si se indica, devuelve la fraccion (0..1) revelada de abajo arriba mediante un plano de recorte. */
  revelado?: (() => number) | null;
  /** Si es true, registra los 9 grupos en almacen.partes para la timeline de despiece. */
  registrarPartes?: boolean;
}

/**
 * Instancia del modelo compuesto de banca, centrada, asentada en el suelo (y=0),
 * en escala ~1.5 m de ancho y estructurada en 9 grupos con matrices mundiales preservadas.
 */
export function BancaOficial({ sombras, revelado = null, registrarPartes = false }: Props) {
  const base = useBancaClaude();
  const gl = useThree((st) => st.gl);
  const plano = useMemo(() => new Plane(new Vector3(0, -1, 0), 10), []);

  const { bancaRoot, gruposMap, materiales, alto } = useMemo(() => {
    const clon = base.clone(true) as Group;
    const caja = new Box3().setFromObject(clon);
    const centro = caja.getCenter(new Vector3());
    const tam = caja.getSize(new Vector3());

    // Desplazamiento para centrar en X y Z, y asentar en el suelo en Y=0
    const dx = -centro.x;
    const dy = -caja.min.y;
    const dz = -centro.z;

    const contenedor = new Group();
    contenedor.name = "contenedor-centrado";
    contenedor.position.set(dx, dy, dz);
    contenedor.add(clon);
    contenedor.updateMatrixWorld(true);

    const bancaRoot = new Group();
    bancaRoot.name = "banca-claude-ensamblada";

    const nameMap = new Map<string, Mesh>();
    const materialesList: Material[] = [];

    clon.traverse((o: Object3D) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.material = (m.material as Material).clone();
        materialesList.push(m.material as Material);
        m.castShadow = sombras;
        m.receiveShadow = sombras;
        nameMap.set(normalizarNombreNodo(m.name), m);
      }
    });

    const gruposMap = new Map<string, Group>();
    for (const [id, nodeNames] of Object.entries(GRUPOS_BANCA)) {
      const g = new Group();
      g.name = id;
      bancaRoot.add(g);
      gruposMap.set(id, g);

      for (const rawName of nodeNames) {
        const obj = nameMap.get(normalizarNombreNodo(rawName));
        if (!obj) throw new Error(`Falta la malla "${rawName}" en banca-claude-texturas-v2.glb`);
        g.attach(obj);
      }
    }

    bancaRoot.updateMatrixWorld(true);

    return {
      bancaRoot,
      gruposMap,
      materiales: materialesList,
      alto: tam.y,
    };
  }, [base, sombras]);

  useEffect(() => () => materiales.forEach((m) => m.dispose()), [materiales]);

  // Registro determinista en almacen.partes (solo si registrarPartes = true)
  useEffect(() => {
    if (!registrarPartes) return;
    for (const [id, grupo] of gruposMap.entries()) {
      almacen.partes.set(id, grupo);
    }
    almacen.alMontar?.();
    almacen.invalidar?.();
    return () => {
      for (const id of gruposMap.keys()) {
        almacen.partes.delete(id);
      }
    };
  }, [registrarPartes, gruposMap]);

  // Recorte / revelado para la escena de proceso
  useEffect(() => {
    if (!revelado) return;
    gl.localClippingEnabled = true;
    materiales.forEach((m) => (m.clippingPlanes = [plano]));
    return () => {
      materiales.forEach((m) => (m.clippingPlanes = null));
    };
  }, [gl, materiales, plano, revelado]);

  useFrame(() => {
    if (!revelado) return;
    const f = revelado();
    plano.constant = f >= 0.999 ? 10 : alto * 1.02 * f;
    bancaRoot.visible = f > 0.001;
    bancaRoot.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) m.castShadow = sombras && f >= 0.999;
    });
  });

  return (
    <group rotation={[0, GIRO_FRENTE, 0]}>
      <primitive object={bancaRoot} />
    </group>
  );
}

export const BancaClaude = BancaOficial;
