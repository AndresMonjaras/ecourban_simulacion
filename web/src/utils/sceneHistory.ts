import type { SceneObject } from "../types/scene.ts";

function copiarEscena(objects: SceneObject[]): SceneObject[] {
  return objects.map((object) => ({
    ...object,
    transform: {
      position: [...object.transform.position],
      rotation: [...object.transform.rotation],
      scale: [...object.transform.scale],
    },
    dimensionsMm: [...object.dimensionsMm],
    properties: {
      ...object.properties,
      posture: object.properties.posture ? { ...object.properties.posture } : undefined,
    },
    metadata: {
      ...object.metadata,
      componentIds: [...object.metadata.componentIds],
      surfaceIds: [...object.metadata.surfaceIds],
      contacts: [...object.metadata.contacts],
      loads: [...object.metadata.loads],
    },
  }));
}

export function createSceneHistory(limit = 50) {
  const snapshots: SceneObject[][] = [];
  return {
    save(objects: SceneObject[]) {
      snapshots.push(copiarEscena(objects));
      if (snapshots.length > limit) snapshots.shift();
    },
    undo(): SceneObject[] | null {
      const snapshot = snapshots.pop();
      return snapshot ? copiarEscena(snapshot) : null;
    },
  };
}
