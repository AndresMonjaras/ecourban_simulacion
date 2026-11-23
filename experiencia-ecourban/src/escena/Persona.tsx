import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { PoseCanonica, Vec3 } from "./animacionPersona";
import { crearAdaptadorRigPersona } from "./adaptadorRigPersona";
import type { PerfilRigPersona } from "./perfilRigPersona";

interface Props {
  /** Perfil de rig del GLB humano a instanciar. */
  perfil: PerfilRigPersona;
  /** Pose estatica (usada cuando no hay lectura dinamica por scroll). */
  pose?: PoseCanonica;
  /** Lector determinista de pose en cada frame bajo demanda (evita re-renders de React). */
  obtenerPose?: () => PoseCanonica;
  /** Control opcional de visibilidad sin desmontar ni re-clonar el esqueleto. */
  visible?: boolean | (() => boolean);
  /** Posicion base [x, y, z] del personaje en la escena. */
  posicion?: Vec3;
  /** Orientacion base alrededor de Y (rad). */
  rotacionY?: number;
  /** Sombras proyectadas y recibidas (desactivadas en perfil lite). */
  sombras?: boolean;
}

const ORIGEN: Vec3 = [0, 0, 0];

/**
 * Componente reusable para colocar e instanciar un personaje skinned.
 * Desacopla la animacion canonica y el perfil de rig del GLB concreto.
 */
export function Persona({
  perfil,
  pose,
  obtenerPose,
  visible = true,
  posicion = ORIGEN,
  rotacionY = 0,
  sombras = true,
}: Props) {
  const gltf = useLoader(GLTFLoader, perfil.urlModelo);
  const invalidate = useThree((s) => s.invalidate);

  const adaptador = useMemo(
    () => crearAdaptadorRigPersona(gltf.scene, perfil, sombras),
    [gltf.scene, perfil, sombras],
  );

  useEffect(() => () => adaptador.liberar(), [adaptador]);

  const ultimaPoseRef = useRef<PoseCanonica | null>(null);
  const ultimaVisibleRef = useRef<boolean | null>(null);
  const posKey = `${posicion[0]},${posicion[1]},${posicion[2]},${rotacionY}`;
  const ultimaPosKeyRef = useRef<string>("");

  const sincronizar = () => {
    const esVisible = typeof visible === "function" ? visible() : visible;
    if (esVisible !== ultimaVisibleRef.current) {
      ultimaVisibleRef.current = esVisible;
      adaptador.raiz.visible = esVisible;
    }
    if (!esVisible) return;

    const activa = obtenerPose ? obtenerPose() : pose;
    if (!activa) return;

    if (activa !== ultimaPoseRef.current || posKey !== ultimaPosKeyRef.current) {
      ultimaPoseRef.current = activa;
      ultimaPosKeyRef.current = posKey;
      adaptador.aplicarPose(activa, posicion, rotacionY);
    }
  };

  useLayoutEffect(() => {
    ultimaPoseRef.current = null;
    ultimaVisibleRef.current = null;
    sincronizar();
    invalidate();
  }, [adaptador, pose, obtenerPose, visible, posKey, invalidate]);

  useFrame(() => {
    sincronizar();
  });

  return <primitive object={adaptador.raiz} />;
}
