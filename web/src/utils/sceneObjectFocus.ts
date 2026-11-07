import type { Object3D } from "three";

export function findSceneObjectRoot(scene: Object3D, objectId: string): Object3D | null {
  let found: Object3D | null = null;
  scene.traverse((object) => {
    if (!found && object.userData.sceneObjectId === objectId) found = object;
  });
  return found;
}
