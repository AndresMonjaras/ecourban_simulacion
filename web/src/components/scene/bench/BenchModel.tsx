import { useLayoutEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createBenchModel } from "./createBenchModel.ts";
import { BENCH_MODEL_URL } from "./benchModelAsset.generated.ts";

export default function BenchModel() {
  const { scene } = useGLTF(BENCH_MODEL_URL);
  const renderer = useThree((state) => state.gl);
  const container = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    // Allocate GPU resources in the same effect that owns their cleanup.
    // StrictMode's setup/cleanup/setup must never reuse a disposed PMREM map.
    const resources = createBenchModel(scene, renderer);
    root.add(resources.model);
    return () => {
      root.remove(resources.model);
      resources.dispose();
    };
  }, [scene, renderer]);

  // Resources are owned by the effect, not by R3F's automatic disposal.
  return <group ref={container} dispose={null} />;
}

useGLTF.preload(BENCH_MODEL_URL);
