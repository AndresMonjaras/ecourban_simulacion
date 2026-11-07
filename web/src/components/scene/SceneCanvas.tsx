import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, TransformControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { SceneObject, SceneState, Vector3 } from "../../types/scene.ts";
import { getWASDAxes } from "../../utils/cameraNavigation.ts";
import { POSTURA_PERSONA_DEFAULT, POSTURA_PERSONA_PARADA_DEFAULT, pararPersona, sentarPersona } from "../../utils/humanPose.ts";
import { getBenchDependents } from "../../utils/placement.ts";
import { calculateCameraFrame, type CameraFrame } from "../../utils/cameraFraming.ts";
import { findSceneObjectRoot } from "../../utils/sceneObjectFocus.ts";

type Props = {
  state: SceneState;
  cameraView: "iso" | "front" | "side" | "top";
  onSelect: (id: string | null) => void;
  onPlace: (position: Vector3) => void;
  onPreview: (position: Vector3 | null) => void;
  preview: Vector3 | null;
  onTransform: (id: string, position: Vector3, rotation: Vector3) => void;
  onTransformStart: (id: string) => boolean;
  onRelease: (id: string, position: Vector3, rotation: Vector3, fallbackPosition?: Vector3) => void;
  onCancelHold: () => void;
  onContext: (id: string, x: number, y: number) => void;
  focusRequest: { kind: "bench" | "object"; objectId?: string; nonce: number } | null;
};

function ModeloBanca({ object }: { object: SceneObject }) {
  const gltf = useGLTF("/models/banca.glb");
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return <primitive object={model} />;
}

function puntoEntre(a: Vector3, b: Vector3): Vector3 {
  return [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
}

function SegmentoLocal({ end, radius, color }: { end: Vector3; radius: number; color: string }) {
  const direccion = new THREE.Vector3(...end);
  const longitud = direccion.length();
  if (longitud < 0.001) return null;
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direccion.clone().normalize());
  return <mesh position={[end[0] / 2, end[1] / 2, end[2] / 2]} quaternion={quaternion} castShadow receiveShadow>
    <capsuleGeometry args={[radius, Math.max(0.001, longitud - radius * 2), 6, 12]} />
    <meshStandardMaterial color={color} />
  </mesh>;
}

function BolaArticulacion({ radius, color }: { radius: number; color: string }) {
  return <mesh castShadow receiveShadow><sphereGeometry args={[radius, 16, 12]} /><meshStandardMaterial color={color} /></mesh>;
}

function asientoParaPersona(persona: SceneObject, objects: SceneObject[]): Asiento {
  const banca = objects.find((item) => {
    if (!item.visible || item.type !== "bench") return false;
    const escala: Vector3 = item.transform.scale.map((factor, index) => factor * item.dimensionsMm[index] / [1500, 624.79, 850][index]) as Vector3;
    const alturaAsiento = item.transform.position[2] + 0.45 * escala[2];
    if (Math.abs(persona.transform.position[2] - alturaAsiento) > 0.08) return false;
    const dx = persona.transform.position[0] - item.transform.position[0];
    const dy = persona.transform.position[1] - item.transform.position[1];
    const yaw = item.transform.rotation[2];
    const xLocal = Math.cos(yaw) * dx + Math.sin(yaw) * dy;
    const yLocal = -Math.sin(yaw) * dx + Math.cos(yaw) * dy;
    return Math.abs(xLocal) <= 0.75 * escala[0] && Math.abs(yLocal) <= 0.225 * escala[1];
  });
  if (!banca) return null;
  const escalaProfundidad = banca.transform.scale[1] * banca.dimensionsMm[1] / 624.79;
  return { altura: persona.transform.position[2], profundidad: 0.45 * escalaProfundidad };
}

type HeldObject = { id: string; position: Vector3; rotation: Vector3; fallbackPosition: Vector3; lastX: number; lastY: number };
type Asiento = { altura: number; profundidad: number } | null;
type HandlersObjeto = Pick<Props, "onSelect" | "onTransform" | "onTransformStart" | "onRelease" | "onContext" | "onPlace" | "onPreview"> & {
  held: MutableRefObject<HeldObject | null>;
  onPickUp: (object: SceneObject, clientX: number, clientY: number) => void;
  onObjectReady: (id: string, type: SceneObject["type"], object: THREE.Object3D) => void;
};

function Objeto({ object, selected, blocked, mode, placementType, seat, handlers }: { object: SceneObject; selected: boolean; blocked: boolean; mode: "translate" | "rotate"; placementType: SceneState["placementType"]; seat: Asiento; handlers: HandlersObjeto }) {
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    if (group.current) handlers.onObjectReady(object.id, object.type, group.current);
  }, [object.id, handlers.onObjectReady]);
  const position = object.transform.position;
  const rotation = object.transform.rotation;
  const isBench = object.type === "bench";
  const color = object.type === "person" ? "#d8a476" : "#e0a53a";
  const sentado = object.type === "person" && object.transform.position[2] > 0.3;
  const medidasBase = { bench: [1500, 624.79, 850], person: [450, 350, 1750], weight: [200, 200, 200] } as const;
  const escalaVisual = object.transform.scale.map((factor, index) => factor * object.dimensionsMm[index] / medidasBase[object.type][index]) as Vector3;
  const factorPersona: Vector3 = [object.dimensionsMm[0] / 450, object.dimensionsMm[1] / 350, object.dimensionsMm[2] / 1750];
  const escalaPersona: Vector3 = [object.transform.scale[0] * factorPersona[0], object.transform.scale[1] * factorPersona[1], object.transform.scale[2] * factorPersona[2]];
  const pose = object.type === "person" ? sentado ? sentarPersona(
    object.transform.position[2] / escalaPersona[2],
    (seat?.profundidad ?? 0.45) / escalaPersona[1],
    object.dimensionsMm,
    object.properties.posture ?? POSTURA_PERSONA_DEFAULT,
  ) : pararPersona(object.dimensionsMm, object.properties.posture ?? POSTURA_PERSONA_PARADA_DEFAULT) : null;
  const radioArticulacion = Math.min(...factorPersona);
  const contenidoPersonaArticulada = pose && <>
    <group position={pose.pelvis.center}>
      <mesh scale={[pose.pelvis.size[0] / 2, pose.pelvis.size[1] / 2, pose.pelvis.size[2] / 2]} castShadow receiveShadow><sphereGeometry args={[1, 24, 18]} /><meshStandardMaterial color="#45647b" /></mesh>
      {pose.joints.hips.map((hip, index) => {
        const rodilla = pose.joints.knees[index];
        const tobillo = pose.joints.ankles[index];
        const vectorCadera = puntoEntre(pose.pelvis.center, hip);
        const vectorRodilla = puntoEntre(hip, rodilla);
        const vectorTobillo = puntoEntre(rodilla, tobillo);
        const pie = pose.pies[index];
        return <group key={`pierna-${index}`} position={vectorCadera}>
          <SegmentoLocal end={vectorRodilla} radius={0.064 * radioArticulacion} color="#45647b" />
          <BolaArticulacion radius={0.072 * radioArticulacion} color="#344e61" />
          <group position={vectorRodilla}>
            <BolaArticulacion radius={0.061 * radioArticulacion} color="#344e61" />
            <SegmentoLocal end={vectorTobillo} radius={0.047 * radioArticulacion} color="#45647b" />
            <group position={vectorTobillo}>
              <BolaArticulacion radius={0.043 * radioArticulacion} color="#bcc5ca" />
              <mesh position={puntoEntre(tobillo, pie.center)}><boxGeometry args={pie.size} /><meshStandardMaterial color="#303b43" /></mesh>
            </group>
          </group>
        </group>;
      })}
    </group>
    <group position={pose.torso.start}>
      <SegmentoLocal end={puntoEntre(pose.torso.start, pose.torso.end)} radius={pose.torso.radius} color={pose.torso.color} />
      <group position={puntoEntre(pose.torso.start, pose.torso.end)}>
        <SegmentoLocal end={puntoEntre(pose.cuello.start, pose.cuello.end)} radius={pose.cuello.radius} color={pose.cuello.color} />
        <mesh position={puntoEntre(pose.torso.end, pose.cabeza.center)} scale={[pose.cabeza.size[0] / 2, pose.cabeza.size[1] / 2, pose.cabeza.size[2] / 2]} castShadow receiveShadow><sphereGeometry args={[1, 24, 18]} /><meshStandardMaterial color="#d4d9dd" /></mesh>
        {pose.joints.shoulders.map((shoulder, index) => {
          const elbow = pose.joints.elbows[index];
          const wrist = pose.joints.wrists[index];
          const hand = pose.manos[index];
          const vectorShoulder = puntoEntre(pose.torso.end, shoulder);
          const vectorElbow = puntoEntre(shoulder, elbow);
          const vectorWrist = puntoEntre(elbow, wrist);
          return <group key={`brazo-${index}`} position={vectorShoulder}>
            <BolaArticulacion radius={0.053 * radioArticulacion} color="#bcc5ca" />
            <SegmentoLocal end={vectorElbow} radius={0.047 * radioArticulacion} color="#d4d9dd" />
            <group position={vectorElbow}>
              <BolaArticulacion radius={0.043 * radioArticulacion} color="#bcc5ca" />
              <SegmentoLocal end={vectorWrist} radius={0.039 * radioArticulacion} color="#d4d9dd" />
              <group position={vectorWrist}>
                <BolaArticulacion radius={0.032 * radioArticulacion} color="#bcc5ca" />
                <mesh position={puntoEntre(wrist, hand.center)} scale={[hand.size[0] / 2, hand.size[1] / 2, hand.size[2] / 2]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#d4d9dd" /></mesh>
              </group>
            </group>
          </group>;
        })}
      </group>
    </group>
  </>;
  const contenido = isBench ? <ModeloBanca object={object} /> : object.type === "weight" ?
    <mesh position={[0, 0, 0.1]} castShadow receiveShadow><boxGeometry args={[0.2, 0.2, 0.2]} /><meshStandardMaterial color={color} /></mesh> : contenidoPersonaArticulada;

  const contenidoEscuchado = <group ref={group} userData={{ sceneObjectId: object.id }} position={position} rotation={rotation} scale={object.type === "person" ? object.transform.scale : escalaVisual}
    onPointerDown={(event) => {
      if (placementType) return;
      event.stopPropagation();
      if (!handlers.held.current) {
        handlers.onSelect(object.id);
        if (!handlers.onTransformStart(object.id)) return;
        handlers.onPickUp(object, event.nativeEvent.clientX, event.nativeEvent.clientY);
      }
    }}
    onClick={(event) => { event.stopPropagation(); if (placementType) handlers.onPlace([event.point.x, event.point.y, event.point.z]); }}
    onPointerMove={(event) => { if (placementType) handlers.onPreview([event.point.x, event.point.y, event.point.z]); }}
    onContextMenu={(event) => { event.stopPropagation(); event.nativeEvent.preventDefault(); handlers.onContext(object.id, event.nativeEvent.clientX, event.nativeEvent.clientY); }}>
    {contenido}
  </group>;

  if (!object.visible) return null;
  if (!selected || blocked) return contenidoEscuchado;
  return <TransformControls object={group as unknown as RefObject<THREE.Object3D>} mode={mode} onMouseDown={() => handlers.onTransformStart(object.id)} onObjectChange={() => {
    const actual = group.current;
    if (actual) handlers.onTransform(object.id, actual.position.toArray() as Vector3, actual.rotation.toArray().slice(0, 3) as Vector3);
  }} onMouseUp={() => {
    const actual = group.current;
    if (actual) handlers.onRelease(object.id, actual.position.toArray() as Vector3, actual.rotation.toArray().slice(0, 3) as Vector3);
  }}>{contenidoEscuchado}</TransformControls>;
}

function Escena({ state, cameraView, onSelect, onPlace, onPreview, onTransform, onTransformStart, onRelease, onCancelHold, onContext, preview, focusRequest }: Props) {
  const { gl, camera, scene } = useThree();
  const plano = useRef<THREE.Mesh>(null);
  const orbit = useRef<OrbitControlsImpl | null>(null);
  const teclas = useRef(new Set<string>());
  const held = useRef<HeldObject | null>(null);
  const pointer = useRef(new THREE.Vector2());
  const benchRoot = useRef<THREE.Object3D | null>(null);
  const benchFrame = useRef<CameraFrame | null>(null);
  const cameraCentered = useRef(false);
  const focusBox = useCallback((box: THREE.Box3) => {
    const control = orbit.current;
    if (!control || box.isEmpty()) return false;
    const perspective = camera as THREE.PerspectiveCamera;
    const frame = calculateCameraFrame(box, perspective.fov, perspective.aspect);
    const center = new THREE.Vector3(...frame.center);
    const direction = camera.position.clone().sub(control.target);
    if (direction.lengthSq() < 1e-8) direction.set(2.5, 3.8, 4.3);
    direction.normalize();
    control.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, frame.distance);
    const sceneRadius = benchFrame.current?.radius ?? frame.radius;
    control.minDistance = Math.max(0.05, sceneRadius * 0.1);
    control.maxDistance = Math.max(sceneRadius * 15, frame.distance * 3);
    perspective.updateProjectionMatrix();
    control.update();
    return true;
  }, [camera]);
  const onObjectReady = useCallback((id: string, type: SceneObject["type"], root: THREE.Object3D) => {
    if (type !== "bench") return;
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return;
    benchRoot.current = root;
    benchFrame.current = calculateCameraFrame(box, (camera as THREE.PerspectiveCamera).fov, (camera as THREE.PerspectiveCamera).aspect);
    if (!cameraCentered.current && focusBox(box)) cameraCentered.current = true;
  }, [camera, focusBox, scene]);
  useEffect(() => {
    if (!focusRequest) return;
    scene.updateMatrixWorld(true);
    const root = focusRequest.kind === "bench"
      ? benchRoot.current
      : focusRequest.objectId ? findSceneObjectRoot(scene, focusRequest.objectId) : null;
    if (!root) return;
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return;
    if (focusRequest.kind === "bench") {
      benchFrame.current = calculateCameraFrame(box, (camera as THREE.PerspectiveCamera).fov, (camera as THREE.PerspectiveCamera).aspect);
    }
    focusBox(box);
  }, [camera, focusBox, focusRequest, scene]);
  const actualizarPuntero = (clientX: number, clientY: number) => {
    const bounds = gl.domElement.getBoundingClientRect();
    pointer.current.set(((clientX - bounds.left) / bounds.width) * 2 - 1, -((clientY - bounds.top) / bounds.height) * 2 + 1);
  };
  const onPickUp = (object: SceneObject, clientX: number, clientY: number) => {
    actualizarPuntero(clientX, clientY);
    const position = [...object.transform.position] as Vector3;
    held.current = { id: object.id, position, rotation: [...object.transform.rotation] as Vector3, fallbackPosition: position, lastX: position[0], lastY: position[1] };
    if (orbit.current) orbit.current.enabled = false;
  };
  useEffect(() => {
    const cancelar = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !held.current) return;
      const current = held.current;
      held.current = null;
      onRelease(current.id, current.fallbackPosition, current.rotation, current.fallbackPosition);
      if (orbit.current) orbit.current.enabled = true;
      onCancelHold();
    };
    window.addEventListener("keydown", cancelar);
    return () => window.removeEventListener("keydown", cancelar);
  }, [onCancelHold, onRelease]);
  useEffect(() => {
    const moverPuntero = (event: PointerEvent) => {
      if (held.current) actualizarPuntero(event.clientX, event.clientY);
    };
    const soltarObjeto = (event: PointerEvent) => {
      const current = held.current;
      if (!current) return;
      actualizarPuntero(event.clientX, event.clientY);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer.current, camera);
      scene.updateMatrixWorld(true);
      const idDeObjeto = (object: THREE.Object3D): string | null => {
        let actual: THREE.Object3D | null = object;
        while (actual) {
          if (typeof actual.userData.sceneObjectId === "string") return actual.userData.sceneObjectId;
          actual = actual.parent;
        }
        return null;
      };
      const hit = raycaster.intersectObjects(scene.children, true).find((item) => {
        const id = idDeObjeto(item.object);
        return id !== null && id !== current.id;
      });
      const ground = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const point = hit?.point ?? raycaster.ray.intersectPlane(ground, new THREE.Vector3());
      if (point) onRelease(current.id, [point.x, point.y, current.position[2]], current.rotation, current.fallbackPosition);
      held.current = null;
      if (orbit.current) orbit.current.enabled = true;
    };
    window.addEventListener("pointermove", moverPuntero);
    window.addEventListener("pointerup", soltarObjeto, true);
    return () => {
      window.removeEventListener("pointermove", moverPuntero);
      window.removeEventListener("pointerup", soltarObjeto, true);
    };
  }, [camera, gl, onRelease, scene]);
  useEffect(() => {
    const control = orbit.current;
    if (!control) return;
    const direcciones: Record<typeof cameraView, [number, number, number]> = { iso: [2.5, 3.8, 4.3], front: [0, 1, 0.38], side: [1, 0, 0.38], top: [0, 0.02, 1] };
    const direccion = new THREE.Vector3(...direcciones[cameraView]).normalize();
    const distance = Math.max(control.getDistance(), 0.05);
    camera.up.set(0, 0, 1);
    camera.position.copy(control.target).addScaledVector(direccion, distance);
    control.update();
  }, [camera, cameraView]);
  useEffect(() => {
    const entradaDeTexto = (target: EventTarget | null) => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable);
    const presionar = (event: KeyboardEvent) => {
      const tecla = event.key.toLowerCase();
      if (!["w", "a", "s", "d"].includes(tecla) || entradaDeTexto(event.target)) return;
      teclas.current.add(tecla);
      event.preventDefault();
    };
    const soltar = (event: KeyboardEvent) => teclas.current.delete(event.key.toLowerCase());
    const limpiar = () => teclas.current.clear();
    window.addEventListener("keydown", presionar);
    window.addEventListener("keyup", soltar);
    window.addEventListener("blur", limpiar);
    return () => {
      window.removeEventListener("keydown", presionar);
      window.removeEventListener("keyup", soltar);
      window.removeEventListener("blur", limpiar);
    };
  }, []);
  useFrame((frame, delta) => {
    const heldObject = held.current;
    if (heldObject) {
      frame.raycaster.setFromCamera(pointer.current, frame.camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -heldObject.position[2]);
      const point = frame.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (point && (Math.abs(point.x - heldObject.lastX) > 0.002 || Math.abs(point.y - heldObject.lastY) > 0.002)) {
        heldObject.position = [point.x, point.y, heldObject.position[2]];
        heldObject.lastX = point.x;
        heldObject.lastY = point.y;
        const object = state.objects.find((item) => item.id === heldObject.id);
        if (object) onTransform(heldObject.id, heldObject.position, heldObject.rotation);
      }
      return;
    }
    const control = orbit.current;
    const activas = teclas.current;
    if (!control) return;
    const [adelante, lateral] = getWASDAxes(activas);
    if (!adelante && !lateral) return;
    const frente = new THREE.Vector3().subVectors(control.target, control.object.position);
    frente.z = 0;
    if (frente.lengthSq() < 1e-8) frente.set(0, 1, 0);
    frente.normalize();
    const derecha = new THREE.Vector3(frente.y, -frente.x, 0);
    const desplazamiento = frente.multiplyScalar(adelante).addScaledVector(derecha, lateral);
    if (desplazamiento.lengthSq() > 1) desplazamiento.normalize();
    desplazamiento.multiplyScalar(2.2 * Math.min(delta, 0.05));
    control.target.add(desplazamiento);
    control.object.position.add(desplazamiento);
    control.update();
  });
  const move = (event: ThreeEvent<PointerEvent>) => {
    if (!state.placementType || !plano.current) return;
    const punto = event.point;
    const posicion: Vector3 = [punto.x, punto.y, 0];
    plano.current.position.set(punto.x, punto.y, -0.006);
    onPreview(posicion);
  };
  const place = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (state.placementType) onPlace([event.point.x, event.point.y, 0]);
    else onSelect(null);
  };

  return <>
    <color attach="background" args={["#111922"]} />
    <ambientLight intensity={1.5} /><directionalLight position={[4, -5, 8]} intensity={2.4} castShadow />
    <gridHelper args={[20, 40, "#688394", "#354956"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.002]} />
    <mesh ref={plano} rotation={[0, 0, 0]} position={[0, 0, -0.006]} onPointerMove={move} onClick={place} onContextMenu={(event) => event.nativeEvent.preventDefault()}>
      <planeGeometry args={[200, 200]} /><meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
      {state.objects.map((object) => <Objeto key={object.id} object={object} selected={state.selectedId === object.id} blocked={object.type === "bench" && getBenchDependents(object, state.objects).length > 0} mode={state.transformMode} placementType={state.placementType} seat={object.type === "person" ? asientoParaPersona(object, state.objects) : null}
      handlers={{ onSelect, onTransform, onTransformStart, onRelease, held, onPickUp, onContext, onPlace, onPreview, onObjectReady }} />)}
    {state.placementType && preview && <mesh position={[
      preview?.[0] ?? plano.current?.position.x ?? 0,
      preview?.[1] ?? plano.current?.position.y ?? 0,
      (preview?.[2] ?? 0) + (state.placementType === "person" && (preview?.[2] ?? 0) > 0.3 ? 0.475 : ({ bench: 0.425, person: 0.875, weight: 0.1 } as const)[state.placementType]),
    ]}>
      <boxGeometry args={({ bench: [1.5, 0.625, 0.85], person: [0.45, 0.35, 1.75], weight: [0.2, 0.2, 0.2] } as const)[state.placementType]} />
      <meshBasicMaterial color="#82d7c4" transparent opacity={0.3} depthWrite={false} />
    </mesh>}
    <OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={0.08} enablePan enableZoom minDistance={0.1} maxDistance={20} />
  </>;
}

export default function SceneCanvas(props: Props) {
  return <Canvas camera={{ position: [2.5, 3.8, 4.8], fov: 44, up: [0, 0, 1] }}>
    <Suspense fallback={null}><Escena {...props} /></Suspense>
  </Canvas>;
}

useGLTF.preload("/models/banca.glb");
