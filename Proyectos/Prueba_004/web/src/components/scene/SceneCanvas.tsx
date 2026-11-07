import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Grid, OrbitControls, TransformControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { SceneObject, SceneState, Vector3 } from "../../types/scene.ts";

type Props = {
  state: SceneState;
  cameraView: "iso" | "front" | "side" | "top";
  onSelect: (id: string | null) => void;
  onPlace: (position: Vector3) => void;
  onPreview: (position: Vector3 | null) => void;
  onTransform: (id: string, position: Vector3, rotation: Vector3) => void;
  onContext: (id: string, x: number, y: number) => void;
};

function ModeloBanca({ object }: { object: SceneObject }) {
  const gltf = useGLTF("/models/banca.glb");
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return <primitive object={model} />;
}

function Objeto({ object, selected, mode, handlers }: { object: SceneObject; selected: boolean; mode: "translate" | "rotate"; handlers: Pick<Props, "onSelect" | "onTransform" | "onContext"> }) {
  const group = useRef<THREE.Group>(null);
  const position = object.transform.position;
  const rotation = object.transform.rotation;
  const isBench = object.type === "bench";
  const color = object.type === "person" ? "#d8a476" : "#e0a53a";
  const medidasBase = { bench: [1500, 624.79, 850], person: [450, 350, 1750], weight: [200, 200, 200] } as const;
  const escalaVisual = object.transform.scale.map((factor, index) => factor * object.dimensionsMm[index] / medidasBase[object.type][index]) as Vector3;
  const contenido = isBench ? <ModeloBanca object={object} /> : object.type === "weight" ?
    <mesh position={[0, 0, 0.1]} castShadow receiveShadow><boxGeometry args={[0.2, 0.2, 0.2]} /><meshStandardMaterial color={color} /></mesh> :
    <group>
      <mesh position={[0, 0, 1.58]} castShadow><sphereGeometry args={[0.17, 20, 16]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0, 1.05]} rotation={[Math.PI / 2, 0, 0]} castShadow><capsuleGeometry args={[0.16, 0.65, 6, 12]} /><meshStandardMaterial color="#5b92b5" /></mesh>
      <mesh position={[-0.12, 0, 0.55]} rotation={[Math.PI / 2, -0.12, -0.08]}><capsuleGeometry args={[0.065, 0.8, 5, 10]} /><meshStandardMaterial color="#314d66" /></mesh>
      <mesh position={[0.12, 0, 0.55]} rotation={[Math.PI / 2, 0.12, 0.08]}><capsuleGeometry args={[0.065, 0.8, 5, 10]} /><meshStandardMaterial color="#314d66" /></mesh>
    </group>;

  const contenidoEscuchado = <group ref={group} position={position} rotation={rotation} scale={escalaVisual}
    onClick={(event) => { event.stopPropagation(); handlers.onSelect(object.id); }}
    onContextMenu={(event) => { event.stopPropagation(); event.nativeEvent.preventDefault(); handlers.onContext(object.id, event.nativeEvent.clientX, event.nativeEvent.clientY); }}>
    {contenido}
  </group>;

  if (!object.visible) return null;
  if (!selected) return contenidoEscuchado;
  return <TransformControls mode={mode} onObjectChange={() => {
    const actual = group.current;
    if (actual) handlers.onTransform(object.id, actual.position.toArray() as Vector3, actual.rotation.toArray().slice(0, 3) as Vector3);
  }}>{contenidoEscuchado}</TransformControls>;
}

function Escena({ state, cameraView, onSelect, onPlace, onPreview, onTransform, onContext }: Props) {
  const plano = useRef<THREE.Mesh>(null);
  const orbit = useRef<OrbitControlsImpl | null>(null);
  useEffect(() => {
    const posiciones = { iso: [4, -6, 4.2], front: [0, -6, 2.4], side: [6, 0, 2.4], top: [0, 0, 8] };
    const control = orbit.current;
    if (!control) return;
    const posicion = posiciones[cameraView] as [number, number, number];
    control.object.position.set(...posicion);
    control.target.set(0, 0, 0.7);
    control.update();
  }, [cameraView]);
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
    <Grid args={[20, 20]} position={[0, 0, 0.001]} cellSize={0.25} sectionSize={1} fadeDistance={18} infiniteGrid />
    <mesh ref={plano} rotation={[0, 0, 0]} position={[0, 0, -0.006]} onPointerMove={move} onClick={place} onContextMenu={(event) => event.nativeEvent.preventDefault()}>
      <planeGeometry args={[200, 200]} /><meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
      {state.objects.map((object) => <Objeto key={object.id} object={object} selected={state.selectedId === object.id} mode={state.transformMode}
      handlers={{ onSelect, onTransform, onContext }} />)}
    {state.placementType && <mesh position={[
      plano.current?.position.x ?? 0,
      plano.current?.position.y ?? 0,
      ({ bench: 0.425, person: 0.875, weight: 0.1 } as const)[state.placementType],
    ]}>
      <boxGeometry args={({ bench: [1.5, 0.625, 0.85], person: [0.45, 0.35, 1.75], weight: [0.2, 0.2, 0.2] } as const)[state.placementType]} />
      <meshBasicMaterial color="#82d7c4" transparent opacity={0.3} depthWrite={false} />
    </mesh>}
    <OrbitControls ref={orbit} makeDefault target={[0, 0, 0.7]} />
  </>;
}

export default function SceneCanvas(props: Props) {
  return <Canvas camera={{ position: [4, -6, 4.2], fov: 44, up: [0, 0, 1] }}>
    <Suspense fallback={null}><Escena {...props} /></Suspense>
  </Canvas>;
}

useGLTF.preload("/models/banca.glb");
