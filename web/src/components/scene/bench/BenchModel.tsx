import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { BENCH_MODEL_URL } from "./benchModelAsset.generated.ts";

/** Nominal bench width in metres; aligned with banca-claude.glb rounded base dimensions [1520, 598, 819] mm. */
const BENCH_WIDTH_M = 1.52;
/** banca-claude model is Y-up with the front on +Z; the scene is Z-up with the front on +Y. */
const TO_SCENE = new THREE.Euler(Math.PI / 2, 0, Math.PI, "ZXY");

export default function BenchModel() {
  const { scene } = useGLTF(BENCH_MODEL_URL);
  const { model, scale, offset } = useMemo(() => {
    const model = scene.clone(true);
    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const scale = BENCH_WIDTH_M / (box.max.x - box.min.x);
    // Centre on x/z (official axes), rest the base on the floor.
    return { model, scale, offset: new THREE.Vector3(-center.x, -box.min.y, -center.z) };
  }, [scene]);

  // Geometry and materials belong to useGLTF's cache; never dispose them here.
  return (
    <group rotation={TO_SCENE} scale={scale} dispose={null}>
      <primitive object={model} position={offset} />
    </group>
  );
}

useGLTF.preload(BENCH_MODEL_URL);
