import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Owns cloned geometries, PET finishes and the screw-only reflection map. */
export function createBenchModel(scene: THREE.Group, renderer: THREE.WebGLRenderer) {
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = pmrem.fromScene(room, 0.07, 0.1, 100, { size: 128 });
  room.dispose();
  pmrem.dispose();
  // PET surface microstructure, not timber grain or metallic casting.
  const makeSurface = (initialSeed: number) => {
    const data = new Uint8Array(128 * 128);
    let seed = initialSeed;
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        data[y * 128 + x] = 120 + seed % 20;
      }
    }
    const texture = new THREE.DataTexture(data, 128, 128, THREE.RedFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  };
  const greenSurface = makeSurface(683);
  const darkSurface = makeSurface(1931);
  const greenPET = new THREE.MeshPhysicalMaterial({
    color: "#438c69", metalness: 0, roughness: 0.3,
    ior: 1.57, specularIntensity: 0.45,
    bumpMap: greenSurface, bumpScale: 0.00001,
    clearcoat: 0.08, clearcoatRoughness: 0.4,
  });
  const darkPET = new THREE.MeshPhysicalMaterial({
    color: "#41494c", metalness: 0, roughness: 0.37,
    ior: 1.57, specularIntensity: 0.4,
    bumpMap: darkSurface, bumpScale: 0.000018,
    clearcoat: 0.05, clearcoatRoughness: 0.45,
  });
  const steel = new THREE.MeshStandardMaterial({color: "#929ca5", metalness: 0.9, roughness: 0.32, envMap: studio.texture, envMapIntensity: 0.85});
  const socketSteel = new THREE.MeshStandardMaterial({ color: "#737e87", metalness: 0.7, roughness: 0.45, envMap: studio.texture, envMapIntensity: 0.65 });
  const model = scene.clone(true);
  const geometries: THREE.BufferGeometry[] = [];
  let plank = 0;
  model.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const mesh = object as THREE.Mesh;
    const isPlank = /^(asiento|respaldo)_/.test(mesh.name);
    mesh.material = isPlank ? greenPET : mesh.name.startsWith("tornillo_") ? (mesh.name.endsWith("_cavidad") ? socketSteel : steel) : darkPET;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const geometry = mesh.geometry.clone();
    geometries.push(geometry);
    mesh.geometry = geometry;
    const positions = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    const uv = new Float32Array(positions.count * 2);
    // Backrest planks are tilted 15 degrees from vertical. Project into
    // their real cross-section instead of stretching their world AABB.
    const angle = THREE.MathUtils.degToRad(15);
    const widthAxis = mesh.name.startsWith("respaldo_")
      ? new THREE.Vector3(0, -Math.sin(angle), Math.cos(angle))
      : new THREE.Vector3(0, 1, 0);
    const depthAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), widthAxis);
    const offset = plank++ * 0.173;
    const point = new THREE.Vector3();
    const normal = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i);
      normal.fromBufferAttribute(normals, i);
      const width = point.dot(widthAxis);
      const depth = point.dot(depthAxis);
      const endFace = Math.abs(normal.x) > 0.9;
      const cross = Math.abs(normal.dot(widthAxis)) > Math.abs(normal.dot(depthAxis)) ? depth : width;
      // Consistent PET surface density along the length and cross-section.
      uv[i * 2] = (endFace ? width : point.x) / 0.05 + offset;
      uv[i * 2 + 1] = (endFace ? depth : cross) / 0.05 + offset;
    }
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  });
  return { model, dispose: () => {
    geometries.forEach((geometry) => geometry.dispose());
    greenPET.dispose(); darkPET.dispose(); steel.dispose(); socketSteel.dispose(); greenSurface.dispose(); darkSurface.dispose(); studio.dispose();
  } };
}
